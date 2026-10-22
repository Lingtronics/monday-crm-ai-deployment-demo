import Fastify from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { IntakeWorkflow } from '../workflows/intake.js';
export function createServer(workflow: IntakeWorkflow, apiKey: string) {
  if (apiKey.length < 16) throw new Error('DEMO_API_KEY must contain at least 16 characters');
  const app = Fastify({ logger: false, bodyLimit: 8192 });
  app.addHook('preHandler', async (request, reply) => {
    if (request.method === 'GET') return;
    const raw = request.headers['x-demo-api-key']; const supplied = typeof raw === 'string' ? Buffer.from(raw) : Buffer.alloc(0); const expected = Buffer.from(apiKey);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return reply.code(401).send({ error: 'Unauthorised' });
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) return reply.code(400).send({ error: 'Invalid synthetic input', fields: error.issues.map(i => i.path.join('.')) });
    const code = z.object({ statusCode: z.number() }).safeParse(error);
    const status = code.success && code.data.statusCode >= 400 && code.data.statusCode < 500 ? code.data.statusCode : 500;
    return reply.code(status).send({ error: status === 413 ? 'Payload too large' : 'Request failed; inspect local status and audit' });
  });
  app.get('/health', async () => ({ status: 'ok', mode: workflow.crm.mode, liveMondayVerified: false }));
  app.get('/api/metrics', async () => workflow.metrics());
  app.post('/api/leads/intake', async (request, reply) => { const result = await workflow.intake(request.body); return reply.code(result.status === 'created' ? 201 : 200).send(result); });
  return app;
}
