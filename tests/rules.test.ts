import { describe, it, expect } from 'vitest';
import { normaliseEmail, normaliseDomain, determineRouting } from '../src/domain/rules.js';
import { MockClient } from '../src/crm/mock-client.js';
describe('domain contracts', () => {
  it('normalises exact email keys and ignores invalid input', () => { expect(normaliseEmail('  DEMO@EXAMPLE.COM ')).toBe('demo@example.com'); expect(normaliseEmail('bad')).toBeUndefined(); });
  it('does not infer unknown domains', () => { expect(normaliseDomain('Acme')).toBeUndefined(); expect(normaliseDomain(' TEAM.EXAMPLE.COM ')).toBe('team.example.com'); });
  it('routing never invents an employee', () => expect(determineRouting('sales')).toEqual({ suggestedTeam: 'Demo Sales', ownerId: null }));
  it('starts with no side effects', () => expect(new MockClient().tasks.size).toBe(0));
});
