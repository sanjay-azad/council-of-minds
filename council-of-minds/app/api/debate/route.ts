import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import { PersonaId, DebateMessage, Stance, PersonaStance } from '@/lib/types';
import { PERSONAS, DEBATING_PERSONAS } from '@/lib/personas';
import { buildPersonaPrompt, buildJudgePrompt, getNextSpeakers, parseStanceFromMessage, DebateContext } from '@/lib/debate-orchestrator';
import { nanoid } from 'nanoid';

export const maxDuration = 60;

interface DebateRequest {
  topic: string;
  messages: DebateMessage[];
  round: number;
  maxResponses?: number;
  triggerJudge?: boolean;
  stances?: Partial<Record<PersonaId, PersonaStance>>;
  spokenThisRound?: PersonaId[];
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY is not set in environment variables' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: DebateRequest = await req.json();
    const { topic, messages, round, triggerJudge = false, stances, spokenThisRound = [] } = body;

    // Calculate how many speakers remain this round
    const remainingThisRound = DEBATING_PERSONAS.filter(id => !spokenThisRound.includes(id));
    const speakersNeeded = Math.min(3, remainingThisRound.length);

    console.log('📥 Debate request:', { 
      topic, 
      messageCount: messages.length, 
      round,
      triggerJudge,
      spokenThisRound: spokenThisRound.join(', ') || 'none',
      remainingCount: remainingThisRound.length,
      currentStances: stances ? Object.entries(stances).map(([id, s]) => `${id}: ${(s as PersonaStance).stance}`).join(', ') : 'none'
    });

    const context: DebateContext = { 
      topic, 
      messages, 
      round, 
      stances: stances || {},
      spokenThisRound 
    };
    const openai = new OpenAI({ apiKey });

    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;
        const newlySpoken: PersonaId[] = [];
        
        const sendEvent = (data: object) => {
          if (isClosed) return;
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch (e) {
            console.error('Failed to send event:', e);
            isClosed = true;
          }
        };
        
        const closeStream = () => {
          if (!isClosed) {
            isClosed = true;
            try {
              controller.close();
            } catch (e) {
              console.error('Error closing stream:', e);
            }
          }
        };

        try {
          if (triggerJudge) {
            // JUDGE MODE
            console.log('⚖️ The Judge is preparing the verdict...');
            
            const { system, user } = buildJudgePrompt(context);
            const messageId = nanoid();

            sendEvent({
              type: 'persona_start',
              personaId: 'judge',
              messageId,
              isVerdict: true,
            });

            try {
              let fullContent = '';
              
              const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                  { role: 'system', content: system },
                  { role: 'user', content: user },
                ],
                temperature: 0.6,
                max_tokens: 600,
                stream: true,
              });

              for await (const chunk of completion) {
                if (isClosed) break;
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                  fullContent += content;
                  sendEvent({
                    type: 'content',
                    personaId: 'judge',
                    messageId,
                    content: content,
                  });
                }
              }

              console.log('⚖️ The Judge has delivered the verdict');

              sendEvent({
                type: 'persona_complete',
                personaId: 'judge',
                messageId,
                fullContent,
                isVerdict: true,
              });

              sendEvent({
                type: 'verdict_complete',
                round,
                totalMessages: context.messages.length + 1,
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error('❌ Judge error:', error);
              
              sendEvent({
                type: 'persona_error',
                personaId: 'judge',
                messageId,
                error: errorMessage,
              });
            }
          } else {
            // DEBATE MODE - Get speakers who haven't spoken this round
            const speakers = getNextSpeakers(context, speakersNeeded);

            console.log(`🎭 Round ${round}: Selected ${speakers.length} speakers:`, speakers);
            console.log(`📊 ${spokenThisRound.length}/6 have spoken this round`);

            for (const personaId of speakers) {
              if (isClosed) break;
              
              const persona = PERSONAS[personaId];
              const { system, user } = buildPersonaPrompt(personaId, context);
              const messageId = nanoid();

              const previousStance = context.stances?.[personaId]?.stance || 'undecided';
              console.log(`🎤 ${persona.name} (currently ${previousStance.toUpperCase()}) speaking...`);

              sendEvent({
                type: 'persona_start',
                personaId,
                messageId,
              });

              try {
                let fullContent = '';
                
                const completion = await openai.chat.completions.create({
                  model: 'gpt-4o-mini',
                  messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: user },
                  ],
                  temperature: persona.temperature,
                  max_tokens: 250,
                  stream: true,
                });

                for await (const chunk of completion) {
                  if (isClosed) break;
                  const content = chunk.choices[0]?.delta?.content || '';
                  if (content) {
                    fullContent += content;
                    sendEvent({
                      type: 'content',
                      personaId,
                      messageId,
                      content: content,
                    });
                  }
                }

                // Parse the stance from the message
                const { stance, stanceChanged } = parseStanceFromMessage(fullContent);
                const didChangeStance = stanceChanged || (previousStance !== 'undecided' && previousStance !== stance);
                
                console.log(`✅ ${persona.name}: ${stance.toUpperCase()}${didChangeStance ? ' (CHANGED!)' : ''}`);

                // Track that this persona spoke
                newlySpoken.push(personaId);

                sendEvent({
                  type: 'persona_complete',
                  personaId,
                  messageId,
                  fullContent,
                  stance,
                  stanceChanged: didChangeStance,
                  previousStance,
                });

                // Update context for next persona
                context.messages.push({
                  id: messageId,
                  personaId,
                  content: fullContent,
                  timestamp: Date.now(),
                  votes: { agree: 0, interesting: 0, disagree: 0 },
                  stance,
                  stanceChanged: didChangeStance,
                });

                // Update stance in context
                if (!context.stances) context.stances = {};
                context.stances[personaId] = {
                  personaId,
                  stance,
                  changedFrom: didChangeStance ? previousStance : undefined,
                };

                // Update spoken list
                if (!context.spokenThisRound) context.spokenThisRound = [];
                context.spokenThisRound.push(personaId);

                await new Promise((resolve) => setTimeout(resolve, 300));
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`❌ Error for ${personaId}:`, error);
                
                sendEvent({
                  type: 'persona_error',
                  personaId,
                  messageId,
                  error: errorMessage,
                });
              }
            }

            // Check if all 6 have now spoken
            const allSpokenNow = [...spokenThisRound, ...newlySpoken];
            const roundComplete = DEBATING_PERSONAS.every(id => allSpokenNow.includes(id));

            sendEvent({
              type: 'round_complete',
              round,
              totalMessages: context.messages.length,
              stances: context.stances,
              spokenThisRound: allSpokenNow,
              roundFullyComplete: roundComplete,
              remainingSpeakers: DEBATING_PERSONAS.filter(id => !allSpokenNow.includes(id)),
            });

            if (roundComplete) {
              console.log(`🏁 Round ${round} COMPLETE - All 6 personas have spoken!`);
            } else {
              console.log(`⏳ Round ${round} continuing - ${6 - allSpokenNow.length} speakers remaining`);
            }
          }

          closeStream();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('Stream error:', error);
          
          sendEvent({
            type: 'error',
            error: errorMessage,
          });
          
          closeStream();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Debate API error:', error);
    
    return new Response(
      JSON.stringify({ error: `Failed to process debate request: ${errorMessage}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
