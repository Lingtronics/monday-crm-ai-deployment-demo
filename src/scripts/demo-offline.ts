import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Config } from '../config.js';
import { createApplication } from '../app.js';
import { z } from 'zod';
const path = resolve('.local', `demo-${randomUUID()}.sqlite`);
// Force mock + fixture even if the shell is configured for live use.
const runtime = createApplication(Config.parse({ DATABASE_PATH: path, MODE: 'mock', LLM_PROVIDER: 'fixture' }));
try {
  const fixtures = z.array(z.object({ externalId: z.string() }).passthrough()).parse(JSON.parse(readFileSync('data/fixtures/leads.json', 'utf8')));
  const fixture = (id: string) => fixtures.find(f => f.externalId === id)!;
  console.log('NORTHSTAR SYSTEMS | OFFLINE SYNTHETIC CRM | fixture rules, no real AI inference');
  const first = await runtime.intake.intake(fixture('lead-01'));
  assert.equal(first.lead.reviewStatus, 'Pending review'); assert.equal(runtime.store.operations().length, 0);
  console.log('1. Intake:', first.lead.externalId, 'priority:', first.lead.recommendedPriority, 'review:', first.lead.reviewStatus);
  assert.equal((await runtime.intake.intake(fixture('lead-01'))).status, 'replayed');
  assert.equal((await runtime.intake.intake(fixture('email-duplicate'))).status, 'duplicate');
  assert.equal(runtime.store.leads().length, 1); console.log('2. External ID replay + mixed-case duplicate: one logical lead.');
  console.log('3. Recommendation:', first.lead.triage?.summary, 'Source snippets validated:', first.lead.triage?.evidence.length);
  const decision = { leadId: first.lead.id, decision: 'Approved', reviewer: 'local-demo-reviewer' };
  await runtime.approval.decide(decision); await runtime.approval.decide(decision);
  assert.equal(runtime.store.operations().filter(o => o.status === 'Completed').length, 1);
  const second = await runtime.intake.intake(fixture('lead-02'));
  await runtime.approval.decide({ leadId: second.lead.id, decision: 'Rejected', reviewer: 'local-demo-reviewer' });
  assert.equal(runtime.store.operation(second.lead.id), undefined);
  console.log('4. Approved twice → exactly one internal follow-up; rejected lead → zero.');
  const unsafe = await runtime.intake.intake(fixture('lead-11')); assert.equal(unsafe.lead.reviewStatus, 'Needs manual review');
  await assert.rejects(runtime.approval.decide({ leadId: unsafe.lead.id, decision: 'Approved', reviewer: 'local-demo-reviewer' }));
  for (const id of ['invalid-email', 'missing-email', 'too-long']) await assert.rejects(runtime.intake.intake(fixture(id)));
  console.table(runtime.store.leads().map(l => ({ lead: l.externalId, stage: l.stage, review: l.reviewStatus, execution: l.executionStatus })));
  console.log('5. Computed metrics:', runtime.intake.metrics());
  console.log('Audit events:', runtime.store.audits().map(e => `${e.eventType}:${e.outcome}`).join(', '));
  console.log('LIVE_MONDAY_VERIFIED=false | ACTUAL_MODEL_EXERCISED=false');
  console.log('Persistent evidence database:', path);
  writeFileSync('.local/last-demo.json', JSON.stringify({ databasePath: path, leadId: first.lead.id }, null, 2));
  console.log('PASS — all demo assertions passed. Five-minute guide: docs/DEMO_SCRIPT.md');
} finally { runtime.store.close(); }
