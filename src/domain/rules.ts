import { z } from 'zod';
import type { Triage } from './types.js';
export function normaliseEmail(input: string): string | undefined { const v = z.email().safeParse(input.trim().toLowerCase()); return v.success ? v.data : undefined; }
export function normaliseDomain(input?: string): string | undefined {
  if (!input) return undefined;
  const value = input.trim().toLowerCase();
  return /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(value) ? value : undefined;
}
export function determineRouting(intent: Triage['intent']) { return { suggestedTeam: { sales: 'Demo Sales', support: 'Demo Service', partnership: 'Demo Alliances', other: 'Demo Sales Operations' }[intent], ownerId: null }; }
export function unsafeInstructionFilter(text: string) { return /ignore.*instructions|system\s*prompt|execute\s+code|send\s+email|https?:\/\//i.test(text); }
export function requiredReview(triage?: Triage, threshold = 0.7): string { return !triage ? 'Invalid model output; manual review required' : triage.confidence < threshold ? 'Low confidence; manual review required' : triage.recommendedAction === 'request_clarification' || triage.priority === 'Unknown' ? 'Missing or ambiguous information; manual review required' : 'Human approval required for every proposed action'; }
