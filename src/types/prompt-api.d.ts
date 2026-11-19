// Minimal typings for Chrome's built-in Prompt API (Gemini Nano).
// https://developer.chrome.com/docs/ai/prompt-api

type NanoAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

interface NanoSession {
  prompt(input: string, options?: { responseConstraint?: object; signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}

interface NanoCreateOptions {
  initialPrompts?: { role: 'system' | 'user' | 'assistant'; content: string }[];
  expectedInputs?: { type: 'text'; languages?: string[] }[];
  expectedOutputs?: { type: 'text'; languages?: string[] }[];
  monitor?: (m: EventTarget) => void;
}

interface NanoLanguageModelStatic {
  availability(options?: Omit<NanoCreateOptions, 'initialPrompts' | 'monitor'>): Promise<NanoAvailability>;
  create(options?: NanoCreateOptions): Promise<NanoSession>;
}

declare var LanguageModel: NanoLanguageModelStatic | undefined;
