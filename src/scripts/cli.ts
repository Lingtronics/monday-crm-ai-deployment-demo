import { readFileSync } from 'node:fs';
import { createApplication } from '../app.js';
const runtime = createApplication();
try {
  const [command, id = 'lead-01'] = process.argv.slice(2);
  if (command === 'intake') {
    const fixtures = JSON.parse(readFileSync('data/fixtures/leads.json', 'utf8')) as Array<{ externalId: string }>;
    const fixture = fixtures.find(f => f.externalId === id); if (!fixture) throw new Error('Unknown fixture ID');
    const result = await runtime.intake.intake(fixture);
    console.log(JSON.stringify({ status: result.status, leadId: result.lead.id, externalId: result.lead.externalId, review: result.lead.reviewStatus, sync: result.lead.syncStatus }, null, 2));
  } else if (['approve', 'reject', 'retry'].includes(command ?? '')) {
    const lead = runtime.store.byExternal(id) ?? runtime.store.getLead(id); if (!lead) throw new Error('Unknown lead ID');
    const result = command === 'retry' ? await runtime.approval.retryLead(lead) : await runtime.approval.decide({ leadId: lead.id, decision: command === 'approve' ? 'Approved' : 'Rejected', reviewer: 'local-demo-reviewer' });
    console.log(JSON.stringify({ leadId: result.lead.id, review: result.lead.reviewStatus, execution: result.lead.executionStatus, sync: result.lead.syncStatus, operation: result.operation?.status }, null, 2));
  } else if (command === 'status') {
    console.log(JSON.stringify({ metrics: runtime.intake.metrics(), provider: runtime.provider.name, realInference: runtime.provider.realInference, leads: runtime.store.leads().map(l => ({ id: l.id, externalId: l.externalId, stage: l.stage, review: l.reviewStatus, execution: l.executionStatus, sync: l.syncStatus })), audit: runtime.store.audits() }, null, 2));
  } else throw new Error('Use intake, approve, reject, retry or status');
} catch { console.error('Command failed. Check fixture/lead ID, validated proposal, environment and local audit. No credentials or raw payloads logged.'); process.exitCode = 1; }
finally { runtime.store.close(); }
