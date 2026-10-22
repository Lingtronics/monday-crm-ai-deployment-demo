import { z } from 'zod';
export const leadColumns = {
  workEmail: ['Email', 'email'], companyName: ['Company', 'text'], source: ['Source', 'text'],
  stage: ['Stage', 'status'], priority: ['Suggested Priority', 'status'], summary: ['AI Summary', 'long_text'],
  nextStep: ['AI Next Step', 'long_text'], confidence: ['AI Confidence', 'numbers'], review: ['Review Status', 'status'],
  execution: ['Execution Status', 'status'], externalId: ['External ID', 'text'],
} as const;
export const statusLabels: Record<string, string[]> = { stage: ['New', 'Qualified', 'Nurture', 'Disqualified'], priority: ['High', 'Medium', 'Low', 'Unknown'], review: ['Pending review', 'Approved', 'Rejected', 'Needs manual review'], execution: ['Not started', 'Completed', 'Failed'] };
export function boardDefinitions(plan: 'A' | 'B') {
  return [
    { name: 'CRM Demo | Leads', columns: Object.entries(leadColumns).map(([key, [title, type]]) => ({ key, title, type, labels: statusLabels[key] })) },
    { name: 'CRM Demo | Accounts', columns: [{ key: 'domain', title: 'Domain', type: 'text' }, { key: 'externalId', title: 'Account ID', type: 'text' }] },
    { name: 'CRM Demo | Opportunities', columns: [{ key: 'operationId', title: 'Operation ID', type: 'text' }, { key: 'status', title: 'Status', type: 'text' }] },
    ...(plan === 'A' ? [{ name: 'CRM Demo | Contacts', columns: [{ key: 'email', title: 'Email', type: 'email' }, { key: 'externalId', title: 'Contact ID', type: 'text' }] }] : []),
  ];
}
const Board = z.object({ id: z.string().min(1), name: z.string().startsWith('CRM Demo | '), columns: z.record(z.string(), z.string().min(1)) }).strict();
export const ColumnMap = z.object({ schemaVersion: z.literal(1), workspaceId: z.string().min(1), plan: z.enum(['A', 'B']), boards: z.object({ leads: Board, accounts: Board, opportunities: Board, contacts: Board.optional() }).strict() }).strict();
export type Mapping = z.infer<typeof ColumnMap>;
