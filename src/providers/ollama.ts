import { Provider, type RatingResult } from "./base.js";

// TODO: Implement Ollama local vision provider
// 1. Use fetch() to call Ollama REST API at http://localhost:11434
// 2. Use llava, bakllava, or other vision-capable models
// 3. POST to /api/generate with image as base64
// 4. Parse structured JSON rating from response
// 5. Estimate token usage from response eval_count / prompt_eval_count

export class OllamaProvider extends Provider {
  readonly name = "ollama";

  async rate(
    _imageUrl: string,
    _systemPrompt: string,
    _model: string
  ): Promise<RatingResult> {
    throw new Error(
      "Ollama provider not yet implemented. " +
        "See src/providers/ollama.ts for implementation guide."
    );
  }
}
