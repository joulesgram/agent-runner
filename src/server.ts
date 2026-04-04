import express, { type Request, type Response } from "express";
import type { AgentConfig } from "./config.js";
import { scoreImage } from "./scoring.js";
import { signResponse } from "./verification.js";

interface Stats {
  requests_total: number;
  requests_success: number;
  requests_failed: number;
  total_joules: number;
  total_tokens: number;
  started_at: string;
}

interface ValidationIssue {
  field: string;
  code: string;
  message: string;
}

interface ValidationResult {
  value?: { image_url: string };
  issues?: ValidationIssue[];
}

const MAX_IMAGE_URL_LENGTH = 2_048;

function validateRateRequest(body: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!body || typeof body !== "object") {
    return {
      issues: [
        {
          field: "body",
          code: "invalid_type",
          message: "Request body must be a JSON object",
        },
      ],
    };
  }

  const imageUrlValue = (body as { image_url?: unknown }).image_url;

  if (typeof imageUrlValue !== "string") {
    issues.push({
      field: "image_url",
      code: "invalid_type",
      message: "image_url must be a string",
    });
    return { issues };
  }

  const imageUrl = imageUrlValue.trim();
  if (imageUrl.length === 0) {
    issues.push({
      field: "image_url",
      code: "empty_value",
      message: "image_url cannot be empty",
    });
  }

  if (imageUrl.length > MAX_IMAGE_URL_LENGTH) {
    issues.push({
      field: "image_url",
      code: "too_long",
      message: `image_url must be <= ${MAX_IMAGE_URL_LENGTH} characters`,
    });
  }

  let parsedUrl: URL | undefined;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    issues.push({
      field: "image_url",
      code: "invalid_url",
      message: "image_url must be a valid URL",
    });
  }

  if (parsedUrl && !["http:", "https:"].includes(parsedUrl.protocol)) {
    issues.push({
      field: "image_url",
      code: "invalid_protocol",
      message: "image_url must use http: or https:",
    });
  }

  if (issues.length > 0) {
    return { issues };
  }

  return { value: { image_url: imageUrl } };
}

export function createServer(config: AgentConfig) {
  const app = express();
  app.use(express.json());

  const signingKey = process.env.JOULEGRAM_SIGNING_KEY;

  const stats: Stats = {
    requests_total: 0,
    requests_success: 0,
    requests_failed: 0,
    total_joules: 0,
    total_tokens: 0,
    started_at: new Date().toISOString(),
  };

  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      agent: config.agent.name,
      provider: config.provider.name,
      model: config.provider.model,
      uptime_seconds: Math.floor(
        (Date.now() - new Date(stats.started_at).getTime()) / 1000
      ),
    });
  });

  app.get("/stats", (_req: Request, res: Response) => {
    res.json(stats);
  });

  app.post("/rate", async (req: Request, res: Response) => {
    stats.requests_total++;

    const validation = validateRateRequest(req.body);
    if (!validation.value) {
      stats.requests_failed++;
      res.status(400).json({
        error: "Invalid request body",
        details: validation.issues ?? [],
      });
      return;
    }

    try {
      const { image_url } = validation.value;
      const result = await scoreImage(image_url, config);

      stats.requests_success++;
      stats.total_joules += result.metering.joules_consumed;
      stats.total_tokens += result.metering.total_tokens;

      const signed = signResponse(result, config.verification, signingKey);
      res.json(signed);
    } catch (err) {
      stats.requests_failed++;
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  return app;
}

export function startServer(config: AgentConfig): void {
  const app = createServer(config);
  const { port, host } = config.server;

  app.listen(port, host, () => {
    console.log(`Joulegram Agent Runner v${config.agent.version}`);
    console.log(`Agent: ${config.agent.name}`);
    console.log(`Provider: ${config.provider.name} (${config.provider.model})`);
    console.log(`Persona: ${config.persona.name}`);
    console.log(`Listening on http://${host}:${port}`);
    console.log(`\nEndpoints:`);
    console.log(`  POST /rate    — Rate an image`);
    console.log(`  GET  /health  — Health check`);
    console.log(`  GET  /stats   — Usage statistics`);
  });
}
