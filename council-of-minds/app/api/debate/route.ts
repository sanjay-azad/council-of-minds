import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import { PersonaId, DebateMessage } from '@/lib/types';
import { PERSONAS } from '@/lib/personas';
import { buildPersonaPrompt, buildJudgePrompt, getNextSpeakers, DebateContext } from '@/lib/debate-orchestrator';
import { nanoid } from 'nanoid';

export const maxDuration = 60;

interface DebateRequest {
  topic: string;
  messages: DebateMessage[];
  round: number;
  maxResponses?: number;
  triggerJudge?: boolean;
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
    const { topic, messages, round, maxResponses = 3, triggerJudge = false } = body;

    console.log('📥 Debate request:', { 
      topic, 
      messageCount: messages.length, 
      round,
      triggerJudge 
    });

    const context: DebateContext = { topic, messages, round };
    const openai = new OpenAI({ apiKey });

    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;
        
        const sendEvent = (data: object) => {
          if (isClosed) {
            console.log('⚠️ Attempted to send event after stream closed');
            return;
          }
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
            // JUDGE MODE: Deliver final verdict
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
                max_tokens: 500,
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
            // DEBATE MODE: Regular debate round
            const speakers = getNextSpeakers(context);
            const speakersToUse = speakers.slice(0, maxResponses);

            console.log('🎭 Selected speakers:', speakersToUse);
            console.log(`📜 Context includes ${messages.length} previous messages`);

            for (const personaId of speakersToUse) {
              if (isClosed) break;
              
              const persona = PERSONAS[personaId];
              const { system, user } = buildPersonaPrompt(personaId, context);
              const messageId = nanoid();

              console.log(`🎤 ${persona.name} is about to speak (sees ${context.messages.length} messages)...`);

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
                  max_tokens: 200,
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

                console.log(`✅ ${persona.name} finished (${fullContent.length} chars)`);

                sendEvent({
                  type: 'persona_complete',
                  personaId,
                  messageId,
                  fullContent,
                });

                // Add to context so next persona sees this message
                context.messages.push({
                  id: messageId,
                  personaId,
                  content: fullContent,
                  timestamp: Date.now(),
                  votes: { agree: 0, interesting: 0, disagree: 0 },
                });

                // Small delay between personas
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

            sendEvent({
              type: 'round_complete',
              round,
              totalMessages: context.messages.length,
            });
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
