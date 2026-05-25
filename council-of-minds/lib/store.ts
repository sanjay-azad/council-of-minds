import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { DebateState, DebateMessage, PersonaId, Vote, Debate, Stance } from './types';
import { useKarmaStore } from './karma-store';
import { DEBATING_PERSONAS } from './personas';
import { MAX_ROUNDS } from './constants';

export const useDebateStore = create<DebateState>((set, get) => ({
  currentDebate: null,
  isDebating: false,
  activePersona: null,
  streamingContent: '',
  userVotes: {},
  error: null,

  startDebate: (topic: string) => {
    useKarmaStore.getState().submitTopic();

    const initialStances: Record<PersonaId, { personaId: PersonaId; stance: Stance }> = {} as Record<
      PersonaId,
      { personaId: PersonaId; stance: Stance }
    >;
    DEBATING_PERSONAS.forEach((id) => {
      initialStances[id] = { personaId: id, stance: 'undecided' };
    });

    set({
      currentDebate: {
        id: nanoid(),
        topic,
        messages: [],
        status: 'active',
        round: 1,
        createdAt: Date.now(),
        stances: initialStances,
        spokenThisRound: [],
      },
      isDebating: true,
      userVotes: {},
      error: null,
    });
  },

  addMessage: (message: DebateMessage) => {
    const { currentDebate } = get();
    if (!currentDebate) return;

    if (message.isVerdict) {
      useKarmaStore.getState().receiveVerdict();
    }

    let newSpokenThisRound = [...currentDebate.spokenThisRound];
    if (message.personaId !== 'judge' && !newSpokenThisRound.includes(message.personaId)) {
      newSpokenThisRound.push(message.personaId);
    }

    const allSpoken = DEBATING_PERSONAS.every((id) => newSpokenThisRound.includes(id));
    const roundLimitReached = currentDebate.round >= MAX_ROUNDS && allSpoken;

    if (allSpoken) {
      set({
        currentDebate: {
          ...currentDebate,
          messages: [...currentDebate.messages, message],
          spokenThisRound: [],
          round: roundLimitReached ? currentDebate.round : currentDebate.round + 1,
          status: 'paused',
        },
        streamingContent: '',
        activePersona: null,
        isDebating: false,
      });
    } else {
      set({
        currentDebate: {
          ...currentDebate,
          messages: [...currentDebate.messages, message],
          spokenThisRound: newSpokenThisRound,
        },
        streamingContent: '',
        activePersona: null,
      });
    }
  },

  updateStreamingContent: (content: string) => {
    set({ streamingContent: content });
  },

  setActivePersona: (personaId: PersonaId | null) => {
    set({ activePersona: personaId });
  },

  updateStance: (personaId: PersonaId, stance: Stance, reason?: string) => {
    const { currentDebate } = get();
    if (!currentDebate) return;

    const previousStance = currentDebate.stances[personaId];
    const stanceChanged =
      previousStance && previousStance.stance !== stance && previousStance.stance !== 'undecided';

    set({
      currentDebate: {
        ...currentDebate,
        stances: {
          ...currentDebate.stances,
          [personaId]: {
            personaId,
            stance,
            reason,
            changedFrom: stanceChanged ? previousStance.stance : undefined,
          },
        },
      },
    });
  },

  vote: (messageId: string, voteType: Vote['type']) => {
    const { currentDebate, userVotes } = get();
    if (!currentDebate) return;

    const previousVote = userVotes[messageId];
    const newUserVotes = { ...userVotes };

    if (!previousVote) {
      useKarmaStore.getState().castVote();
    }

    if (previousVote === voteType) {
      delete newUserVotes[messageId];
    } else {
      newUserVotes[messageId] = voteType;
    }

    const updatedMessages = currentDebate.messages.map((msg) => {
      if (msg.id !== messageId) return msg;

      const newVotes = { ...msg.votes };

      if (previousVote) {
        newVotes[previousVote] = Math.max(0, newVotes[previousVote] - 1);
      }

      if (previousVote !== voteType) {
        newVotes[voteType] = newVotes[voteType] + 1;
      }

      return { ...msg, votes: newVotes };
    });

    set({
      currentDebate: { ...currentDebate, messages: updatedMessages },
      userVotes: newUserVotes,
    });
  },

  incrementRound: () => {
    const { currentDebate } = get();
    if (!currentDebate) return;

    set({
      currentDebate: {
        ...currentDebate,
        round: currentDebate.round + 1,
        spokenThisRound: [],
      },
    });
  },

  setStatus: (status: Debate['status']) => {
    const { currentDebate } = get();
    if (!currentDebate) return;

    set({
      currentDebate: { ...currentDebate, status },
      isDebating: status === 'active' || status === 'judging',
    });
  },

  pauseDebate: () => {
    const { currentDebate } = get();
    if (!currentDebate) return;

    set({
      currentDebate: { ...currentDebate, status: 'paused' },
      isDebating: false,
    });
  },

  resumeDebate: () => {
    const { currentDebate } = get();
    if (!currentDebate) return;

    set({
      currentDebate: { ...currentDebate, status: 'active' },
      isDebating: true,
      error: null,
    });
  },

  endDebate: () => {
    const { currentDebate } = get();
    if (!currentDebate) return;

    useKarmaStore.getState().completeDebate();

    set({
      currentDebate: { ...currentDebate, status: 'completed' },
      isDebating: false,
      activePersona: null,
      streamingContent: '',
    });
  },

  setError: (error: string | null) => {
    set({ error, isDebating: false, activePersona: null, streamingContent: '' });
  },

  reset: () => {
    set({
      currentDebate: null,
      isDebating: false,
      activePersona: null,
      streamingContent: '',
      userVotes: {},
      error: null,
    });
  },
}));
