'use client';

import { useCallback, useRef } from 'react';
import { useDebateStore } from '@/lib/store';
import { PersonaId, DebateMessage, Stance } from '@/lib/types';
import { MAX_ROUNDS } from '@/lib/constants';

interface StreamEvent {
  type:
    | 'persona_start'
    | 'content'
    | 'persona_complete'
    | 'persona_error'
    | 'round_complete'
    | 'batch_complete'
    | 'verdict_complete'
    | 'debate_limit_reached'
    | 'error';
  personaId?: PersonaId;
  messageId?: string;
  content?: string;
  fullContent?: string;
  error?: string;
  message?: string;
  round?: number;
  totalMessages?: number;
  isVerdict?: boolean;
  stance?: Stance;
  stanceChanged?: boolean;
  previousStance?: Stance;
  stances?: Record<PersonaId, { personaId: PersonaId; stance: Stance; changedFrom?: Stance }>;
  spokenThisRound?: PersonaId[];
  roundFullyComplete?: boolean;
  remainingSpeakers?: PersonaId[];
}

async function consumeSSEStream(
  response: Response,
  handleEvent: (event: StreamEvent) => void,
  signal: AbortSignal
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No reader available');

  const decoder = new TextDecoder();
  let buffer = '';

  const processBuffer = (final = false) => {
    const parts = buffer.split('\n\n');
    if (final) {
      buffer = '';
      for (const line of parts) {
        if (line.startsWith('data: ')) {
          try {
            handleEvent(JSON.parse(line.slice(6)));
          } catch (e) {
            console.error('Failed to parse event:', line, e);
          }
        }
      }
      return;
    }

    buffer = parts.pop() || '';
    for (const line of parts) {
      if (line.startsWith('data: ')) {
        try {
          handleEvent(JSON.parse(line.slice(6)));
        } catch (e) {
          console.error('Failed to parse event:', line, e);
        }
      }
    }
  };

  while (true) {
    if (signal.aborted) break;

    const { done, value } = await reader.read();
    if (done) {
      processBuffer(true);
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    processBuffer();
  }
}

export function useDebate() {
  const store = useDebateStore();
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingContentRef = useRef<string>('');

  const handleStreamEvent = useCallback((event: StreamEvent) => {
    const {
      addMessage,
      setActivePersona,
      updateStreamingContent,
      setStatus,
      endDebate,
      updateStance,
      pauseDebate,
      setError,
    } = useDebateStore.getState();

    switch (event.type) {
      case 'persona_start':
        streamingContentRef.current = '';
        setActivePersona(event.personaId!);
        updateStreamingContent('');
        if (event.isVerdict) {
          setStatus('judging');
        }
        break;

      case 'content':
        streamingContentRef.current += event.content || '';
        updateStreamingContent(streamingContentRef.current);
        break;

      case 'persona_complete':
        if (event.personaId && event.messageId && event.fullContent) {
          const message: DebateMessage = {
            id: event.messageId,
            personaId: event.personaId,
            content: event.fullContent,
            timestamp: Date.now(),
            votes: { agree: 0, interesting: 0, disagree: 0 },
            isVerdict: event.isVerdict,
            stance: event.stance,
            stanceChanged: event.stanceChanged,
          };
          addMessage(message);

          if (event.stance && event.personaId !== 'judge') {
            updateStance(event.personaId, event.stance);
          }
        }
        setActivePersona(null);
        streamingContentRef.current = '';
        break;

      case 'persona_error':
        setActivePersona(null);
        streamingContentRef.current = '';
        setError(`Failed to get response from ${event.personaId}: ${event.error}`);
        pauseDebate();
        break;

      case 'batch_complete':
        pauseDebate();
        break;

      case 'round_complete':
        if (event.roundFullyComplete) {
          pauseDebate();
        }
        break;

      case 'debate_limit_reached':
        pauseDebate();
        setError(event.message || 'Debate limit reached. Please request a verdict.');
        break;

      case 'verdict_complete':
        endDebate();
        break;

      case 'error':
        setError(event.error || 'An unexpected error occurred');
        pauseDebate();
        break;
    }
  }, []);

  const runDebateRound = useCallback(
    async (topicOverride?: string) => {
      const { currentDebate, setError, resumeDebate } = useDebateStore.getState();

      const topic = topicOverride || currentDebate?.topic;
      if (!topic) return;

      if (currentDebate && currentDebate.round > MAX_ROUNDS) {
        setError(`Maximum of ${MAX_ROUNDS} rounds reached. Please request a verdict.`);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      resumeDebate();

      const freshState = useDebateStore.getState();

      try {
        const response = await fetch('/api/debate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            messages: freshState.currentDebate?.messages || [],
            round: freshState.currentDebate?.round || 1,
            triggerJudge: false,
            stances: freshState.currentDebate?.stances || {},
            spokenThisRound: freshState.currentDebate?.spokenThisRound || [],
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(errorData.error || `Failed to start debate round: ${response.status}`);
        }

        await consumeSSEStream(response, handleStreamEvent, abortControllerRef.current.signal);

        // Ensure UI flips to Continue after each batch finishes
        if (!abortControllerRef.current.signal.aborted) {
          const { currentDebate, pauseDebate } = useDebateStore.getState();
          if (currentDebate?.status === 'active') {
            pauseDebate();
          }
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }
        useDebateStore.getState().setError((error as Error).message);
        useDebateStore.getState().pauseDebate();
      }
    },
    [handleStreamEvent]
  );

  const triggerJudge = useCallback(async () => {
    const { currentDebate, setStatus, setError } = useDebateStore.getState();

    if (!currentDebate || currentDebate.messages.length === 0) {
      setError('No debate to judge');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setStatus('judging');

    try {
      const response = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: currentDebate.topic,
          messages: currentDebate.messages,
          round: currentDebate.round,
          triggerJudge: true,
          stances: currentDebate.stances,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Failed to get verdict: ${response.status}`);
      }

      await consumeSSEStream(response, handleStreamEvent, abortControllerRef.current.signal);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return;
      }
      setError((error as Error).message);
      useDebateStore.getState().pauseDebate();
    }
  }, [handleStreamEvent]);

  const initiateDebate = useCallback(
    async (topic: string) => {
      store.startDebate(topic);
      await new Promise((resolve) => setTimeout(resolve, 150));
      runDebateRound(topic);
    },
    [store, runDebateRound]
  );

  const continueDebate = useCallback(() => {
    const { currentDebate } = useDebateStore.getState();
    if (currentDebate && currentDebate.status !== 'completed') {
      runDebateRound();
    }
  }, [runDebateRound]);

  const stopDebate = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    store.pauseDebate();
  }, [store]);

  return {
    initiateDebate,
    continueDebate,
    stopDebate,
    triggerJudge,
    runDebateRound,
    isDebating: store.isDebating,
    currentDebate: store.currentDebate,
  };
}
