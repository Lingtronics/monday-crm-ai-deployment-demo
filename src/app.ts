import { readFileSync } from 'node:fs';
import { loadConfig, type Settings } from './config.js';
import { Store } from './persistence/db.js';
import { MockClient } from './crm/mock-client.js';
import { MondayClient, MondayTransport } from './crm/monday-client.js';
import { FixtureProvider, CompatibleProvider } from './ai/provider.js';
import { IntakeWorkflow } from './workflows/intake.js';
import { ApprovalWorkflow } from './workflows/approval.js';
export function createApplication(config: Settings = loadConfig()) {
  const store = new Store(config.DATABASE_PATH);
  try {
    const crm = config.MODE === 'mock' ? new MockClient(store) : new MondayClient(new MondayTransport(config), JSON.parse(readFileSync(config.MONDAY_COLUMN_MAP_PATH, 'utf8')), store);
    const provider = config.LLM_PROVIDER === 'fixture' ? new FixtureProvider() : new CompatibleProvider(config);
    const intake = new IntakeWorkflow(store, crm, provider, config.AI_CONFIDENCE_THRESHOLD);
    return { config, store, crm, provider, intake, approval: new ApprovalWorkflow(intake) };
  } catch (e) { store.close(); throw e; }
}
