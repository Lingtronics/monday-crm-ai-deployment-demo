import { it, expect } from 'vitest';
import { Store } from '../src/persistence/db.js';
import { MockClient } from '../src/crm/mock-client.js';
import { IntakeWorkflow } from '../src/workflows/intake.js';
import { createServer } from '../src/http/server.js';
const input = { externalId: 'api-test', fullName: 'API Demo', workEmail: 'api@example.com', companyName: 'Synthetic', source: 'manual', message: 'A demo please' };
it('requires key, validates bodies, computes counts and limits payloads', async () => {
  const store = new Store(); const app = createServer(new IntakeWorkflow(store, new MockClient()), 'test-key-123456789');
  expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
  expect((await app.inject({ method: 'POST', url: '/api/leads/intake', payload: input })).statusCode).toBe(401);
  const headers = { 'x-demo-api-key': 'test-key-123456789' };
  expect((await app.inject({ method: 'POST', url: '/api/leads/intake', headers, payload: input })).statusCode).toBe(201);
  expect((await app.inject({ method: 'POST', url: '/api/leads/intake', headers, payload: { ...input, message: '' } })).statusCode).toBe(400);
  expect((await app.inject({ method: 'POST', url: '/api/leads/intake', headers, payload: { ...input, message: 'x'.repeat(9000) } })).statusCode).toBe(413);
  expect((await app.inject('/api/metrics')).json().leadCount).toBe(1);
  await app.close(); store.close();
});
it('serves a real loopback HTTP request without exposing lead text in metrics', async () => {
  const store = new Store(); const app = createServer(new IntakeWorkflow(store, new MockClient()), 'test-key-123456789');
  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    expect((await fetch(`${address}/health`)).status).toBe(200);
    const r = await fetch(`${address}/api/leads/intake`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Demo-Api-Key': 'test-key-123456789' }, body: JSON.stringify(input) });
    expect(r.status).toBe(201);
    const metrics = await (await fetch(`${address}/api/metrics`)).json(); expect(metrics.leadCount).toBe(1); expect(JSON.stringify(metrics)).not.toContain(input.message);
  } finally { await app.close(); store.close(); }
});
