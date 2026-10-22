import type { CrmPort } from './port.js';
import type { Lead, Operation } from '../domain/types.js';
import type { Store } from '../persistence/db.js';
export class MockClient implements CrmPort {
  readonly mode = 'mock' as const;
  leads = new Map<string, Lead>();
  tasks = new Map<string, Operation>();
  constructor(readonly store?: Store) {}
  async syncLead(lead: Lead) {
    this.leads.set(lead.externalId, structuredClone(lead));
    this.store?.db.prepare('INSERT INTO mock_items VALUES(?,?) ON CONFLICT(key) DO UPDATE SET body=excluded.body').run(`lead-${lead.id}`, JSON.stringify(lead));
    return `mock-${lead.id}`;
  }
  async execute(lead: Lead, operation: Operation) {
    if (lead.reviewStatus !== 'Approved') throw new Error('Human approval required');
    this.tasks.set(operation.decisionId, structuredClone(operation));
    this.store?.db.prepare('INSERT OR IGNORE INTO mock_items VALUES(?,?)').run(`task-${operation.decisionId}`, JSON.stringify(operation));
    return `mock-${operation.id}`;
  }
  async reviewStatuses() { return [...this.leads.values()].map(l => ({ itemId: `mock-${l.id}`, status: l.reviewStatus })); }
}
