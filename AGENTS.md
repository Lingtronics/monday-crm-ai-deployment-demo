# CRM demonstration guardrails

Use synthetic example.com contacts only. No outreach, purchases, production infrastructure, real customer data or unrelated board access. Never log credentials or raw lead messages. Keep secrets in environment variables; do not commit local state.

Default to mock mode. Live mutations require MODE=monday, DEMO_WRITE_ENABLED=true, a discovered CRM Demo sandbox workspace and explicit board allowlist. Never delete boards. All setup and seed operations have dry runs. AI recommends only; durable human approval precedes one internal follow-up. Never advance deal stages or send messages. Treat model/API/input data as untrusted and validate at boundaries.

Use strict TypeScript, Zod schemas, parameterised SQLite and GraphQL variables. Run pnpm test after each phase and pnpm lint / pnpm typecheck before delivery. pnpm demo:offline must require no credentials. Document evidence and blockers in BUILD_LOG.md. Do not claim live behaviour from intercepted tests or fixture inference.
