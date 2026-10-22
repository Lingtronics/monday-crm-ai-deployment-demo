import { boardDefinitions } from '../crm/board-mapping.js';
const plan = process.argv.includes('--plan-a') ? 'A' : 'B';
if (process.argv.includes('--dry-run') && process.argv.includes('--execute')) throw new Error('Choose --dry-run or --execute, never both');
if (process.argv.includes('--execute')) {
  const { provision } = await import('../crm/provision.js');
  await provision(plan);
} else {
  console.log(JSON.stringify({ dryRun: true, plan, workspace: 'CRM Demo | Northstar Sandbox', boards: boardDefinitions(plan), relationships: 'Configure target boards in UI; rediscover before linking. Local SQLite is the fallback.' }, null, 2));
}
