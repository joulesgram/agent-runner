import Anthropic from "@anthropic-ai/sdk";
import { Provider, type RatingResult } from "./base.js";

export class AnthropicProvider extends Provider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor() {
    super();
    this.client = new Anthropic();
  }

  async rate(
    imageUrl: string,
    systemPrompt: string,
    model: string
  ): Promise<RatingResult> {
    const response = await this.client.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url: imageUrl },
            },
            {
              type: "text",
              text: `Rate this image. Respond ONLY with valid JSON in this exact format:
{"rating": <number 1.0-5.0 with one decimal>, "justification": "<brief explanation>"}`,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Anthropic");
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(
        `Failed to parse JSON from response: ${textBlock.text}`
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      rating: number;
      justification: string;
    };

    return {
      rating: this.validateRating(parsed.rating),
      justification: parsed.justification,
      tokens_used: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
      },
      model: response.model,
      provider: this.name,
    };
  }
}
