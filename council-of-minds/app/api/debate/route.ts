import { NextRequest } from 'next/server';
import { PersonaId, DebateMessage, PersonaStance } from '@/lib/types';
import { PERSONAS, DEBATING_PERSONAS } from '@/lib/personas';
import {
  buildPersonaPrompt,
  buildJudgePrompt,
  getNextSpeakers,
  parseStanceFromMessage,
  shouldContinueDebate,
  DebateContext,
} from '@/lib/debate-orchestrator';
import { streamChat, validateProviderKeys, getProviderConfig } from '@/lib/llm';
import { SPEAKERS_PER_BATCH, MAX_ROUNDS, MAX_DEBATE_MESSAGES, DEBATER_MAX_TOKENS, JUDGE_MAX_TOKENS } from '@/lib/constants';
import { nanoid } from 'nanoid';

export const maxDuration = 120;

interface DebateRequest {
  topic: string;
  messages: DebateMessage[];
  round: number;
  triggerJudge?: boolean;
  stances?: Partial<Record<PersonaId, PersonaStance>>;
  spokenThisRound?: PersonaId[];
}

async function streamPersonaResponse(
  system: string,
  user: string,
  temperature: number,
  maxTokens: number,
  signal: AbortSignal | undefined,
  sendEvent: (data: object) => void,
  personaId: PersonaId,
  messageId: string
): Promise<string> {
  let fullContent = '';

  for await (const chunk of streamChat({ system, user, temperature, maxTokens, signal })) {
    if (signal?.aborted) break;
    fullContent += chunk;
    sendEvent({ type: 'content', personaId, messageId, content: chunk });
  }

  return fullContent;
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  try {
    validateProviderKeys();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: DebateRequest = await req.json();
    const { topic, messages, round, triggerJudge = false, stances, spokenThisRound = [] } = body;

    if (!topic?.trim()) {
      return new Response(JSON.stringify({ error: 'Topic is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const context: DebateContext = {
      topic,
      messages,
      round,
      stances: stances || {},
      spokenThisRound,
    };

    const remainingThisRound = DEBATING_PERSONAS.filter((id) => !spokenThisRound.includes(id));
    const speakersNeeded = Math.min(SPEAKERS_PER_BATCH, remainingThisRound.length);
    const { provider, model } = getProviderConfig();

    console.log('Debate request:', {
      provider,
      model,
      topic,
      messageCount: messages.length,
      round,
      triggerJudge,
      spokenThisRound: spokenThisRound.join(', ') || 'none',
    });

    const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      const newlySpoken: PersonaId[] = [];
      const signal = req.signal;

      const sendEvent = (data: object) => {
        if (isClosed || signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          isClosed = true;
        }
      };

      const closeStream = () => {
        if (!isClosed) {
          isClosed = true;
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      };

      try {
        if (triggerJudge) {
          const { system, user } = buildJudgePrompt(context);
          const messageId = nanoid();

          sendEvent({
            type: 'persona_start',
            personaId: 'judge',
            messageId,
            isVerdict: true,
          });

          try {
            const fullContent = await streamPersonaResponse(
              system,
              user,
              0.6,
              JUDGE_MAX_TOKENS,
              signal,
              sendEvent,
              'judge',
              messageId
            );

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
            if (!signal.aborted) {
              sendEvent({
                type: 'persona_error',
                personaId: 'judge',
                messageId,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        } else {
          if (!shouldContinueDebate(context)) {
            sendEvent({
              type: 'debate_limit_reached',
              message: `Debate limit reached (${MAX_DEBATE_MESSAGES} messages). Please request a verdict.`,
            });
            closeStream();
            return;
          }

          if (round > MAX_ROUNDS) {
            sendEvent({
              type: 'debate_limit_reached',
              message: `Maximum of ${MAX_ROUNDS} rounds reached. Please request a verdict.`,
            });
            closeStream();
            return;
          }

          const speakers = getNextSpeakers(context, speakersNeeded);

          for (const personaId of speakers) {
            if (isClosed || signal.aborted) break;

            const persona = PERSONAS[personaId];
            const { system, user } = buildPersonaPrompt(personaId, context);
            const messageId = nanoid();
            const previousStance = context.stances?.[personaId]?.stance || 'undecided';

            sendEvent({ type: 'persona_start', personaId, messageId });

            try {
              const fullContent = await streamPersonaResponse(
                system,
                user,
                persona.temperature,
                DEBATER_MAX_TOKENS,
                signal,
                sendEvent,
                personaId,
                messageId
              );

              if (signal.aborted) break;

              const { stance, stanceChanged } = parseStanceFromMessage(fullContent);
              const didChangeStance =
                stanceChanged || (previousStance !== 'undecided' && previousStance !== stance);

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

              context.messages.push({
                id: messageId,
                personaId,
                content: fullContent,
                timestamp: Date.now(),
                votes: { agree: 0, interesting: 0, disagree: 0 },
                stance,
                stanceChanged: didChangeStance,
              });

              if (!context.stances) context.stances = {};
              context.stances[personaId] = {
                personaId,
                stance,
                changedFrom: didChangeStance ? previousStance : undefined,
              };

              if (!context.spokenThisRound) context.spokenThisRound = [];
              context.spokenThisRound.push(personaId);
            } catch (error) {
              if (!signal.aborted) {
                sendEvent({
                  type: 'persona_error',
                  personaId,
                  messageId,
                  error: error instanceof Error ? error.message : String(error),
                });
              }
            }
          }

          const allSpokenNow = [...spokenThisRound, ...newlySpoken];
          const roundComplete = DEBATING_PERSONAS.every((id) => allSpokenNow.includes(id));
          const batchHasMoreInRound = allSpokenNow.length < DEBATING_PERSONAS.length;

          sendEvent({
            type: 'round_complete',
            round,
            totalMessages: context.messages.length,
            stances: context.stances,
            spokenThisRound: allSpokenNow,
            roundFullyComplete: roundComplete,
            remainingSpeakers: DEBATING_PERSONAS.filter((id) => !allSpokenNow.includes(id)),
          });

          if (batchHasMoreInRound && !signal.aborted) {
            sendEvent({
              type: 'batch_complete',
              spokenThisRound: allSpokenNow,
              remainingSpeakers: DEBATING_PERSONAS.filter((id) => !allSpokenNow.includes(id)),
            });
          }
        }

        closeStream();
      } catch (error) {
        if (!signal.aborted) {
          sendEvent({
            type: 'error',
            error: error instanceof Error ? error.message : String(error),
          });
        }
        closeStream();
      }
    },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: `Failed to process debate request: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
