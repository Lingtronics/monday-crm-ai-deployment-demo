import { it, expect } from 'vitest';
import { Store } from '../src/persistence/db.js';
import { MockClient } from '../src/crm/mock-client.js';
import { IntakeWorkflow } from '../src/workflows/intake.js';
export const sample = { externalId: 'test-lead', fullName: 'Demo Person', workEmail: 'demo@example.com', companyName: 'Demo Company', source: 'webform', message: 'Please share pricing for a demo this week.' };
it('ingests, replays and suppresses exact email duplicates durably', async () => {
  const store = new Store(); const mock = new MockClient(store); const workflow = new IntakeWorkflow(store, mock);
  const first = await workflow.intake(sample);
  expect(first.status).toBe('created'); expect(first.lead.stage).toBe('New');
  expect((await workflow.intake(sample)).lead.id).toBe(first.lead.id);
  expect((await workflow.intake({ ...sample, externalId: 'second', workEmail: ' DEMO@EXAMPLE.COM ' })).status).toBe('duplicate');
  expect((await workflow.intake({ ...sample, externalId: 'second' })).status).toBe('replayed');
  expect(store.leads()).toHaveLength(1); expect(store.accounts()).toHaveLength(1); expect(mock.tasks.size).toBe(0);
  expect(workflow.metrics().duplicates).toBe(1); expect(store.audits().some(a => a.eventType === 'duplicate_suppressed')).toBe(true); store.close();
});
it('rejects missing/invalid email and overlong messages', async () => {
  const store = new Store(); const w = new IntakeWorkflow(store, new MockClient());
  for (const invalid of [{ ...sample, workEmail: undefined }, { ...sample, workEmail: 'bad' }, { ...sample, message: 'x'.repeat(2001) }, { ...sample, workEmail: 'real@company.com' }]) await expect(w.intake(invalid)).rejects.toThrow();
  expect(store.leads()).toHaveLength(0); store.close();
});
it('records pending sync honestly on API failure', async () => {
  const store = new Store(); const mock = new MockClient(); mock.syncLead = async () => { throw new Error('secret-private-body'); };
  const result = await new IntakeWorkflow(store, mock).intake(sample);
  expect(result.lead.syncStatus).toBe('Pending sync'); expect(JSON.stringify(store.audits())).not.toContain('secret-private-body'); store.close();
});
