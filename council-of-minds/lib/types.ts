export type PersonaId = 
  | 'sage'
  | 'maverick'
  | 'pragmatist'
  | 'judge'
  | 'historian'
  | 'empath'
  | 'analyst';

export interface Persona {
  id: PersonaId;
  name: string;
  title: string;
  avatar: string;
  color: string;
  colorClass: string;
  description: string;
  systemPrompt: string;
  speakingStyle: string[];
  temperature: number;
}

export interface DebateMessage {
  id: string;
  personaId: PersonaId;
  content: string;
  timestamp: number;
  votes: {
    agree: number;
    interesting: number;
    disagree: number;
  };
  isStreaming?: boolean;
  referencedMessages?: string[];
  isVerdict?: boolean;
}

export interface Debate {
  id: string;
  topic: string;
  messages: DebateMessage[];
  status: 'idle' | 'active' | 'paused' | 'completed' | 'judging';
  round: number;
  createdAt: number;
  verdict?: string;
}

export interface Vote {
  messageId: string;
  type: 'agree' | 'interesting' | 'disagree';
  userId?: string;
}

export interface UserInteraction {
  type: 'follow_up' | 'challenge' | 'whisper';
  targetPersonaId?: PersonaId;
  content: string;
}

export interface DebateState {
  currentDebate: Debate | null;
  isDebating: boolean;
  activePersona: PersonaId | null;
  streamingContent: string;
  userVotes: Record<string, Vote['type']>;
  
  // Actions
  startDebate: (topic: string) => void;
  addMessage: (message: DebateMessage) => void;
  updateStreamingContent: (content: string) => void;
  setActivePersona: (personaId: PersonaId | null) => void;
  vote: (messageId: string, voteType: Vote['type']) => void;
  incrementRound: () => void;
  setStatus: (status: Debate['status']) => void;
  pauseDebate: () => void;
  resumeDebate: () => void;
  endDebate: () => void;
  reset: () => void;
}

export interface StreamChunk {
  personaId: PersonaId;
  content: string;
  isComplete: boolean;
  messageId: string;
}
