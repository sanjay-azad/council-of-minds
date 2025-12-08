import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { DebateState, DebateMessage, PersonaId, Vote, Debate, Stance } from './types';
import { useKarmaStore } from './karma-store';
import { DEBATING_PERSONAS } from './personas';

export const useDebateStore = create<DebateState>((set, get) => ({
  currentDebate: null,
  isDebating: false,
  activePersona: null,
  streamingContent: '',
  userVotes: {},

  startDebate: (topic: string) => {
    // Award karma for submitting a topic
    useKarmaStore.getState().submitTopic();
    
    // Initialize stances for all debating personas as undecided
    const initialStances: Record<PersonaId, { personaId: PersonaId; stance: Stance }> = {} as any;
    DEBATING_PERSONAS.forEach(id => {
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
    });
  },

  addMessage: (message: DebateMessage) => {
    const { currentDebate } = get();
    if (!currentDebate) return;

    // If it's a verdict, award karma
    if (message.isVerdict) {
      useKarmaStore.getState().receiveVerdict();
    }

    // Track who has spoken this round
    let newSpokenThisRound = [...currentDebate.spokenThisRound];
    if (message.personaId !== 'judge' && !newSpokenThisRound.includes(message.personaId)) {
      newSpokenThisRound.push(message.personaId);
    }

    // Check if all 6 have spoken - if so, increment round and reset
    const allSpoken = DEBATING_PERSONAS.every(id => newSpokenThisRound.includes(id));
    
    set({
      currentDebate: {
        ...currentDebate,
        messages: [...currentDebate.messages, message],
        spokenThisRound: allSpoken ? [] : newSpokenThisRound,
        round: allSpoken ? currentDebate.round + 1 : currentDebate.round,
      },
      streamingContent: '',
      activePersona: null,
    });
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
    const stanceChanged = previousStance && previousStance.stance !== stance && previousStance.stance !== 'undecided';
    
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

    // Only award karma if this is a NEW vote (not changing existing)
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
        spokenThisRound: [], // Reset for new round
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
    });
  },

  endDebate: () => {
    const { currentDebate } = get();
    if (!currentDebate) return;

    // Award karma for completing a debate
    useKarmaStore.getState().completeDebate();

    set({
      currentDebate: { ...currentDebate, status: 'completed' },
      isDebating: false,
      activePersona: null,
      streamingContent: '',
    });
  },

  reset: () => {
    set({
      currentDebate: null,
      isDebating: false,
      activePersona: null,
      streamingContent: '',
      userVotes: {},
    });
  },
}));
