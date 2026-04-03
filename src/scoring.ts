import type { AgentConfig } from "./config.js";
import type { RatingResult } from "./providers/base.js";
import type { MeteringResult } from "./metering.js";
import { calculateJoules } from "./metering.js";
import { getProvider } from "./providers/index.js";

export interface ScoringResult {
  rating: number;
  justification: string;
  persona: string;
  provider: string;
  model: string;
  metering: MeteringResult;
}

export async function scoreImage(
  imageUrl: string,
  config: AgentConfig
): Promise<ScoringResult> {
  const provider = getProvider(config.provider.name);
  const ratingResult: RatingResult = await provider.rate(
    imageUrl,
    config.persona.system_prompt,
    config.provider.model
  );

  const metering = calculateJoules(
    ratingResult.tokens_used.input,
    ratingResult.tokens_used.output,
    ratingResult.provider,
    config.metering
  );

  return {
    rating: ratingResult.rating,
    justification: ratingResult.justification,
    persona: config.persona.name,
    provider: ratingResult.provider,
    model: ratingResult.model,
    metering,
  };
}
