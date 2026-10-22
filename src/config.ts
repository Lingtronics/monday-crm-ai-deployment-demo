import { z } from 'zod';
import { existsSync } from 'node:fs';
export const Config = z.object({
  MODE: z.enum(['mock', 'monday']).default('mock'), DEMO_WRITE_ENABLED: z.enum(['true', 'false']).default('false'),
  MONDAY_API_TOKEN: z.string().default(''), MONDAY_API_VERSION: z.literal('2026-07').default('2026-07'),
  MONDAY_WORKSPACE_ID: z.string().default(''), MONDAY_ALLOWED_BOARD_IDS: z.string().default(''),
  MONDAY_LEADS_BOARD_ID: z.string().default(''), MONDAY_CONTACTS_BOARD_ID: z.string().default(''),
  MONDAY_ACCOUNTS_BOARD_ID: z.string().default(''), MONDAY_OPPORTUNITIES_BOARD_ID: z.string().default(''),
  MONDAY_COLUMN_MAP_PATH: z.string().default('./config/column-map.json'),
  DEMO_API_KEY: z.string().default(''), DATABASE_PATH: z.string().default('./.local/demo.sqlite'),
  LLM_PROVIDER: z.enum(['fixture', 'openai_compatible']).default('fixture'), LLM_NETWORK_CONSENT: z.enum(['true', 'false']).default('false'),
  LLM_BASE_URL: z.string().default(''), LLM_API_KEY: z.string().default(''), LLM_MODEL: z.string().default(''),
  AI_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),
});
export type Settings = z.infer<typeof Config>;
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Settings {
  if (env === process.env && existsSync('.env')) process.loadEnvFile('.env');
  return Config.parse(env);
}
