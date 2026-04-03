import { Provider, type RatingResult } from "./base.js";

// TODO: Implement OpenAI vision provider
// 1. Install openai package: npm install openai
// 2. Set OPENAI_API_KEY environment variable
// 3. Use GPT-4o or GPT-4-turbo with vision capabilities
// 4. Parse structured JSON rating from response
// 5. Report token usage from response.usage

export class OpenAIProvider extends Provider {
  readonly name = "openai";

  async rate(
    _imageUrl: string,
    _systemPrompt: string,
    _model: string
  ): Promise<RatingResult> {
    throw new Error(
      "OpenAI provider not yet implemented. " +
        "See src/providers/openai.ts for implementation guide."
    );
  }
}
