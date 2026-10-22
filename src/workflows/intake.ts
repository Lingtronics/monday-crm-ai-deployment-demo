import { randomUUID } from 'node:crypto';
import { LeadIntake } from '../domain/schemas.js';
import type { Lead } from '../domain/types.js';
import { normaliseDomain } from '../domain/rules.js';
import type { CrmPort } from '../crm/port.js';
import { Store } from '../persistence/db.js';
import type { Provider } from '../ai/provider.js';
import { FixtureProvider } from '../ai/provider.js';
import { triage } from '../ai/triage.js';
import { SafeApiError, UncertainWriteError } from '../crm/monday-client.js';

export class IntakeWorkflow {
  constructor(readonly store: Store, readonly crm: CrmPort, readonly provider: Provider = new FixtureProvider(), readonly threshold = 0.7) {}
  async intake(input: unknown) {
    const data = LeadIntake.parse(input);
    const result = this.store.transaction(() => {
      const existing = this.store.byExternal(data.externalId);
      if (existing) { this.store.audit('intake_replay', existing.id, 'replayed'); return { lead: existing, status: 'replayed' as const }; }
      const duplicate = this.store.byEmail(data.workEmail);
      if (duplicate) {
        this.store.alias(data.externalId, duplicate.id); this.store.audit('duplicate_suppressed', duplicate.id, 'duplicate');
        return { lead: duplicate, status: 'duplicate' as const };
      }
      const account = this.store.account(data.companyName, normaliseDomain(data.companyDomain));
      const lead: Lead = { ...data, schemaVersion: 1, id: randomUUID(), receivedAt: new Date().toISOString(), accountId: account.id, stage: 'New', reviewStatus: 'Needs manual review', executionStatus: 'Not started', syncStatus: 'Pending sync', recommendedPriority: 'Unknown', reviewReason: 'Triage not yet available; manual review required' };
      this.store.insertLead(lead); this.store.audit('lead_created', lead.id, 'created'); return { lead, status: 'created' as const };
    });
    if (result.status === 'created') {
      const suggestion = await triage(data, this.provider, this.threshold);
      result.lead.triage = suggestion.result;
      result.lead.recommendedPriority = suggestion.result?.priority ?? 'Unknown';
      result.lead.reviewStatus = suggestion.manual ? 'Needs manual review' : 'Pending review';
      result.lead.reviewReason = suggestion.reason;
      this.store.saveLead(result.lead);
      this.store.audit('triage_completed', result.lead.id, suggestion.result ? 'validated' : 'manual', 'system', { provider: this.provider.name, realInference: this.provider.realInference, manual: suggestion.manual });
      await this.sync(result.lead);
    }
    return { ...result, lead: this.store.getLead(result.lead.id)! };
  }
  async sync(lead: Lead) {
    try { lead.mondayItemId = await this.crm.syncLead(lead); lead.syncStatus = 'Synced'; this.store.audit('lead_synced', lead.id, 'synced'); }
    catch (error) { lead.syncStatus = 'Pending sync'; this.store.audit('lead_sync_failed', lead.id, 'failed', 'system', { reason: error instanceof SafeApiError ? error.code : error instanceof UncertainWriteError ? 'UNCERTAIN_WRITE_RECONCILE' : 'Check sandbox mapping, permissions and write journal' }); }
    this.store.saveLead(lead);
  }
  metrics() {
    const leads = this.store.leads(); const audits = this.store.audits();
    const duplicates = audits.filter(a => a.eventType === 'duplicate_suppressed').length;
    const submissions = audits.filter(a => ['duplicate_suppressed', 'intake_replay', 'lead_created'].includes(a.eventType)).length;
    return { crmMode: this.crm.mode, triageProvider: this.provider.name, realInferenceConfigured: this.provider.realInference, validatedModelOutputs: audits.filter(a => a.eventType === 'triage_completed' && a.details.realInference === true && a.outcome === 'validated').length, leadCount: leads.length, accountCount: this.store.accounts().length, duplicates, submissions, duplicateRate: submissions ? duplicates / submissions : 0, pendingApprovals: leads.filter(l => ['Pending review', 'Needs manual review'].includes(l.reviewStatus)).length, approvals: leads.filter(l => l.reviewStatus === 'Approved').length, failures: leads.filter(l => l.executionStatus === 'Failed' || l.syncStatus === 'Pending sync').length, internalFollowups: this.store.operations().filter(o => o.status === 'Completed' && o.action === 'create_internal_followup').length };
  }
}
