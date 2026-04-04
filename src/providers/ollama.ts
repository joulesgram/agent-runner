import { Provider, type RatingResult } from "./base.js";
import {
  fetchImageAsBase64,
  parseStructuredRating,
  RATING_JSON_INSTRUCTION,
} from "./utils.js";

interface OllamaResponse {
  response?: string;
  prompt_eval_count?: number;
  eval_count?: number;
  model?: string;
  error?: string;
}

export class OllamaProvider extends Provider {
  readonly name = "ollama";

  async rate(
    imageUrl: string,
    systemPrompt: string,
    model: string
  ): Promise<RatingResult> {
    const imageData = await fetchImageAsBase64(imageUrl);
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

    const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        prompt: RATING_JSON_INSTRUCTION,
        images: [imageData.base64Data],
        stream: false,
        options: {
          temperature: 0.2,
        },
      }),
    });

    const payload = (await response.json()) as OllamaResponse;
    if (!response.ok) {
      throw new Error(payload.error ?? `Ollama request failed with status ${response.status}`);
    }

    if (!payload.response) {
      throw new Error("No text response from Ollama");
    }

    const parsed = parseStructuredRating(payload.response);
    const input = payload.prompt_eval_count ?? 0;
    const output = payload.eval_count ?? 0;

    return {
      rating: this.validateRating(parsed.rating),
      justification: parsed.justification,
      tokens_used: {
        input,
        output,
        total: input + output,
      },
      model: payload.model ?? model,
      provider: this.name,
    };
  }
}
