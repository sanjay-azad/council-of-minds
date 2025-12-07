import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface KarmaAction {
  type: 'topic_submitted' | 'vote_cast' | 'debate_completed' | 'verdict_received';
  points: number;
  timestamp: number;
  description: string;
}

interface KarmaState {
  karma: number;
  totalDebates: number;
  totalVotes: number;
  history: KarmaAction[];
  
  // Actions
  addKarma: (points: number, type: KarmaAction['type'], description: string) => void;
  submitTopic: () => void;
  castVote: () => void;
  completeDebate: () => void;
  receiveVerdict: () => void;
}

// Karma rewards
const KARMA_REWARDS = {
  topic_submitted: 10,
  vote_cast: 1,
  debate_completed: 25,
  verdict_received: 15,
};

export const useKarmaStore = create<KarmaState>()(
  persist(
    (set, get) => ({
      karma: 0,
      totalDebates: 0,
      totalVotes: 0,
      history: [],

      addKarma: (points, type, description) => {
        const action: KarmaAction = {
          type,
          points,
          timestamp: Date.now(),
          description,
        };
        
        set((state) => ({
          karma: state.karma + points,
          history: [...state.history.slice(-49), action], // Keep last 50 actions
        }));
      },

      submitTopic: () => {
        const { addKarma, totalDebates } = get();
        addKarma(KARMA_REWARDS.topic_submitted, 'topic_submitted', 'Submitted a debate topic');
        set((state) => ({ totalDebates: state.totalDebates + 1 }));
      },

      castVote: () => {
        const { addKarma, totalVotes } = get();
        addKarma(KARMA_REWARDS.vote_cast, 'vote_cast', 'Voted on an argument');
        set((state) => ({ totalVotes: state.totalVotes + 1 }));
      },

      completeDebate: () => {
        const { addKarma } = get();
        addKarma(KARMA_REWARDS.debate_completed, 'debate_completed', 'Completed a full debate');
      },

      receiveVerdict: () => {
        const { addKarma } = get();
        addKarma(KARMA_REWARDS.verdict_received, 'verdict_received', 'Received a verdict from The Judge');
      },
    }),
    {
      name: 'council-karma-storage',
    }
  )
);

// Helper to get karma level/title
export function getKarmaLevel(karma: number): { level: number; title: string; nextLevel: number } {
  if (karma < 50) return { level: 1, title: 'Novice Thinker', nextLevel: 50 };
  if (karma < 150) return { level: 2, title: 'Curious Mind', nextLevel: 150 };
  if (karma < 300) return { level: 3, title: 'Debate Enthusiast', nextLevel: 300 };
  if (karma < 500) return { level: 4, title: 'Council Regular', nextLevel: 500 };
  if (karma < 1000) return { level: 5, title: 'Wisdom Seeker', nextLevel: 1000 };
  if (karma < 2000) return { level: 6, title: 'Master Debater', nextLevel: 2000 };
  if (karma < 5000) return { level: 7, title: 'Council Elder', nextLevel: 5000 };
  return { level: 8, title: 'Philosopher King', nextLevel: Infinity };
}

