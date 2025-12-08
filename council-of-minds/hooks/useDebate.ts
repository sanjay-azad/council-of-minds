'use client';

import { useCallback, useRef } from 'react';
import { useDebateStore } from '@/lib/store';
import { PersonaId, DebateMessage, Stance } from '@/lib/types';

interface StreamEvent {
  type: 'persona_start' | 'content' | 'persona_complete' | 'persona_error' | 'round_complete' | 'verdict_complete' | 'error';
  personaId?: PersonaId;
  messageId?: string;
  content?: string;
  fullContent?: string;
  error?: string;
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

export function useDebate() {
  const store = useDebateStore();
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingContentRef = useRef<string>('');

  const handleStreamEvent = useCallback((event: StreamEvent) => {
    const { addMessage, setActivePersona, updateStreamingContent, setStatus, endDebate, updateStance } = useDebateStore.getState();
    
    switch (event.type) {
      case 'persona_start':
        console.log('🎭 Persona starting:', event.personaId, event.isVerdict ? '(VERDICT)' : '');
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
        console.log('✅ Persona complete:', event.personaId, event.stance ? `[${event.stance.toUpperCase()}]` : '', event.stanceChanged ? '🔄 CHANGED' : '');
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
          
          // Update stance if provided
          if (event.stance && event.personaId !== 'judge') {
            updateStance(event.personaId, event.stance);
          }
        }
        setActivePersona(null);
        streamingContentRef.current = '';
        break;

      case 'persona_error':
        console.error(`❌ Persona ${event.personaId} error:`, event.error);
        setActivePersona(null);
        streamingContentRef.current = '';
        break;

      case 'round_complete':
        if (event.roundFullyComplete) {
          console.log(`🏁 Round ${event.round} COMPLETE - All 6 spoke! Moving to round ${(event.round || 1) + 1}`);
        } else {
          console.log(`⏳ ${event.remainingSpeakers?.length || 0} speakers remaining in round ${event.round}`);
        }
        // Stances are already updated via addMessage
        break;
        
      case 'verdict_complete':
        console.log('⚖️ Verdict delivered! Debate concluded.');
        endDebate();
        break;
        
      case 'error':
        console.error('❌ API Error:', event.error);
        break;
    }
  }, []);

  const runDebateRound = useCallback(async (topicOverride?: string) => {
    const { currentDebate } = useDebateStore.getState();
    
    const topic = topicOverride || currentDebate?.topic;
    
    if (!topic) {
      console.error('No topic available for debate');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    const freshState = useDebateStore.getState();
    const spokenThisRound = freshState.currentDebate?.spokenThisRound || [];
    
    console.log('🚀 Starting debate round:', freshState.currentDebate?.round || 1);
    console.log('📊 Already spoken this round:', spokenThisRound.join(', ') || 'none');

    try {
      const response = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic,
          messages: freshState.currentDebate?.messages || [],
          round: freshState.currentDebate?.round || 1,
          triggerJudge: false,
          stances: freshState.currentDebate?.stances || {},
          spokenThisRound: spokenThisRound,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to start debate round: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: StreamEvent = JSON.parse(line.slice(6));
              handleStreamEvent(event);
            } catch (e) {
              console.error('Failed to parse event:', line, e);
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('Debate round aborted');
      } else {
        console.error('Debate round error:', error);
      }
    }
  }, [handleStreamEvent]);

  const triggerJudge = useCallback(async () => {
    const { currentDebate, setStatus } = useDebateStore.getState();
    
    if (!currentDebate || currentDebate.messages.length === 0) {
      console.error('No debate to judge');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setStatus('judging');

    console.log('⚖️ Triggering The Judge for final verdict...');

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
        throw new Error(`Failed to get verdict: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: StreamEvent = JSON.parse(line.slice(6));
              handleStreamEvent(event);
            } catch (e) {
              console.error('Failed to parse event:', line, e);
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('Judge verdict aborted');
      } else {
        console.error('Judge verdict error:', error);
      }
    }
  }, [handleStreamEvent]);

  const initiateDebate = useCallback(async (topic: string) => {
    console.log('🎬 Initiating debate with topic:', topic);
    
    store.startDebate(topic);
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    runDebateRound(topic);
  }, [store, runDebateRound]);

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
