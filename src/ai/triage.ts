import type { Intake, Triage } from '../domain/types.js';
import { LeadIntake, TriageResult } from '../domain/schemas.js';
import { requiredReview, unsafeInstructionFilter } from '../domain/rules.js';
import type { Provider } from './provider.js';
export async function triage(input: Intake, provider: Provider, threshold = 0.7): Promise<{ result?: Triage; manual: boolean; reason: string }> {
  try {
    const clean = LeadIntake.parse(input);
    const result = TriageResult.parse(await provider.suggest(clean));
    if (!result.evidence.every(e => clean.message.includes(e))) throw new Error('Evidence must be literal source snippets');
    if (/https?:\/\/|\b[^\s@]+@[^\s@]+\.[^\s@]+|```/.test([result.summary, result.rationale].join(' '))) throw new Error('Prohibited output content');
    const injected = unsafeInstructionFilter(clean.message);
    const manual = injected || result.confidence < threshold || result.priority === 'Unknown' || ['request_clarification', 'none'].includes(result.recommendedAction);
    return { result, manual, reason: injected ? 'Potential instruction injection; manual review required' : requiredReview(result, threshold) };
  } catch { return { manual: true, reason: 'Invalid or unavailable model output; manual review required' }; }
}
