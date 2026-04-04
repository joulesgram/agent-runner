import Anthropic from "@anthropic-ai/sdk";
import { Provider, type RatingResult } from "./base.js";

type ParsedRating = {
  rating: number;
  justification: string;
};

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
      tool_choice: { type: "tool", name: "submit_rating" },
      tools: [
        {
          name: "submit_rating",
          description:
            "Submit the final rating for the provided image as structured data.",
          input_schema: {
            type: "object",
            properties: {
              rating: {
                type: "number",
                minimum: 1,
                maximum: 5,
              },
              justification: {
                type: "string",
              },
            },
            required: ["rating", "justification"],
            additionalProperties: false,
          },
        },
      ],
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
              text: "Rate this image and call submit_rating with your final answer.",
            },
          ],
        },
      ],
    });

    const toolUseBlock = response.content.find((block): block is Anthropic.Messages.ToolUseBlock =>
      block.type === "tool_use" && block.name === "submit_rating"
    );

    const parsed = toolUseBlock
      ? this.validateParsedShape(toolUseBlock.input)
      : this.parseFromTextFallback(response.content);

    const usage = this.extractTokenUsage(response.usage);

    return {
      rating: this.validateRating(parsed.rating),
      justification: parsed.justification,
      tokens_used: usage,
      model: response.model,
      provider: this.name,
    };
  }

  private parseFromTextFallback(content: Anthropic.Messages.ContentBlock[]): ParsedRating {
    const textBlock = content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error(
        "Anthropic response did not include submit_rating tool output or text fallback content."
      );
    }

    const preview = this.safePreview(textBlock.text);
    const rawJson = this.extractJsonObjectDeterministically(textBlock.text);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to parse Anthropic text fallback as JSON (${message}). Preview: ${preview}`
      );
    }

    return this.validateParsedShape(parsed, preview);
  }

  private extractJsonObjectDeterministically(text: string): string {
    const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
      return fencedMatch[1].trim();
    }

    const start = text.indexOf("{");
    if (start === -1) {
      throw new Error(
        `Could not find JSON object start in Anthropic response. Preview: ${this.safePreview(text)}`
      );
    }

    let depth = 0;
    for (let i = start; i < text.length; i += 1) {
      const char = text[i];
      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
      }

      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }

    throw new Error(
      `Could not find complete JSON object in Anthropic response. Preview: ${this.safePreview(text)}`
    );
  }

  private validateParsedShape(parsed: unknown, preview = ""): ParsedRating {
    if (!parsed || typeof parsed !== "object") {
      throw new Error(
        `Parsed Anthropic rating payload was not an object.${preview ? ` Preview: ${preview}` : ""}`
      );
    }

    const candidate = parsed as Record<string, unknown>;
    if (typeof candidate.rating !== "number" || Number.isNaN(candidate.rating)) {
      throw new Error(
        `Parsed Anthropic rating payload had invalid rating (expected number).${preview ? ` Preview: ${preview}` : ""}`
      );
    }

    if (typeof candidate.justification !== "string") {
      throw new Error(
        `Parsed Anthropic rating payload had invalid justification (expected string).${preview ? ` Preview: ${preview}` : ""}`
      );
    }

    return {
      rating: candidate.rating,
      justification: candidate.justification,
    };
  }

  private extractTokenUsage(usage: Anthropic.Messages.Usage | undefined): {
    input: number;
    output: number;
    total: number;
  } {
    const input = typeof usage?.input_tokens === "number" ? usage.input_tokens : 0;
    const output = typeof usage?.output_tokens === "number" ? usage.output_tokens : 0;

    return {
      input,
      output,
      total: input + output,
    };
  }

  private safePreview(text: string): string {
    return text.replace(/\s+/g, " ").slice(0, 200);
  }
}
