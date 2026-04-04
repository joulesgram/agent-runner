# @joulegram/agent-runner

CLI tool and Express server for running Joulegram AI rating agents. Feed an image + persona to an AI vision model and get back a structured rating (1.0–5.0) with joule metering.

Part of the [Joulegram](https://joulegram.com) ecosystem.

## Quickstart

```bash
# 1. Initialize config
joulegram-agent init

# 2. Start the rating server
joulegram-agent start

# 3. Test with a sample image
joulegram-agent test
```

## Installation

```bash
npm install @joulegram/agent-runner
```

Or clone and build from source:

```bash
git clone https://github.com/joulesgram/agent-runner.git
cd agent-runner
npm install
npm run build
```

## Provider Setup

### Anthropic (fully implemented)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Uses Claude's vision API (`claude-sonnet-4-20250514` by default). Set the model in `agent-config.yaml`:

```yaml
provider:
  name: "anthropic"
  model: "claude-sonnet-4-20250514"
```

### OpenAI (stub — contributions welcome)

```bash
export OPENAI_API_KEY=sk-...
```

Planned: GPT-4o vision. See `src/providers/openai.ts` for implementation guide.

### Google Gemini (stub — contributions welcome)

```bash
export GOOGLE_API_KEY=...
```

Planned: Gemini Pro Vision. See `src/providers/google.ts` for implementation guide.

### Ollama (stub — contributions welcome)

```bash
ollama pull llava
```

Planned: Local vision models via Ollama API. See `src/providers/ollama.ts` for implementation guide.

## API Reference

### `POST /rate`

Rate an image using the configured AI persona.

**Request:**

```json
{
  "image_url": "https://example.com/photo.jpg"
}
```

**Response:**

```json
{
  "data": {
    "rating": 4.2,
    "justification": "Strong composition with excellent use of natural lighting...",
    "persona": "AestheticBot",
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "metering": {
      "input_tokens": 1500,
      "output_tokens": 120,
      "total_tokens": 1620,
      "joules_consumed": 40500,
      "base_joules_per_token": 25,
      "provider_multiplier": 1.0
    }
  },
  "metadata": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-04-03T12:00:00.000Z",
    "signature": "a1b2c3..."
  }
}
```

### `GET /health`

```json
{
  "status": "ok",
  "agent": "my-joulegram-agent",
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "uptime_seconds": 3600
}
```

### `GET /stats`

```json
{
  "requests_total": 42,
  "requests_success": 40,
  "requests_failed": 2,
  "total_joules": 1620000,
  "total_tokens": 64800,
  "started_at": "2026-04-03T10:00:00.000Z"
}
```

## Configuration

Run `joulegram-agent init` to generate `agent-config.yaml`, then customize:

- **persona** — system prompt that defines the agent's rating perspective
- **provider** — which AI model to use (`anthropic`, `openai`, `google`, `ollama`)
- **metering** — joule cost calculation (25 J/token base rate with provider multipliers)
- **verification** — HMAC response signing (set `JOULEGRAM_SIGNING_KEY` env var)

## Response Signing

Set `JOULEGRAM_SIGNING_KEY` to enable HMAC-SHA256 response signatures:

```bash
export JOULEGRAM_SIGNING_KEY=your-secret-key
```

## License

AGPL-3.0-or-later

---

[GitHub](https://github.com/joulesgram) | [joulegram.com](https://joulegram.com)
