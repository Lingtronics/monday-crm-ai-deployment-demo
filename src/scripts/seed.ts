import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { createApplication } from '../app.js';
import { LeadIntake } from '../domain/schemas.js';
const fixtures = z.array(z.unknown()).parse(JSON.parse(readFileSync('data/fixtures/leads.json', 'utf8')));
if (process.argv.includes('--dry-run') && process.argv.includes('--execute')) throw new Error('Choose --dry-run or --execute, never both');
if (!process.argv.includes('--execute')) console.log(JSON.stringify({ dryRun: true, syntheticInputs: fixtures.length, validInputs: fixtures.filter(f => LeadIntake.safeParse(f).success).length, noWrites: true }));
else {
  const runtime = createApplication();
  try {
    if (runtime.config.MODE === 'monday' && runtime.config.DEMO_WRITE_ENABLED !== 'true') throw new Error('Live seed requires DEMO_WRITE_ENABLED=true');
    for (const fixture of fixtures) {
      const parsed = LeadIntake.safeParse(fixture); if (!parsed.success) continue;
      const r = await runtime.intake.intake(parsed.data);
      console.log(JSON.stringify({ externalId: r.lead.externalId, status: r.status, sync: r.lead.syncStatus }));
    }
  } finally { runtime.store.close(); }
}
