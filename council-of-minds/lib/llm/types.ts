export type LLMProvider = 'openai' | 'gemini';

export interface StreamChatOptions {
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
  signal?: AbortSignal;
}
