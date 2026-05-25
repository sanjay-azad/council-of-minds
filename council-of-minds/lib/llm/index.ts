import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { LLMProvider, StreamChatOptions } from './types';

export type { LLMProvider, StreamChatOptions };

export function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER?.toLowerCase();
  if (provider === 'gemini') return 'gemini';
  return 'openai';
}

export function getProviderConfig(): { provider: LLMProvider; model: string } {
  const provider = getLLMProvider();

  if (provider === 'gemini') {
    return {
      provider,
      model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    };
  }

  return {
    provider,
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  };
}

function resolveModel(provider: LLMProvider, modelId: string) {
  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    const google = createGoogleGenerativeAI({ apiKey });
    return google(modelId);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  const openai = createOpenAI({ apiKey });
  return openai(modelId);
}

export async function* streamChat(
  options: StreamChatOptions
): AsyncGenerator<string, void, undefined> {
  const { provider, model: modelId } = getProviderConfig();
  const model = resolveModel(provider, modelId);

  const result = streamText({
    model,
    system: options.system,
    prompt: options.user,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    abortSignal: options.signal,
  });

  for await (const chunk of result.textStream) {
    if (options.signal?.aborted) break;
    yield chunk;
  }
}

export function validateProviderKeys(): void {
  getProviderConfig();
  resolveModel(getLLMProvider(), getProviderConfig().model);
}
