import type { Provider } from "./base.js";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAIProvider } from "./openai.js";
import { GoogleProvider } from "./google.js";
import { OllamaProvider } from "./ollama.js";

interface ProviderRegistryEntry {
  implemented: boolean;
  factory: () => Provider;
}

const providers: Record<string, ProviderRegistryEntry> = {
  anthropic: {
    implemented: true,
    factory: () => new AnthropicProvider(),
  },
  openai: {
    implemented: true,
    factory: () => new OpenAIProvider(),
  },
  google: {
    implemented: true,
    factory: () => new GoogleProvider(),
  },
  ollama: {
    implemented: true,
    factory: () => new OllamaProvider(),
  },
};

export function getProviderRegistry(): Record<string, { implemented: boolean }> {
  return Object.fromEntries(
    Object.entries(providers).map(([name, entry]) => [name, { implemented: entry.implemented }])
  );
}

export function getAvailableProviders(): string[] {
  return Object.keys(providers);
}

export function getProvider(name: string): Provider {
  const entry = providers[name];
  if (!entry) {
    throw new Error(
      `Unknown provider: ${name}. Available: ${getAvailableProviders().join(", ")}`
    );
  }

  if (!entry.implemented) {
    throw new Error(
      `Provider '${name}' is registered but not implemented yet. ` +
        "Choose an implemented provider or switch to one that is currently supported."
    );
  }

  return entry.factory();
}
