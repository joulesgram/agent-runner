import type { MeteringConfig } from "./config.js";

export interface MeteringResult {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  joules_consumed: number;
  base_joules_per_token: number;
  provider_multiplier: number;
}

export function calculateJoules(
  inputTokens: number,
  outputTokens: number,
  provider: string,
  config: MeteringConfig
): MeteringResult {
  const totalTokens = inputTokens + outputTokens;
  const multiplier = config.provider_multipliers[provider] ?? 1.0;
  const joules = totalTokens * config.base_joules_per_token * multiplier;

  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    joules_consumed: Math.round(joules),
    base_joules_per_token: config.base_joules_per_token,
    provider_multiplier: multiplier,
  };
}
