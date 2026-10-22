import type { Lead, Operation } from '../domain/types.js';
export interface CrmPort {
  readonly mode: 'mock' | 'monday';
  syncLead(lead: Lead): Promise<string>;
  execute(lead: Lead, operation: Operation): Promise<string>;
  reviewStatuses(): Promise<Array<{ itemId: string; status: string }>>;
}
