import type { Provider } from "./base.js";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAIProvider } from "./openai.js";
import { GoogleProvider } from "./google.js";
import { OllamaProvider } from "./ollama.js";

const providers: Record<string, () => Provider> = {
  anthropic: () => new AnthropicProvider(),
  openai: () => new OpenAIProvider(),
  google: () => new GoogleProvider(),
  ollama: () => new OllamaProvider(),
};

export function getProvider(name: string): Provider {
  const factory = providers[name];
  if (!factory) {
    throw new Error(
      `Unknown provider: ${name}. Available: ${Object.keys(providers).join(", ")}`
    );
  }
  return factory();
}
