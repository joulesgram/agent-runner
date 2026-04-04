import { Provider, type RatingResult } from "./base.js";
import { parseStructuredRating, RATING_JSON_INSTRUCTION } from "./utils.js";

interface OpenAIResponse {
  model: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
}

export class OpenAIProvider extends Provider {
  readonly name = "openai";

  async rate(
    imageUrl: string,
    systemPrompt: string,
    model: string
  ): Promise<RatingResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required to use the OpenAI provider");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: RATING_JSON_INSTRUCTION },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    const payload = (await response.json()) as OpenAIResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `OpenAI request failed with status ${response.status}`);
    }

    const text = payload.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("No text response from OpenAI");
    }

    const parsed = parseStructuredRating(text);
    const input = payload.usage?.prompt_tokens ?? 0;
    const output = payload.usage?.completion_tokens ?? 0;
    const total = payload.usage?.total_tokens ?? input + output;

    return {
      rating: this.validateRating(parsed.rating),
      justification: parsed.justification,
      tokens_used: {
        input,
        output,
        total,
      },
      model: payload.model || model,
      provider: this.name,
    };
  }
}
