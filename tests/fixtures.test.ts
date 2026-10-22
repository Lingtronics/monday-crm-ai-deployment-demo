import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { LeadIntake } from '../src/domain/schemas.js';
import { boardDefinitions } from '../src/crm/board-mapping.js';
const fixtures = JSON.parse(readFileSync('data/fixtures/leads.json', 'utf8')) as unknown[];
it('contains 12+ valid evaluation leads plus unsafe validation fixtures', () => {
  expect(fixtures.filter(f => LeadIntake.safeParse(f).success).length).toBeGreaterThanOrEqual(12);
  expect(fixtures.filter(f => !LeadIntake.safeParse(f).success).length).toBe(3);
});
it('defines three free-plan boards and four trial-plan boards', () => { expect(boardDefinitions('B')).toHaveLength(3); expect(boardDefinitions('A')).toHaveLength(4); });
