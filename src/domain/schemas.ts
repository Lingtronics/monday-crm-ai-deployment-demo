import { z } from 'zod';

export const Email = z.string().trim().toLowerCase().email().refine(v => v.endsWith('@example.com'), 'Synthetic example.com email required');
export const LeadIntake = z.object({
  externalId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  fullName: z.string().trim().min(1).max(100), workEmail: Email,
  companyName: z.string().trim().min(1).max(100),
  companyDomain: z.string().trim().toLowerCase().regex(/^(?:[a-z0-9-]+\.)*example\.com$/).optional(),
  source: z.enum(['webform', 'webinar', 'referral', 'manual']),
  message: z.string().trim().min(1).max(2000),
}).strict();
export const ProposedAction = z.enum(['create_internal_followup', 'propose_opportunity', 'request_clarification', 'none']);
export const TriageResult = z.object({
  intent: z.enum(['sales', 'support', 'partnership', 'other']),
  priority: z.enum(['High', 'Medium', 'Low', 'Unknown']),
  summary: z.string().min(1).max(250), rationale: z.string().min(1).max(300),
  confidence: z.number().min(0).max(1), recommendedAction: ProposedAction,
  evidence: z.array(z.string().min(1).max(120)).min(1).max(3),
}).strict();
export const ApprovalDecision = z.object({ leadId: z.string().uuid(), decision: z.enum(['Approved', 'Rejected']), reviewer: z.string().min(1).max(100) }).strict();
export const AuditEvent = z.object({ schemaVersion: z.literal(1), eventId: z.string().uuid(), eventType: z.string(), entityId: z.string(), externalId: z.string().optional(), actor: z.enum(['system', 'reviewer']), createdAt: z.string().datetime(), correlationId: z.string().uuid(), details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])), outcome: z.string() }).strict();
