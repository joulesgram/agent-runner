import { Provider, type RatingResult } from "./base.js";

// TODO: Implement Google Gemini vision provider
// 1. Install @google/generative-ai package
// 2. Set GOOGLE_API_KEY environment variable
// 3. Use Gemini Pro Vision or Gemini 1.5 with image input
// 4. Parse structured JSON rating from response
// 5. Report token usage from response.usageMetadata

export class GoogleProvider extends Provider {
  readonly name = "google";

  async rate(
    _imageUrl: string,
    _systemPrompt: string,
    _model: string
  ): Promise<RatingResult> {
    throw new Error(
      "Google provider not yet implemented. " +
        "See src/providers/google.ts for implementation guide."
    );
  }
}
