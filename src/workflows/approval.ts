import { randomUUID } from 'node:crypto';
import { ApprovalDecision } from '../domain/schemas.js';
import type { Lead, Operation } from '../domain/types.js';
import type { IntakeWorkflow } from './intake.js';
export class ApprovalWorkflow {
  private locks = new Map<string, Promise<unknown>>();
  constructor(readonly intake: IntakeWorkflow) {}
  async decide(input: unknown) {
    const decision = ApprovalDecision.parse(input);
    // Serialise overlapping deliveries in this process; SQLite and remote markers protect restarts.
    const previous = this.locks.get(decision.leadId) ?? Promise.resolve();
    const work = previous.catch(() => {}).then(() => this.apply(decision));
    this.locks.set(decision.leadId, work);
    try { return await work; } finally { if (this.locks.get(decision.leadId) === work) this.locks.delete(decision.leadId); }
  }
  private async apply(decision: ReturnType<typeof ApprovalDecision.parse>) {
    const { store, crm } = this.intake; const lead = store.getLead(decision.leadId);
    if (!lead) throw new Error('Unknown lead');
    if (['Approved', 'Rejected'].includes(lead.reviewStatus) && lead.reviewStatus !== decision.decision) throw new Error('Decision is immutable; conflicting decision requires manual investigation');
    if (decision.decision === 'Rejected') {
      if (lead.reviewStatus !== 'Rejected') {
        lead.reviewStatus = 'Rejected'; store.saveLead(lead);
        store.audit('review_rejected', lead.id, 'rejected', 'reviewer', { reviewer: decision.reviewer });
        await this.intake.sync(lead);
      }
      return { lead: store.getLead(lead.id)!, operation: undefined };
    }
    const action = lead.triage?.recommendedAction;
    if (!lead.triage || lead.triage.confidence < this.intake.threshold || lead.reviewStatus === 'Needs manual review' || !['create_internal_followup', 'propose_opportunity'].includes(action ?? '')) throw new Error('Proposal is not executable; clarify the enquiry and obtain a validated recommendation first');
    let operation = store.operation(lead.id);
    if (operation?.status === 'Completed') {
      // A status-column sync may have failed after the action completed. Only retry the sync.
      if (lead.syncStatus === 'Pending sync') await this.intake.sync(lead);
      return { lead: store.getLead(lead.id)!, operation };
    }
    store.transaction(() => {
      if (lead.reviewStatus !== 'Approved') {
        lead.reviewStatus = 'Approved'; store.saveLead(lead);
        store.audit('review_approved', lead.id, 'approved', 'reviewer', { reviewer: decision.reviewer });
      }
      if (!operation) {
        operation = { schemaVersion: 1, id: randomUUID(), leadId: lead.id, decisionId: `${lead.id}:approved:v1`, action: action as Operation['action'], status: 'Pending', createdAt: new Date().toISOString() };
        store.saveOperation(operation);
      }
    });
    const op = operation!;
    try {
      op.mondayItemId = await crm.execute(lead, op); op.status = 'Completed'; lead.executionStatus = 'Completed';
      if (op.action === 'propose_opportunity') store.saveOpportunity({ schemaVersion: 1, id: op.id, leadId: lead.id, accountId: lead.accountId, status: 'Proposed', mondayItemId: op.mondayItemId });
      store.saveOperation(op); store.saveLead(lead); store.audit('internal_action_completed', lead.id, 'completed', 'system', { action: op.action, decisionId: op.decisionId });
    } catch {
      op.status = 'Failed'; lead.executionStatus = 'Failed'; lead.syncStatus = 'Pending sync';
      store.saveOperation(op); store.saveLead(lead); store.audit('internal_action_failed', lead.id, 'failed', 'system', { decisionId: op.decisionId, reason: 'Pending sync; reconcile journal before retry' });
    }
    await this.intake.sync(lead);
    return { lead: store.getLead(lead.id)!, operation: store.operation(lead.id) };
  }
  async syncReviews() {
    const events = await this.intake.crm.reviewStatuses(); const results = [];
    for (const event of events) {
      if (!['Approved', 'Rejected'].includes(event.status)) continue;
      const lead = this.intake.store.leads().find(l => l.mondayItemId === event.itemId);
      if (!lead) continue;
      try { results.push(await this.decide({ leadId: lead.id, decision: event.status, reviewer: 'monday-review-status-poll' })); }
      catch { this.intake.store.audit('review_sync_blocked', lead.id, 'failed', 'system', { reason: 'Invalid, conflicting or non-executable approval' }); }
    }
    return results;
  }
  async retryLead(lead: Lead) {
    if (lead.reviewStatus === 'Approved') return this.decide({ leadId: lead.id, decision: 'Approved', reviewer: 'local-demo-reviewer' });
    await this.intake.sync(lead); return { lead: this.intake.store.getLead(lead.id)!, operation: undefined };
  }
}
