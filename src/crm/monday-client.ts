import { z } from 'zod';
import type { Settings } from '../config.js';
import type { Lead, Operation } from '../domain/types.js';
import { LeadIntake } from '../domain/schemas.js';
import { ColumnMap, leadColumns, statusLabels, type Mapping } from './board-mapping.js';
import type { CrmPort } from './port.js';
import { Store } from '../persistence/db.js';

const Column = z.object({ id: z.string(), title: z.string(), type: z.string(), settings_str: z.string() });
const Board = z.object({ id: z.string(), name: z.string(), workspace_id: z.string(), columns: z.array(Column) });
const Item = z.object({ id: z.string(), name: z.string(), column_values: z.array(z.object({ id: z.string(), text: z.string().nullable() })) });
const Page = z.object({ cursor: z.string().nullable(), items: z.array(Item) });
export class SafeApiError extends Error { constructor(public readonly code: string) { super(`monday API failure (${code}); check permissions, schema, retry hints and sandbox mapping`); } }
export class UncertainWriteError extends Error { constructor() { super('Write outcome uncertain; journal retained. Reconcile before any retry; no blind replay permitted.'); } }
export class MondayTransport {
  constructor(readonly config: Settings, readonly fetcher: typeof fetch = fetch, readonly pause: (ms: number) => Promise<void> = ms => new Promise(r => setTimeout(r, ms))) {}
  async query<T>(query: string, variables: Record<string, unknown>, schema: z.ZodType<T>, mutation = false): Promise<T> {
    if (!this.config.MONDAY_API_TOKEN) throw new SafeApiError('TOKEN_MISSING');
    if (mutation) this.writeGate();
    for (let attempt = 0; attempt < 3; attempt++) {
      let retryMs = 100 * 2 ** attempt + Math.floor(Math.random() * 80);
      try {
        const response = await this.fetcher('https://api.monday.com/v2', { method: 'POST', headers: { Authorization: this.config.MONDAY_API_TOKEN, 'API-Version': this.config.MONDAY_API_VERSION, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(10000) });
        const payload: unknown = await response.json();
        const envelope = z.object({ data: z.unknown().optional(), retry_in_seconds: z.number().optional(), errors: z.array(z.object({ extensions: z.object({ code: z.string().optional(), retry_in_seconds: z.number().optional() }).passthrough().optional() }).passthrough()).optional() }).parse(payload);
        const err = envelope.errors?.[0];
        const code = err?.extensions?.code ?? `HTTP_${response.status}`;
        const transient = response.status === 429 || response.status >= 500 || /RATE|COMPLEXITY|TEMPORAR/i.test(code);
        const hint = Number(response.headers.get('Retry-After') ?? err?.extensions?.retry_in_seconds ?? envelope.retry_in_seconds ?? 0);
        if (hint > 0) retryMs = hint * 1000;
        if (!response.ok || envelope.errors?.length) {
          if (!mutation && transient && attempt < 2 && retryMs <= 10000) { await this.pause(retryMs); continue; }
          throw new SafeApiError(code);
        }
        return schema.parse(envelope.data);
      } catch (error) {
        if (error instanceof SafeApiError || error instanceof z.ZodError) throw error;
        if (mutation) throw new UncertainWriteError();
        if (attempt === 2) throw new SafeApiError('NETWORK_RETRIES_EXHAUSTED');
        await this.pause(retryMs);
      }
    }
    throw new SafeApiError('RETRIES_EXHAUSTED');
  }
  async me() { return this.query('query { me { id } version { kind value } }', {}, z.object({ me: z.object({ id: z.string() }), version: z.object({ kind: z.string(), value: z.string() }) })); }
  async board(id: string) {
    if (!this.config.MONDAY_ALLOWED_BOARD_IDS.split(',').map(s => s.trim()).includes(id)) throw new SafeApiError('BOARD_NOT_ALLOWLISTED');
    const result = await this.query('query($ids:[ID!]) { boards(ids:$ids) { id name workspace_id columns { id title type settings_str } } }', { ids: [id] }, z.object({ boards: z.array(Board) }));
    const b = result.boards[0];
    if (!b || b.id !== id || b.workspace_id !== this.config.MONDAY_WORKSPACE_ID || !b.name.startsWith('CRM Demo | ')) throw new SafeApiError('SANDBOX_BOARD_MISMATCH');
    return b;
  }
  async workspace() {
    const result = await this.query('query($ids:[ID!]) { workspaces(ids:$ids) { id name } }', { ids: [this.config.MONDAY_WORKSPACE_ID] }, z.object({ workspaces: z.array(z.object({ id: z.string(), name: z.string() })) }));
    const workspace = result.workspaces[0];
    if (!workspace || workspace.id !== this.config.MONDAY_WORKSPACE_ID || workspace.name !== 'CRM Demo | Northstar Sandbox') throw new SafeApiError('SANDBOX_WORKSPACE_MISMATCH');
    return workspace;
  }
  async items(boardId: string) {
    await this.board(boardId);
    const all: z.infer<typeof Item>[] = [];
    let cursor: string | null = null;
    for (let pages = 0; pages < 100; pages++) {
      let page: z.infer<typeof Page>;
      if (!cursor) {
        const r = await this.query('query($ids:[ID!]) { boards(ids:$ids) { items_page(limit:100) { cursor items { id name column_values { id text } } } } }', { ids: [boardId] }, z.object({ boards: z.array(z.object({ items_page: Page })) }));
        if (!r.boards[0]) throw new SafeApiError('BOARD_UNAVAILABLE'); page = r.boards[0].items_page;
      } else {
        const r = await this.query('query($cursor:String!) { next_items_page(limit:100,cursor:$cursor) { cursor items { id name column_values { id text } } } }', { cursor }, z.object({ next_items_page: Page })); page = r.next_items_page;
      }
      all.push(...page.items); cursor = page.cursor;
      if (!cursor) return all;
    }
    throw new SafeApiError('PAGINATION_BOUND_EXCEEDED');
  }
  writeGate() { if (this.config.MODE !== 'monday' || this.config.DEMO_WRITE_ENABLED !== 'true') throw new SafeApiError('WRITES_DISABLED'); }
}

export class MondayClient implements CrmPort {
  readonly mode = 'monday' as const;
  readonly map: Mapping;
  constructor(readonly api: MondayTransport, mapping: unknown, readonly store: Store) {
    this.map = ColumnMap.parse(mapping);
    if (this.map.workspaceId !== api.config.MONDAY_WORKSPACE_ID) throw new SafeApiError('MAPPING_WORKSPACE_MISMATCH');
    for (const [role, setting] of [['leads', 'MONDAY_LEADS_BOARD_ID'], ['accounts', 'MONDAY_ACCOUNTS_BOARD_ID'], ['opportunities', 'MONDAY_OPPORTUNITIES_BOARD_ID']] as const) {
      if (this.map.boards[role].id !== api.config[setting]) throw new SafeApiError('MAPPING_BOARD_MISMATCH');
    }
  }
  async verify() {
    await this.api.workspace();
    for (const [role, map] of Object.entries(this.map.boards)) {
      if (!map) continue;
      const b = await this.api.board(map.id);
      if (b.name !== map.name) throw new SafeApiError('MAPPING_NAME_MISMATCH');
      for (const [key, id] of Object.entries(map.columns)) {
        const c = b.columns.find(c => c.id === id);
        if (!c) throw new SafeApiError('COLUMN_MISSING');
        if (role === 'leads' && key in leadColumns) {
          const expected = leadColumns[key as keyof typeof leadColumns];
          if (c.type !== expected[1]) throw new SafeApiError('COLUMN_TYPE_MISMATCH');
          const labels = statusLabels[key];
          if (labels && !labels.every(label => Object.values(JSON.parse(c.settings_str).labels ?? {}).includes(label))) throw new SafeApiError('STATUS_LABEL_MISSING');
        }
      }
      if (role === 'leads' && Object.keys(leadColumns).some(k => !map.columns[k])) throw new SafeApiError('REQUIRED_MAPPING_MISSING');
    }
  }
  private async createOnce(boardId: string, column: string, key: string, name: string, values: Record<string, unknown>) {
    this.api.writeGate(); await this.verify();
    const journalKey = `${boardId}:${key}`;
    const matches = (await this.api.items(boardId)).filter(i => i.column_values.some(v => v.id === column && v.text === key));
    if (matches.length > 1) throw new SafeApiError('DUPLICATE_OPERATION_MARKER');
    if (matches[0]) { this.store.db.prepare('INSERT INTO writes VALUES(?,?) ON CONFLICT(key) DO UPDATE SET result=excluded.result').run(journalKey, matches[0].id); return matches[0].id; }
    const journal = this.store.db.prepare('SELECT result FROM writes WHERE key=?').get(journalKey);
    if (journal) throw new UncertainWriteError();
    this.store.db.prepare('INSERT INTO writes(key) VALUES(?)').run(journalKey);
    try {
      const r = await this.api.query('mutation($board:ID!,$name:String!,$values:JSON!) { create_item(board_id:$board,item_name:$name,column_values:$values) { id } }', { board: boardId, name, values: JSON.stringify({ ...values, [column]: key }) }, z.object({ create_item: z.object({ id: z.string() }) }), true);
      this.store.db.prepare('UPDATE writes SET result=? WHERE key=?').run(r.create_item.id, journalKey); return r.create_item.id;
    } catch {
      const found = (await this.api.items(boardId)).find(i => i.column_values.some(v => v.id === column && v.text === key));
      if (found) { this.store.db.prepare('UPDATE writes SET result=? WHERE key=?').run(found.id, journalKey); return found.id; }
      throw new UncertainWriteError();
    }
  }
  async syncLead(lead: Lead) {
    LeadIntake.parse(Object.fromEntries(['externalId', 'fullName', 'workEmail', 'companyName', 'companyDomain', 'source', 'message'].map(k => [k, lead[k as keyof Lead]])));
    const map = this.map.boards.leads; const c = map.columns;
    const values: Record<string, unknown> = {};
    const set = (key: string, value: unknown) => { const id = c[key]; if (!id) throw new SafeApiError('REQUIRED_MAPPING_MISSING'); values[id] = value; };
    set('workEmail', { email: lead.workEmail, text: lead.workEmail }); set('companyName', lead.companyName); set('source', lead.source);
    set('priority', { label: lead.recommendedPriority }); set('summary', { text: lead.triage?.summary ?? '' });
    set('nextStep', { text: lead.triage?.recommendedAction ?? 'Needs manual review' }); set('confidence', lead.triage?.confidence ?? 0);
    set('execution', { label: lead.executionStatus }); set('review', { label: lead.reviewStatus });
    const existing = lead.mondayItemId;
    if (existing) {
      this.api.writeGate(); await this.verify();
      if (!(await this.api.items(map.id)).some(i => i.id === existing && i.column_values.some(v => v.id === c.externalId && v.text === lead.externalId))) throw new SafeApiError('ITEM_NOT_IN_SANDBOX');
      await this.api.query('mutation($board:ID!,$item:ID!,$values:JSON!) { change_multiple_column_values(board_id:$board,item_id:$item,column_values:$values) { id } }', { board: map.id, item: existing, values: JSON.stringify(values) }, z.object({ change_multiple_column_values: z.object({ id: z.string() }) }), true);
      return existing;
    }
    set('stage', { label: 'New' });
    this.api.writeGate(); await this.verify();
    const remoteEmailMatch = (await this.api.items(map.id)).find(i => i.column_values.some(v => v.id === c.workEmail && v.text?.trim().toLowerCase() === lead.workEmail));
    if (remoteEmailMatch && !remoteEmailMatch.column_values.some(v => v.id === c.externalId && v.text === lead.externalId)) throw new SafeApiError('REMOTE_EMAIL_DUPLICATE_RECONCILE_LOCALLY');
    const account = this.map.boards.accounts;
    if (!account.columns.domain || !account.columns.externalId || !c.externalId) throw new SafeApiError('REQUIRED_MAPPING_MISSING');
    // Stable local account UUID prevents merging companies with unknown domains.
    const accountId = await this.createOnce(account.id, account.columns.externalId, `account-${lead.accountId}`, lead.companyName, { [account.columns.domain]: lead.companyDomain ?? '' });
    if (c.account) {
      const board = await this.api.board(map.id); const relation = board.columns.find(v => v.id === c.account);
      const settings = JSON.parse(relation?.settings_str ?? '{}');
      if (relation?.type !== 'board_relation' || !Array.isArray(settings.boardIds) || !settings.boardIds.map(String).includes(account.id)) throw new SafeApiError('RELATION_NOT_CONFIGURED');
      values[c.account] = { item_ids: [Number(accountId)] };
    }
    const contactBoard = this.map.boards.contacts;
    if (this.map.plan === 'A' && contactBoard) {
      if (!contactBoard.columns.externalId || !contactBoard.columns.email) throw new SafeApiError('REQUIRED_MAPPING_MISSING');
      const contactId = await this.createOnce(contactBoard.id, contactBoard.columns.externalId, `contact-${lead.id}`, lead.fullName, { [contactBoard.columns.email]: { email: lead.workEmail, text: lead.workEmail } });
      if (c.contact) {
        const board = await this.api.board(map.id); const relation = board.columns.find(v => v.id === c.contact);
        if (relation?.type !== 'board_relation' || !(JSON.parse(relation.settings_str).boardIds ?? []).map(String).includes(contactBoard.id)) throw new SafeApiError('RELATION_NOT_CONFIGURED');
        values[c.contact] = { item_ids: [Number(contactId)] };
      }
    }
    return this.createOnce(map.id, c.externalId, lead.externalId, lead.fullName, values);
  }
  async execute(lead: Lead, operation: Operation) {
    if (lead.reviewStatus !== 'Approved' || operation.leadId !== lead.id || !['create_internal_followup', 'propose_opportunity'].includes(operation.action)) throw new SafeApiError('APPROVAL_REQUIRED');
    if (operation.action === 'create_internal_followup') return this.internalUpdate(lead, operation);
    const board = this.map.boards.opportunities;
    if (!board.columns.operationId || !board.columns.status) throw new SafeApiError('REQUIRED_MAPPING_MISSING');
    return this.createOnce(board.id, board.columns.operationId, operation.decisionId, `Internal follow-up | ${lead.externalId}`, { [board.columns.status]: 'Proposed' });
  }
  private async internalUpdate(lead: Lead, operation: Operation) {
    this.api.writeGate(); await this.verify();
    const b = this.map.boards.leads;
    if (!lead.mondayItemId || !(await this.api.items(b.id)).some(i => i.id === lead.mondayItemId && i.column_values.some(v => v.id === b.columns.externalId && v.text === lead.externalId))) throw new SafeApiError('ITEM_NOT_IN_SANDBOX');
    const marker = `CRM_DEMO_OPERATION:${operation.decisionId}`;
    const journalKey = `update:${b.id}:${operation.decisionId}`;
    const reconcile = async () => {
      for (let page = 1; page <= 100; page++) {
        const r = await this.api.query('query($ids:[ID!],$page:Int!) { items(ids:$ids) { id updates(limit:100,page:$page) { id body } } }', { ids: [lead.mondayItemId], page }, z.object({ items: z.array(z.object({ id: z.string(), updates: z.array(z.object({ id: z.string(), body: z.string() })) })) }));
        const updates = r.items.find(i => i.id === lead.mondayItemId)?.updates;
        if (!updates) throw new SafeApiError('ITEM_UNAVAILABLE');
        const matches = updates.filter(u => u.body.includes(marker));
        if (matches.length > 1) throw new SafeApiError('DUPLICATE_OPERATION_MARKER');
        if (matches[0]) return matches[0].id;
        if (updates.length < 100) return undefined;
      }
      throw new SafeApiError('PAGINATION_BOUND_EXCEEDED');
    };
    const found = await reconcile();
    if (found) { this.store.db.prepare('INSERT INTO writes VALUES(?,?) ON CONFLICT(key) DO UPDATE SET result=excluded.result').run(journalKey, found); return found; }
    if (this.store.db.prepare('SELECT key FROM writes WHERE key=?').get(journalKey)) throw new UncertainWriteError();
    this.store.db.prepare('INSERT INTO writes(key) VALUES(?)').run(journalKey);
    try {
      const r = await this.api.query('mutation($item:ID!,$body:String!) { create_update(item_id:$item,body:$body) { id } }', { item: lead.mondayItemId, body: `Internal demo follow-up: reviewer to confirm requirements. ${marker}` }, z.object({ create_update: z.object({ id: z.string() }) }), true);
      this.store.db.prepare('UPDATE writes SET result=? WHERE key=?').run(r.create_update.id, journalKey); return r.create_update.id;
    } catch {
      const recovered = await reconcile();
      if (recovered) { this.store.db.prepare('UPDATE writes SET result=? WHERE key=?').run(recovered, journalKey); return recovered; }
      throw new UncertainWriteError();
    }
  }
  async reviewStatuses() {
    await this.verify(); const b = this.map.boards.leads;
    return (await this.api.items(b.id)).map(i => ({ itemId: i.id, status: i.column_values.find(v => v.id === b.columns.review)?.text ?? '' }));
  }
}
