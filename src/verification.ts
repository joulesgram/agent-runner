import { createHmac, randomUUID } from "node:crypto";
import type { VerificationConfig } from "./config.js";

export interface SignedResponse<T> {
  data: T;
  metadata: {
    request_id: string;
    timestamp: string;
    signature: string | null;
  };
}

export function signResponse<T>(
  data: T,
  config: VerificationConfig,
  signingKey?: string
): SignedResponse<T> {
  const requestId = randomUUID();
  const timestamp = new Date().toISOString();

  let signature: string | null = null;

  if (config.sign_responses && signingKey) {
    const payload = JSON.stringify({ data, request_id: requestId, timestamp });
    signature = createHmac(config.algorithm, signingKey)
      .update(payload)
      .digest("hex");
  }

  return {
    data,
    metadata: {
      request_id: requestId,
      timestamp,
      signature,
    },
  };
}
