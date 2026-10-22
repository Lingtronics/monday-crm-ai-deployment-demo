import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { LeadIntake } from '../domain/schemas.js';
import { triage } from '../ai/triage.js';
import { FixtureProvider, CompatibleProvider } from '../ai/provider.js';
import { loadConfig } from '../config.js';
const config = loadConfig();
const provider = config.LLM_PROVIDER === 'fixture' ? new FixtureProvider() : new CompatibleProvider(config);
const fixtures = z.array(z.unknown()).parse(JSON.parse(readFileSync('data/fixtures/leads.json', 'utf8')));
const gold = z.array(z.object({ externalId: z.string(), intent: z.string(), priority: z.string(), manualReview: z.boolean() }).strict()).parse(JSON.parse(readFileSync('data/fixtures/golden-labels.json', 'utf8')));
const results: Array<{ externalId: string; expectedIntent: string; actualIntent: string; intentCorrect: boolean; priorityCorrect: boolean; manualCorrect: boolean }> = [];
for (const label of gold) {
  const input = fixtures.map(f => LeadIntake.safeParse(f)).find(f => f.success && f.data.externalId === label.externalId);
  if (!input?.success) throw new Error(`Missing evaluation fixture ${label.externalId}`);
  const output = await triage(input.data, provider, config.AI_CONFIDENCE_THRESHOLD);
  results.push({ externalId: label.externalId, expectedIntent: label.intent, actualIntent: output.result?.intent ?? 'invalid', intentCorrect: output.result?.intent === label.intent, priorityCorrect: output.result?.priority === label.priority, manualCorrect: output.manual === label.manualReview });
}
const count = results.length; const correct = (key: 'intentCorrect' | 'priorityCorrect' | 'manualCorrect') => results.filter(r => r[key]).length;
const report = { provider: provider.name, realInference: provider.realInference, count, intentCorrect: correct('intentCorrect'), priorityCorrect: correct('priorityCorrect'), manualCorrect: correct('manualCorrect'), results };
writeFileSync('docs/evaluation-results.json', JSON.stringify(report, null, 2) + '\n');
writeFileSync('docs/EVALUATION_REPORT.md', `# Evaluation report\n\nProvider: **${provider.name}**. Real model inference: **${provider.realInference}**. ${count} independently labelled synthetic cases; labels are never read by the classifier.\n\n| Measure | Correct / cases |\n|---|---|\n| Intent | ${correct('intentCorrect')} / ${count} |\n| Priority | ${correct('priorityCorrect')} / ${count} |\n| Manual-review flag | ${correct('manualCorrect')} / ${count} |\n\n${results.filter(r => !r.intentCorrect || !r.priorityCorrect || !r.manualCorrect).length ? 'Error cases: ' + results.filter(r => !r.intentCorrect || !r.priorityCorrect || !r.manualCorrect).map(r => r.externalId).join(', ') : 'No classification mismatches in this fixture run.'}\n\n${results.map(r => `- ${r.externalId}: ${r.expectedIntent} → ${r.actualIntent}; priority correct=${r.priorityCorrect}; manual flag correct=${r.manualCorrect}`).join('\n')}\n\nThese are deterministic fixture regression results, not measured LLM quality, operational time savings or production outcomes. A small deliberately simple dataset cannot establish generalisation or prompt-injection immunity. Validation and action allowlists, absence of tools, human approval and sandbox gates provide the execution boundary. Three invalid inputs and duplicate cases are covered separately by workflow/API tests.\n\nRun pnpm eval to regenerate; a real provider requires explicit local consent and authorised configuration. Inspect docs/evaluation-results.json for per-case evidence and confusion pairs. No real model was exercised during delivery.\n`);
console.log(JSON.stringify({ ...report, results: undefined }, null, 2));
