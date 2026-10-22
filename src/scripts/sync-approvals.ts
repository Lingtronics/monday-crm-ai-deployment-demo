import { createApplication } from '../app.js';
if (process.argv.includes('--dry-run') && process.argv.includes('--execute')) throw new Error('Choose --dry-run or --execute, never both');
const runtime = createApplication();
try {
  if (!process.argv.includes('--execute')) console.log(JSON.stringify({ dryRun: true, mode: runtime.config.MODE, action: 'Read sandbox Review Status; apply Approved/Rejected decisions only to locally mapped leads' }));
  else console.log(JSON.stringify({ processed: (await runtime.approval.syncReviews()).length, metrics: runtime.intake.metrics() }, null, 2));
} finally { runtime.store.close(); }
