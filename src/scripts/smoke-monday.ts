import { createApplication } from '../app.js';
import { MondayClient } from '../crm/monday-client.js';
const runtime = createApplication();
try {
  if (!(runtime.crm instanceof MondayClient)) throw new Error('Set MODE=monday with local credentials and discovered mapping first');
  const version = await runtime.crm.api.me();
  if (version.version.value !== '2026-07') throw new Error('Unexpected API version; check official versioning documentation');
  await runtime.crm.verify();
  const items = await runtime.crm.reviewStatuses();
  console.log(JSON.stringify({ liveReadSchemaVerified: true, apiVersion: version.version.value, sandboxItemsRead: items.length, liveWriteWorkflowVerified: false, note: 'Read-only smoke only. Run documented synthetic write/approval checks separately.' }, null, 2));
} finally { runtime.store.close(); }
