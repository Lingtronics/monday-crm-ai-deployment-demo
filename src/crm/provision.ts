import { z } from 'zod';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadConfig } from '../config.js';
import { MondayTransport, SafeApiError, UncertainWriteError } from './monday-client.js';
import { boardDefinitions, ColumnMap } from './board-mapping.js';
import { Store } from '../persistence/db.js';

export async function provision(plan: 'A' | 'B'): Promise<void> {
  const config = loadConfig(); const api = new MondayTransport(config);
  api.writeGate(); await api.workspace();
  const store = new Store(config.DATABASE_PATH);
  try {
    const boards: Record<string, { id: string; name: string; columns: Record<string, string> }> = {};
    const listed: Array<{ id: string; name: string }> = [];
    for (let page = 1; page <= 100; page++) {
      const r = await api.query('query($workspace:[ID],$page:Int!) { boards(workspace_ids:$workspace,limit:100,page:$page) { id name } }', { workspace: [config.MONDAY_WORKSPACE_ID], page }, z.object({ boards: z.array(z.object({ id: z.string(), name: z.string() })) }));
      listed.push(...r.boards); if (r.boards.length < 100) break;
      if (page === 100) throw new SafeApiError('DISCOVERY_BOUND_EXCEEDED');
    }
    for (const definition of boardDefinitions(plan)) {
      const matching = listed.filter(b => b.name === definition.name);
      if (matching.length > 1) throw new SafeApiError('AMBIGUOUS_BOARD_NAME');
      let board = matching[0];
      const key = `setup-board-${config.MONDAY_WORKSPACE_ID}-${definition.name}`;
      if (!board) {
        if (store.db.prepare('SELECT key FROM writes WHERE key=?').get(key)) throw new UncertainWriteError();
        store.db.prepare('INSERT INTO writes(key) VALUES(?)').run(key);
        const result = await api.query('mutation($name:String!,$workspace:ID!) { create_board(board_name:$name,board_kind:public,workspace_id:$workspace) { id name } }', { name: definition.name, workspace: config.MONDAY_WORKSPACE_ID }, z.object({ create_board: z.object({ id: z.string(), name: z.string() }) }), true);
        board = result.create_board;
        config.MONDAY_ALLOWED_BOARD_IDS += `,${board.id}`; // newly returned ID in verified sandbox
      }
      // Existing boards must already be explicitly allowlisted; no unrelated schema reads.
      const discovered = await api.board(board.id);
      const columns: Record<string, string> = {};
      for (const column of definition.columns) {
        const matches = discovered.columns.filter(c => c.title === column.title);
        if (matches.length > 1) throw new SafeApiError('AMBIGUOUS_COLUMN_TITLE');
        let c = matches[0];
        if (!c) {
          const ck = `setup-column-${board.id}-${column.key}`;
          if (store.db.prepare('SELECT key FROM writes WHERE key=?').get(ck)) throw new UncertainWriteError();
          store.db.prepare('INSERT INTO writes(key) VALUES(?)').run(ck);
          const labels = 'labels' in column ? column.labels : undefined;
          const defaults = labels ? { labels: Object.fromEntries(labels.map((l, i) => [String(i), l])) } : {};
          const r = await api.query('mutation($board:ID!,$title:String!,$type:ColumnType!,$defaults:JSON!) { create_column(board_id:$board,title:$title,column_type:$type,defaults:$defaults) { id title type settings_str } }', { board: board.id, title: column.title, type: column.type, defaults: JSON.stringify(defaults) }, z.object({ create_column: z.object({ id: z.string(), title: z.string(), type: z.string(), settings_str: z.string() }) }), true);
          c = r.create_column;
        }
        if (c.type !== column.type) throw new SafeApiError('COLUMN_TYPE_MISMATCH');
        columns[column.key] = c.id;
      }
      boards[definition.name.split(' | ')[1]!.toLowerCase()] = { id: board.id, name: board.name, columns };
    }
    // Relation setup is opt-in because plan privileges differ. Configure targets in UI, then rediscover.
    if (process.argv.includes('--discover-relations')) {
      const leads = boards.leads!; const schema = await api.board(leads.id);
      for (const [role, target] of [['account', 'accounts'], ['contact', 'contacts']] as const) {
        if (!boards[target]) continue;
        const matches = schema.columns.filter(c => c.type === 'board_relation' && (JSON.parse(c.settings_str).boardIds ?? []).map(String).includes(boards[target]!.id));
        if (matches.length > 1) throw new SafeApiError('AMBIGUOUS_RELATION');
        if (matches[0]) leads.columns[role] = matches[0].id;
      }
    }
    const mapping = ColumnMap.parse({ schemaVersion: 1, workspaceId: config.MONDAY_WORKSPACE_ID, plan, boards });
    mkdirSync(dirname(config.MONDAY_COLUMN_MAP_PATH), { recursive: true });
    writeFileSync(config.MONDAY_COLUMN_MAP_PATH, JSON.stringify(mapping, null, 2));
    console.log(JSON.stringify({ mappingSaved: config.MONDAY_COLUMN_MAP_PATH, boardIds: Object.fromEntries(Object.entries(boards).map(([k, b]) => [k, b.id])), allowlist: config.MONDAY_ALLOWED_BOARD_IDS, liveWorkflowVerified: false }, null, 2));
  } finally { store.close(); }
}
