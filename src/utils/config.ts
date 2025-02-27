// src/utils/config.ts
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { parse } from 'ini';

// Load configuration from various sources
// 1. Environment variables
// 2. .slimspecrc in home directory
// 3. .slimspecrc in current directory

interface Config {
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  DEFAULT_MODEL?: string;
  COMPRESSION_PROMPT?: string;
  DECOMPRESSION_PROMPT?: string;
  OUTPUT_DIR?: string;
}

function loadConfig(): Config {
  const config: Config = {};

  // Try loading from .slimspecrc in home directory
  try {
    const homeConfigPath = join(homedir(), '.slimspecrc');
    if (existsSync(homeConfigPath)) {
      const homeConfig = parse(readFileSync(homeConfigPath, 'utf-8'));
      Object.assign(config, homeConfig);
    }
  } catch (error) {
    // Ignore errors
  }

  // Try loading from .slimspecrc in current directory
  try {
    const localConfigPath = join(process.cwd(), '.slimspecrc');
    if (existsSync(localConfigPath)) {
      const localConfig = parse(readFileSync(localConfigPath, 'utf-8'));
      Object.assign(config, localConfig);
    }
  } catch (error) {
    // Ignore errors
  }

  // Load from environment variables (overrides config files)
  const envVars = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'GOOGLE_API_KEY',
    'DEEPSEEK_API_KEY',
    'DEFAULT_MODEL',
    'COMPRESSION_PROMPT',
    'DECOMPRESSION_PROMPT',
    'OUTPUT_DIR'
  ];

  for (const envVar of envVars) {
    if (process.env[envVar]) {
      config[envVar as keyof Config] = process.env[envVar];
    }
  }

  return config;
}

export const config = loadConfig();
