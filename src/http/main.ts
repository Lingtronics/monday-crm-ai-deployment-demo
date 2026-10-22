import { createApplication } from '../app.js';
import { createServer } from './server.js';
const runtime = createApplication();
const server = createServer(runtime.intake, runtime.config.DEMO_API_KEY);
server.addHook('onClose', async () => runtime.store.close());
await server.listen({ host: '127.0.0.1', port: 3000 });
console.log('Synthetic CRM intake on http://127.0.0.1:3000; no outbound communications');
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void server.close(); });
