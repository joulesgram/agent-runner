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

    const { image_url } = req.body as { image_url?: string };
    if (!image_url) {
      stats.requests_failed++;
      res.status(400).json({ error: "Missing required field: image_url" });
      return;
    }

    try {
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
  const signingKey = process.env.JOULEGRAM_SIGNING_KEY;
  if (config.verification.sign_responses && !signingKey) {
    throw new Error(
      "Verification signing is enabled (verification.sign_responses=true), but JOULEGRAM_SIGNING_KEY is not set."
    );
  }

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
