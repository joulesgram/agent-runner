import { Provider, type RatingResult } from "./base.js";
import {
  fetchImageAsBase64,
  parseStructuredRating,
  RATING_JSON_INSTRUCTION,
} from "./utils.js";

interface GoogleGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    message?: string;
  };
}

export class GoogleProvider extends Provider {
  readonly name = "google";

  async rate(
    imageUrl: string,
    systemPrompt: string,
    model: string
  ): Promise<RatingResult> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY is required to use the Google provider");
    }

    const imageData = await fetchImageAsBase64(imageUrl);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                inline_data: {
                  mime_type: imageData.mimeType,
                  data: imageData.base64Data,
                },
              },
              {
                text: RATING_JSON_INSTRUCTION,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
        },
      }),
    });

    const payload = (await response.json()) as GoogleGenerateContentResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `Google request failed with status ${response.status}`);
    }

    const text = payload.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === "string")
      ?.text;
    if (!text) {
      throw new Error("No text response from Google provider");
    }

    const parsed = parseStructuredRating(text);
    const input = payload.usageMetadata?.promptTokenCount ?? 0;
    const output = payload.usageMetadata?.candidatesTokenCount ?? 0;
    const total = payload.usageMetadata?.totalTokenCount ?? input + output;

    return {
      rating: this.validateRating(parsed.rating),
      justification: parsed.justification,
      tokens_used: {
        input,
        output,
        total,
      },
      model,
      provider: this.name,
    };
  }
}
