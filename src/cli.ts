#!/usr/bin/env node

import { Command } from "commander";
import { initConfig, loadConfig } from "./config.js";
import { startServer } from "./server.js";
import { scoreImage } from "./scoring.js";

const program = new Command();

program
  .name("joulegram-agent")
  .description("Joulegram AI Agent Runner — rate images with AI personas")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize a new agent configuration")
  .option("-d, --dir <path>", "Directory to initialize in", process.cwd())
  .action((opts: { dir: string }) => {
    try {
      const msg = initConfig(opts.dir);
      console.log(msg);
    } catch (err) {
      console.error(
        "Init failed:",
        err instanceof Error ? err.message : err
      );
      process.exit(1);
    }
  });

program
  .command("start")
  .description("Start the agent rating server")
  .option("-d, --dir <path>", "Config directory", process.cwd())
  .action((opts: { dir: string }) => {
    try {
      const config = loadConfig(opts.dir);
      startServer(config);
    } catch (err) {
      console.error(
        "Start failed:",
        err instanceof Error ? err.message : err
      );
      process.exit(1);
    }
  });

program
  .command("test")
  .description("Test the agent with a sample image")
  .option("-d, --dir <path>", "Config directory", process.cwd())
  .option(
    "-i, --image <url>",
    "Image URL to rate",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Image_created_with_a_mobile_phone.png/1200px-Image_created_with_a_mobile_phone.png"
  )
  .action(async (opts: { dir: string; image: string }) => {
    try {
      const config = loadConfig(opts.dir);
      console.log(`Testing agent "${config.agent.name}"...`);
      console.log(`Provider: ${config.provider.name} (${config.provider.model})`);
      console.log(`Persona: ${config.persona.name}`);
      console.log(`Image: ${opts.image}`);
      console.log();

      const result = await scoreImage(opts.image, config);

      console.log(`Rating: ${result.rating.toFixed(1)} / 5.0`);
      console.log(`Justification: ${result.justification}`);
      console.log();
      console.log(`Tokens: ${result.metering.total_tokens} (${result.metering.input_tokens} in / ${result.metering.output_tokens} out)`);
      console.log(`Joules: ${result.metering.joules_consumed} J`);
    } catch (err) {
      console.error(
        "Test failed:",
        err instanceof Error ? err.message : err
      );
      process.exit(1);
    }
  });

program.parse();
