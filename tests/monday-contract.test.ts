import { it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Config } from '../src/config.js';
import { MondayClient, MondayTransport } from '../src/crm/monday-client.js';
import { leadColumns, statusLabels, type Mapping } from '../src/crm/board-mapping.js';
import { Store } from '../src/persistence/db.js';
import type { Lead, Operation } from '../src/domain/types.js';

function sandbox() {
  const config = Config.parse({ MODE: 'monday', DEMO_WRITE_ENABLED: 'true', MONDAY_API_TOKEN: 'redacted-token', MONDAY_WORKSPACE_ID: '1', MONDAY_ALLOWED_BOARD_IDS: '2,3,4', MONDAY_LEADS_BOARD_ID: '2', MONDAY_ACCOUNTS_BOARD_ID: '3', MONDAY_OPPORTUNITIES_BOARD_ID: '4' });
  const mapping: Mapping = { schemaVersion: 1, workspaceId: '1', plan: 'B', boards: { leads: { id: '2', name: 'CRM Demo | Leads', columns: Object.fromEntries(Object.keys(leadColumns).map(k => [k, k])) }, accounts: { id: '3', name: 'CRM Demo | Accounts', columns: { domain: 'domain', externalId: 'accountKey' } }, opportunities: { id: '4', name: 'CRM Demo | Opportunities', columns: { operationId: 'operation', status: 'status' } } } };
  const lead: Lead = { schemaVersion: 1, id: randomUUID(), externalId: 'contract-lead', fullName: 'Synthetic Person', workEmail: 'contract@example.com', companyName: 'Synthetic Company', source: 'manual', message: 'Please share pricing.', receivedAt: new Date().toISOString(), accountId: randomUUID(), mondayItemId: '20', stage: 'New', reviewStatus: 'Approved', executionStatus: 'Not started', syncStatus: 'Synced', recommendedPriority: 'Medium', reviewReason: 'Human approved' };
  const operation: Operation = { schemaVersion: 1, id: randomUUID(), leadId: lead.id, decisionId: `${lead.id}:approved:v1`, action: 'create_internal_followup', status: 'Pending', createdAt: new Date().toISOString() };
  const remoteUpdates: Array<{ id: string; body: string }> = [];
  const state = { ambiguous: false, commit: true, badColumn: false, badWorkspace: false, mutations: 0, itemMutations: 0, pages: false };
  const remoteItems = new Map<string, Array<{ id: string; name: string; column_values: Array<{ id: string; text: string }> }>>([
    ['2', [{ id: '20', name: 'Synthetic Person', column_values: [{ id: 'externalId', text: 'contract-lead' }, { id: 'workEmail', text: 'contract@example.com' }, { id: 'review', text: 'Approved' }] }]], ['3', []], ['4', []],
  ]);
  const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
    const { query, variables: v } = JSON.parse(init!.body as string) as { query: string; variables: Record<string, unknown> };
    if (query.includes('workspaces(')) return Response.json({ data: { workspaces: [{ id: '1', name: 'CRM Demo | Northstar Sandbox' }] } });
    if (query.includes('create_item(')) {
      const values = JSON.parse(String(v.values)) as Record<string, unknown>;
      const id = String(100 + state.itemMutations++);
      const item = { id, name: String(v.name), column_values: Object.entries(values).map(([id, value]) => ({ id, text: typeof value === 'string' ? value : String((value as { email?: string; label?: string; text?: string })?.email ?? (value as { label?: string })?.label ?? (value as { text?: string })?.text ?? value) })) };
      remoteItems.get(String(v.board))!.push(item);
      return Response.json({ data: { create_item: { id } } });
    }
    if (query.includes('change_multiple_column_values(')) return Response.json({ data: { change_multiple_column_values: { id: String(v.item) } } });
    if (query.includes('create_update(')) {
      state.mutations++;
      if (state.commit) remoteUpdates.push({ id: '90', body: String(v.body) });
      if (state.ambiguous) throw new Error('Network timed out after server commit: redacted-token');
      return Response.json({ data: { create_update: { id: '90' } } });
    }
    if (query.includes('updates(limit:')) return Response.json({ data: { items: [{ id: '20', updates: remoteUpdates }] } });
    if (query.includes('next_items_page')) return Response.json({ data: { next_items_page: { cursor: null, items: [{ id: '21', name: 'Second demo', column_values: [] }] } } });
    if (query.includes('items_page')) return Response.json({ data: { boards: [{ items_page: { cursor: state.pages ? 'cursor-2' : null, items: remoteItems.get((v.ids as string[])[0]!) ?? [] } }] } });
    if (query.includes('columns {')) {
      const id = (v.ids as string[])[0]!;
      const map = Object.values(mapping.boards).find(b => b?.id === id)!;
      const cols = id === '2' ? Object.entries(leadColumns).map(([key, [title, type]]) => ({ id: key, title, type: state.badColumn && key === 'review' ? 'text' : type, settings_str: JSON.stringify({ labels: Object.fromEntries((statusLabels[key] ?? []).map((l, i) => [i, l])) }) })) : Object.entries(map.columns).map(([key, id]) => ({ id, title: key, type: 'text', settings_str: '{}' }));
      return Response.json({ data: { boards: [{ id, name: map.name, workspace_id: state.badWorkspace ? 'unrelated' : '1', columns: cols }] } });
    }
    throw new Error('Unexpected test GraphQL operation');
  });
  return { config, mapping, lead, operation, fetcher, state, remoteUpdates, remoteItems };
}

