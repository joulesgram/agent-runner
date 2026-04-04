import { readFileSync, existsSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";

export interface PersonaConfig {
  name: string;
  description: string;
  system_prompt: string;
}

export interface ProviderConfig {
  name: string;
  model: string;
}

export interface ServerConfig {
  port: number;
  host: string;
}

export interface MeteringConfig {
  base_joules_per_token: number;
  provider_multipliers: Record<string, number>;
}

export interface VerificationConfig {
  sign_responses: boolean;
  algorithm: string;
}

export interface AgentConfig {
  agent: { name: string; version: string };
  provider: ProviderConfig;
  persona: PersonaConfig;
  server: ServerConfig;
  metering: MeteringConfig;
  verification: VerificationConfig;
}

const CONFIG_FILE = "agent-config.yaml";
const EXAMPLE_FILE = "agent-config.example.yaml";

export function initConfig(dir: string): string {
  const configPath = resolve(dir, CONFIG_FILE);
  const examplePath = resolve(dir, EXAMPLE_FILE);

  if (existsSync(configPath)) {
    return `Config already exists at ${configPath}`;
  }

  if (!existsSync(examplePath)) {
    throw new Error(`Example config not found at ${examplePath}`);
  }

  copyFileSync(examplePath, configPath);
  return `Created ${configPath} from example. Edit it to configure your agent.`;
}

export function loadConfig(dir: string = process.cwd()): AgentConfig {
  const configPath = resolve(dir, CONFIG_FILE);

  if (!existsSync(configPath)) {
    throw new Error(
      `Config not found at ${configPath}. Run 'joulegram-agent init' first.`
    );
  }

  const raw = readFileSync(configPath, "utf-8");
  const parsed = yaml.load(raw) as unknown;
  return validateConfig(parsed);
}

function validateConfig(config: unknown): AgentConfig {
  if (!isRecord(config)) {
    throw new Error("Config root must be an object");
  }

  const agent = getObject(config, "agent");
  const provider = getObject(config, "provider");
  const persona = getObject(config, "persona");
  const server = getObject(config, "server");
  const metering = getObject(config, "metering");
  const verification = getObject(config, "verification");

  const validatedServerPort = getFiniteNumber(server, "server.port");
  if (!Number.isInteger(validatedServerPort)) {
    throw new Error("Config field server.port must be an integer");
  }
  if (validatedServerPort < 1 || validatedServerPort > 65535) {
    throw new Error("Config field server.port must be in range 1-65535");
  }

  const baseJoules = getFiniteNumber(
    metering,
    "metering.base_joules_per_token"
  );
  if (baseJoules < 0) {
    throw new Error(
      "Config field metering.base_joules_per_token must be >= 0"
    );
  }

  return {
    agent: {
      name: getRequiredString(agent, "agent.name"),
      version: getRequiredString(agent, "agent.version"),
    },
    provider: {
      name: getRequiredString(provider, "provider.name"),
      model: getRequiredString(provider, "provider.model"),
    },
    persona: {
      name: getRequiredString(persona, "persona.name"),
      description: getOptionalString(persona, "persona.description"),
      system_prompt: getRequiredString(persona, "persona.system_prompt"),
    },
    server: {
      host: getRequiredString(server, "server.host"),
      port: validatedServerPort,
    },
    metering: {
      base_joules_per_token: baseJoules,
      provider_multipliers: getNumberMap(
        metering,
        "metering.provider_multipliers"
      ),
    },
    verification: {
      sign_responses: getRequiredBoolean(
        verification,
        "verification.sign_responses"
      ),
      algorithm: getRequiredString(verification, "verification.algorithm"),
    },
  };
}

function getObject(parent: Record<string, unknown>, fieldPath: string) {
  const key = getFieldName(fieldPath);
  const value = parent[key];
  if (!isRecord(value)) {
    throw new Error(`Config missing required object: ${fieldPath}`);
  }
  return value;
}

function getRequiredString(
  parent: Record<string, unknown>,
  fieldPath: string
): string {
  const key = getFieldName(fieldPath);
  const value = parent[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Config field ${fieldPath} must be a non-empty string`);
  }
  return value;
}

function getOptionalString(
  parent: Record<string, unknown>,
  fieldPath: string
): string {
  const key = getFieldName(fieldPath);
  const value = parent[key];
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value !== "string") {
    throw new Error(`Config field ${fieldPath} must be a string`);
  }
  return value;
}

function getRequiredBoolean(
  parent: Record<string, unknown>,
  fieldPath: string
): boolean {
  const key = getFieldName(fieldPath);
  const value = parent[key];
  if (typeof value !== "boolean") {
    throw new Error(`Config field ${fieldPath} must be a boolean`);
  }
  return value;
}

function getFiniteNumber(
  parent: Record<string, unknown>,
  fieldPath: string
): number {
  const key = getFieldName(fieldPath);
  const value = parent[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Config field ${fieldPath} must be a finite number`);
  }
  return value;
}

function getNumberMap(
  parent: Record<string, unknown>,
  fieldPath: string
): Record<string, number> {
  const key = getFieldName(fieldPath);
  const value = parent[key];
  if (!isRecord(value)) {
    throw new Error(`Config field ${fieldPath} must be an object`);
  }

  const parsed: Record<string, number> = {};
  for (const [providerName, multiplier] of Object.entries(value)) {
    if (typeof multiplier !== "number" || !Number.isFinite(multiplier)) {
      throw new Error(
        `Config field ${fieldPath}.${providerName} must be a finite number`
      );
    }
    parsed[providerName] = multiplier;
  }
  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getFieldName(path: string): string {
  const parts = path.split(".");
  return parts[parts.length - 1]!;
}
