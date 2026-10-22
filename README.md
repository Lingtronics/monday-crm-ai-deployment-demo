# Northstar Systems — CRM lead-to-opportunity demonstration

A portfolio demonstration using synthetic data for a monday.com Forward Deployed Consultant panel. It implements lead intake, exact duplicate suppression, structured recommendations, explicit human review and one auditable internal follow-up. The fictional client is a B2B services provider; no customer data or communications are used.

**Delivery status: offline Mode C verified. `LIVE_MONDAY_VERIFIED=false`. No actual AI model, Make scenario or native monday workflow was exercised.** The monday adapter is covered by intercepted fetch tests; that does not establish live compatibility or account entitlement.

Prerequisites: Node.js 24 LTS and pnpm 11.25.0. From this directory:

```powershell
pnpm install --frozen-lockfile
pnpm demo:offline
```

After dependencies are installed, `pnpm demo:offline` is the single demo command. It forces mock + fixture mode regardless of environment, creates an isolated SQLite database in `.local`, and asserts intake, two forms of deduplication, human approval, replay, rejection, injection blocking and validation. It displays separate review/execution statuses and computed metrics. It writes `.local/last-demo.json` with the evidence database location. No services or credentials required. The [five-minute script](docs/DEMO_SCRIPT.md) includes a hands-on CLI variation.

| Capability | Implemented | Personally verified |
|---|---|---|
| Offline SQLite workflow + mock CRM | yes | end-to-end demo and automated tests |
| Fixture classifier | yes, deterministic rules | 14 labelled cases; no real inference |
| Local authenticated HTTP intake | yes | Fastify injection tests and loopback smoke |
| monday setup / adapter / polling | yes, gated | intercepted transport contracts only |
| monday board relations / Plan A contacts | conditional adapter + manual configuration | no live account |
| Compatible model provider | consent gated | failure/validation tests only |
| Make / native monday automation | documented manual scenario | unverified, accounts/features absent |

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm eval
pnpm setup:monday --dry-run
pnpm seed --dry-run
pnpm sync:approvals
```

`pnpm eval` regenerates [measured results](docs/EVALUATION_REPORT.md) and machine-readable [per-case results](docs/evaluation-results.json). With fixture mode these are regression results, never AI accuracy or business ROI. `pnpm test` uses one worker to fit this Windows environment. Node's built-in SQLite is used; no containers or native database package build is needed. The lockfile pins dependency resolution. A dependency-install warning notes ESLint 9 end-of-support; upgrading the lint toolchain is a maintenance follow-up.

For persistent hands-on operation, copy the placeholder configuration, supply a local API key, then run the server. `.env` is loaded automatically and is ignored by version control; existing shell environment takes precedence.

```powershell
Copy-Item .env.example .env
$env:DEMO_API_KEY = 'local-demo-key-change-me'
pnpm start
```

In a second terminal, use the local CLI (operator access is the approval boundary):

```powershell
pnpm intake lead-01
pnpm intake email-duplicate
pnpm approve lead-01
pnpm approve lead-01
pnpm intake lead-02
pnpm reject lead-02
pnpm status
```

The API binds to `127.0.0.1:3000`. POST `/api/leads/intake` requires `X-Demo-Api-Key` of at least 16 characters configured at startup; GET `/health` and `/api/metrics` expose no lead text. The CLI reads fixtures by external ID. API leads must use example.com emails and optional example.com subdomains; names/messages must also be synthetic. A domain allowlist is a guardrail, not proof that arbitrary content is synthetic.

```powershell
$headers = @{ 'X-Demo-Api-Key' = 'local-demo-key-change-me' }
$payload = @{ externalId='http-demo'; fullName='Demo Person'; workEmail='http@example.com'; companyName='Synthetic Company'; source='manual'; message='Please share demo pricing this week.' } | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:3000/api/leads/intake -Method Post -Headers $headers -ContentType 'application/json' -Body $payload
Invoke-RestMethod -Uri http://127.0.0.1:3000/api/metrics
```

For live setup follow [MONDAY_SETUP](docs/MONDAY_SETUP.md), then [MAKE_SETUP](docs/MAKE_SETUP.md) only if already entitled. Do not set write flags before discovery. No public deployment, tunnel, account creation, purchase or model usage was performed. The default server has no unauthenticated webhook endpoint.

Architecture: validated intake → SQLite uniqueness + account relation → fixture/optional model → schema and evidence checks → pending review → human decision → durable operation → CRM internal update → audit. monday stage is set to New only on initial creation; AI never advances stage, assigns a real owner or sends outreach. Uncertain creates are reconciled using markers and a persistent write journal; unresolved outcomes block reissue. See [architecture](docs/ARCHITECTURE.md) and [handover](docs/CLIENT_HANDOVER.md).

Evidence checklist for the panel:

- Capture the actual terminal demo, separate statuses, one operation and audit events; label **offline / synthetic / fixture rules**.
- Show the generated evaluation report and tests; do not substitute these for a live board screenshot.
- If later connected, capture actual sandbox board IDs, configured relations, a synthetic Lead and Account, manual review change and exactly one internal update after replay. Redact tokens and unrelated account details.
- Capture a Make successful-run bundle and native automation run only after actually executing them. Until then, show the manual guide labelled unverified.

Start with [client brief](docs/CLIENT_BRIEF.md), [process](docs/CURRENT_AND_FUTURE_PROCESS.md), [acceptance evidence](docs/REQUIREMENTS_AND_ACCEPTANCE.md), [capabilities](docs/CAPABILITIES.md) and [BUILD_LOG](BUILD_LOG.md). [CV bullets](docs/CV_BULLETS.md) describe only the work actually delivered.