it('reconciles a timeout after committing one internal update, including after a process restart', async () => {
  const s = sandbox(); s.state.ambiguous = true;
  const path = join(mkdtempSync(join(tmpdir(), 'crm-contract-')), 'test.sqlite');
  let store = new Store(path); let client = new MondayClient(new MondayTransport(s.config, s.fetcher), s.mapping, store);
  expect(await client.execute(s.lead, s.operation)).toBe('90'); expect(s.state.mutations).toBe(1);
  store.close(); store = new Store(path); client = new MondayClient(new MondayTransport(s.config, s.fetcher), s.mapping, store);
  expect(await client.execute(s.lead, s.operation)).toBe('90'); expect(s.state.mutations).toBe(1); expect(s.remoteUpdates).toHaveLength(1); store.close();
});
it('never reissues an unresolved mutation after retry/restart', async () => {
  const s = sandbox(); s.state.ambiguous = true; s.state.commit = false;
  const path = join(mkdtempSync(join(tmpdir(), 'crm-uncertain-')), 'test.sqlite'); let store = new Store(path);
  let client = new MondayClient(new MondayTransport(s.config, s.fetcher), s.mapping, store);
  await expect(client.execute(s.lead, s.operation)).rejects.toThrow('uncertain'); store.close();
  store = new Store(path); client = new MondayClient(new MondayTransport(s.config, s.fetcher), s.mapping, store);
  await expect(client.execute(s.lead, s.operation)).rejects.toThrow('uncertain'); expect(s.state.mutations).toBe(1); store.close();
});
it('fails closed on type, workspace, approval and write-gate mismatches', async () => {
  const s = sandbox(); const store = new Store(); const client = new MondayClient(new MondayTransport(s.config, s.fetcher), s.mapping, store);
  s.state.badColumn = true; await expect(client.execute(s.lead, s.operation)).rejects.toThrow('COLUMN_TYPE_MISMATCH'); s.state.badColumn = false;
  s.state.badWorkspace = true; await expect(client.execute(s.lead, s.operation)).rejects.toThrow('SANDBOX_BOARD_MISMATCH'); s.state.badWorkspace = false;
  await expect(client.execute({ ...s.lead, reviewStatus: 'Pending review' }, s.operation)).rejects.toThrow('APPROVAL_REQUIRED');
  s.config.DEMO_WRITE_ENABLED = 'false'; await expect(client.execute(s.lead, s.operation)).rejects.toThrow('WRITES_DISABLED');
  expect(s.state.mutations).toBe(0); store.close();
});
it('uses cursor pagination and validates manual review status reads', async () => {
  const s = sandbox(); s.state.pages = true; const store = new Store(); const api = new MondayTransport(s.config, s.fetcher);
  expect(await api.items('2')).toHaveLength(2);
  const client = new MondayClient(api, s.mapping, store);
  expect((await client.reviewStatuses())[0]).toEqual({ itemId: '20', status: 'Approved' }); expect(s.state.mutations).toBe(0); store.close();
});
it('creates Account and Lead with discovered column IDs, reconciles replay, and never advances stage on updates', async () => {
  const s = sandbox(); const store = new Store(); const client = new MondayClient(new MondayTransport(s.config, s.fetcher), s.mapping, store);
  const lead = { ...s.lead, externalId: 'new-contract-lead', workEmail: 'new-contract@example.com', mondayItemId: undefined, reviewStatus: 'Pending review' as const };
  const id = await client.syncLead(lead); expect(id).toBe('101'); expect(s.state.itemMutations).toBe(2);
  expect(await client.syncLead(lead)).toBe(id); expect(s.state.itemMutations).toBe(2);
  await client.syncLead({ ...lead, mondayItemId: id });
  const updates = s.fetcher.mock.calls.map(c => JSON.parse(c[1]!.body as string) as { query: string; variables: { values: string } }).filter(c => c.query.includes('change_multiple_column_values'));
  expect(updates).toHaveLength(1); expect(JSON.parse(updates[0]!.variables.values)).not.toHaveProperty('stage');
  expect(s.remoteItems.get('3')).toHaveLength(1); store.close();
});
it('blocks an email already present remotely under a different external ID', async () => {
  const s = sandbox(); const store = new Store(); const client = new MondayClient(new MondayTransport(s.config, s.fetcher), s.mapping, store);
  await expect(client.syncLead({ ...s.lead, externalId: 'different-external-id', mondayItemId: undefined })).rejects.toThrow('REMOTE_EMAIL_DUPLICATE');
  expect(s.state.itemMutations).toBe(0); store.close();
});
