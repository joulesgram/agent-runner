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
  const config = yaml.load(raw) as AgentConfig;

  if (!config.provider?.name) {
    throw new Error("Config missing required field: provider.name");
  }
  if (!config.persona?.system_prompt) {
    throw new Error("Config missing required field: persona.system_prompt");
  }

  return config;
}
