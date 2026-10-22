import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Account, Audit, Lead, Operation, Opportunity } from '../domain/types.js';
import { AuditEvent } from '../domain/schemas.js';

export class Store {
  readonly db: DatabaseSync;
  constructor(path = ':memory:') {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS leads(id TEXT PRIMARY KEY, external_id TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS aliases(external_id TEXT PRIMARY KEY, lead_id TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, domain TEXT UNIQUE, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS operations(id TEXT PRIMARY KEY, lead_id TEXT UNIQUE NOT NULL, decision_id TEXT UNIQUE NOT NULL, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS writes(key TEXT PRIMARY KEY, result TEXT);
      CREATE TABLE IF NOT EXISTS mock_items(key TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS opportunities(id TEXT PRIMARY KEY, lead_id TEXT UNIQUE NOT NULL, body TEXT NOT NULL);
    `);
  }
  transaction<T>(fn: () => T): T { this.db.exec('BEGIN IMMEDIATE'); try { const r = fn(); this.db.exec('COMMIT'); return r; } catch (e) { this.db.exec('ROLLBACK'); throw e; } }
  private decode<T>(row: unknown): T | undefined { return row ? JSON.parse((row as { body: string }).body) as T : undefined; }
  getLead(id: string) { return this.decode<Lead>(this.db.prepare('SELECT body FROM leads WHERE id=?').get(id)); }
  byExternal(id: string) { return this.decode<Lead>(this.db.prepare('SELECT body FROM leads WHERE external_id=? OR id=(SELECT lead_id FROM aliases WHERE external_id=?)').get(id, id)); }
  byEmail(email: string) { return this.decode<Lead>(this.db.prepare('SELECT body FROM leads WHERE email=?').get(email)); }
  leads() { return this.db.prepare('SELECT body FROM leads ORDER BY rowid').all().map(r => this.decode<Lead>(r)!); }
  insertLead(l: Lead) { this.db.prepare('INSERT INTO leads VALUES(?,?,?,?)').run(l.id, l.externalId, l.workEmail, JSON.stringify(l)); }
  saveLead(l: Lead) { this.db.prepare('UPDATE leads SET body=? WHERE id=?').run(JSON.stringify(l), l.id); }
  alias(externalId: string, leadId: string) { this.db.prepare('INSERT OR IGNORE INTO aliases VALUES(?,?)').run(externalId, leadId); }
  account(name: string, domain?: string): Account {
    const old = domain ? this.decode<Account>(this.db.prepare('SELECT body FROM accounts WHERE domain=?').get(domain)) : undefined;
    if (old) return old;
    const now = new Date().toISOString();
    const a: Account = { schemaVersion: 1, id: randomUUID(), name, normalisedDomain: domain, createdAt: now, updatedAt: now };
    this.db.prepare('INSERT INTO accounts VALUES(?,?,?)').run(a.id, domain ?? null, JSON.stringify(a)); return a;
  }
  accounts() { return this.db.prepare('SELECT body FROM accounts ORDER BY rowid').all().map(r => this.decode<Account>(r)!); }
  operation(leadId: string) { return this.decode<Operation>(this.db.prepare('SELECT body FROM operations WHERE lead_id=?').get(leadId)); }
  saveOperation(o: Operation) { this.db.prepare('INSERT INTO operations VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(o.id, o.leadId, o.decisionId, JSON.stringify(o)); }
  operations() { return this.db.prepare('SELECT body FROM operations ORDER BY rowid').all().map(r => this.decode<Operation>(r)!); }
  saveOpportunity(o: Opportunity) { this.db.prepare('INSERT INTO opportunities VALUES(?,?,?) ON CONFLICT(lead_id) DO NOTHING').run(o.id, o.leadId, JSON.stringify(o)); }
  opportunities() { return this.db.prepare('SELECT body FROM opportunities ORDER BY rowid').all().map(r => this.decode<Opportunity>(r)!); }
  audit(type: string, entityId: string, outcome: string, actor: 'system' | 'reviewer' = 'system', details: Audit['details'] = {}, correlationId = randomUUID()) {
    const event = AuditEvent.parse({ schemaVersion: 1, eventId: randomUUID(), eventType: type, entityId, actor, createdAt: new Date().toISOString(), correlationId, details, outcome });
    this.db.prepare('INSERT INTO audit VALUES(?,?)').run(event.eventId, JSON.stringify(event));
  }
  audits() { return this.db.prepare('SELECT body FROM audit ORDER BY rowid').all().map(r => this.decode<Audit>(r)!); }
  close() { this.db.close(); }
}
