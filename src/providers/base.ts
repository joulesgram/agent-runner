export interface RatingResult {
  rating: number;
  justification: string;
  tokens_used: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
  provider: string;
}

export abstract class Provider {
  abstract readonly name: string;

  abstract rate(
    imageUrl: string,
    systemPrompt: string,
    model: string
  ): Promise<RatingResult>;

  protected validateRating(rating: number): number {
    const clamped = Math.max(1.0, Math.min(5.0, rating));
    return Math.round(clamped * 10) / 10;
  }
}
