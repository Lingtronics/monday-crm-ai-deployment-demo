# Build log

## Phase 0 — discovery (2026-10-22)
- Read the full supplied specification. Repository contains only that document; no existing AGENTS.md found in workspace or parent directories. No Git repository yet.
- Verified node v24.18.0, npm 11.16.0, pnpm 11.25.0, Python 3.12 available. MONDAY_API_TOKEN and LLM_API_KEY absent (presence checks only).
- Read official monday authentication, versioning, boards, columns, items, pagination, connect boards, webhooks, error handling, rate limits, Free plan and AI agent pages; Make monday app documentation. Sources recorded in docs/CAPABILITIES.md. Pinned 2026-07.
- Safe path: Mode C, local SQLite, deterministic fixture provider. Live monday, real inference, Make and native workflows unverified. No external mutations or model calls authorised/performed.

## Phase 1 — domain and scaffold
- Strict TypeScript, Fastify, Zod, Vitest, ESLint; SQLite from Node 24 avoids native package builds. Schemas reject unexpected keys and restrict synthetic domains.
- Verification pending below.
- pnpm install initially failed on sandbox symlink permissions, then registry DNS; retried with reviewed network access and local store. Dependency download succeeded; explicitly allowed esbuild install script. pnpm install --offline then passed. ESLint 9 dependency emits an end-of-support warning; lockfile retained for reproducibility.
- pnpm typecheck passed; pnpm test passed 4 tests.

## Phase 2 — fixtures and board manifests
- 14 separately labelled leads plus a mixed-case email duplicate and three invalid submissions. Plan A (4 boards) / B (3 boards) manifests, dry-run CLI and write gate added.
- First typecheck caught missing provision module; added fail-closed phase gate before proceeding to adapter.
- pnpm typecheck passed; pnpm test passed 6 tests; pnpm setup:monday --dry-run passed and printed proposed boards/columns without API calls.
- Live provisioning remains unverified: no credentials, workspace or plan evidence.

## Phase 3 — monday adapter
- Added fetch/variables transport, pinned API version, sandbox workspace/board verification, schema checks, cursor pagination, gated setup, generated mapping, allowed column writes and durable write journal.
- Reads retry at most three attempts with backoff/jitter and retry hints. Ambiguous creates reconcile markers; unresolved outcomes stay blocked rather than reissuing creates. Setup reuses discovered boards/columns, never overwrites labels.
- Plan A contact/relation enrichment is conditional and will need account UI confirmation; local SQLite relationships remain the fallback.
- pnpm typecheck passed; pnpm test passed 11 tests (intercepted API only). No live calls performed.

## Phase 4 — intake and HTTP
- Added durable SQLite leads/accounts/aliases/audits, synthetic-only validation, exact-email suppression, authenticated localhost API, computed metrics, body limits and safe errors. Sync failure explicitly records Pending sync.
- First typecheck caught Fastify unknown error typing; corrected with safe parsing. Verification follows.
- pnpm typecheck passed; pnpm test passed 15 tests.

## Phase 5 — recommendation engine
- Fixture classifier explicitly declares realInference=false. Optional compatible provider requires endpoint/model and LLM_NETWORK_CONSENT; remote endpoints also require a key. No network model calls performed.
- Strict JSON schemas, literal evidence validation, bounded fields, unsafe-content rejection and manual fallback. Input filter is a review signal, not a claimed security guarantee.
- pnpm eval: fixture intent 14/14, priority 14/14, manual flag 14/14. These are synthetic regression results, not actual LLM accuracy.
- Corrected eval array typing after typecheck. One test initially failed on a case-sensitive error-text assertion; corrected to case-insensitive consent assertion. Re-running before next phase.
- Phase 5 recheck: pnpm typecheck and all 19 tests passed.

## Phase 6 — human approval
- Added immutable approve/reject decisions, unique durable operation per lead, serialised overlapping approvals, failure recovery, local reviewer CLI and safe polling. Low-confidence/invalid/injected proposals cannot execute.
- Added runnable application, localhost entry point, safe seed dry run, retry/status commands and isolated assertion-driven offline demo.
- Verification results recorded after execution below.

## Phase 7 — conditional integrations
- Supplied Make v2 trigger/details/validated HTTP scenario, response branches, secure connectivity prerequisite, self-trigger prevention and evidence checklist. Native internal flag automation documented; neither configured or exercised.
- Public webhooks intentionally omitted. No accounts, paid features or external communications used.
- Phase 6: pnpm typecheck passed, 23 tests passed, pnpm demo:offline passed all end-to-end assertions. Phase 7: 23 tests, typecheck and lint passed.

## Phase 8 — recovery and quality
- Expanded intercepted API tests to cover timeout-after-commit reconciliation, unresolved writes after restart, board/type/approval guards and cursor pagination. Added SQLite restart/alias/audit tests.
- Follow-ups use one internal Lead update with a unique marker; Opportunities items are reserved for explicitly approved opportunity proposals. Added Account ID column so domain remains real synthetic domain data.
- First expanded test run exhausted Windows sandbox virtual memory while starting parallel esbuild/Vitest workers. Lint, typecheck, demo and evaluation passed in that run; test result was NOT counted as passing. Limited Vitest to one worker and sequential files for this small repository; re-running.
- Sequential test re-run passed all 28 tests across 9 files.

## Phase 9 — handover and portfolio evidence
- Delivered README and all requested client/process/requirements/architecture/setup/Make/evaluation/handover/demo/CV documents. Added read-only live smoke command, automatic local .env loading and exact manual capability/relationship checks.
- CV claims limited to synthetic portfolio delivery and intercepted adapter tests; no live platform, real inference, adoption or ROI claims.
- Added real loopback HTTP smoke and explicit approved-opportunity regression tests. Final verification pending below.

## Final verification and remaining work
- `pnpm install --frozen-lockfile --offline`: passed (already up to date).
- `pnpm lint`: passed; `pnpm typecheck`: passed.
- `pnpm test`: **32 tests passed in 9 files** on final run. Includes real loopback HTTP health/intake/metrics, creation/update adapter contracts, GraphQL errors, rate/network retries, schema/allowlist gates, lost-response reconciliation, unresolved write restart, durable duplicate/approval replay, rejection, opportunity approval and unsafe model output.
- The first loopback smoke attempt failed with Windows sandbox `connect EACCES 127.0.0.1`; re-ran with reviewed loopback networking and passed. No live monday/model requests were involved. Prior worker memory failure is recorded above; single-worker configuration resolved it.
- Final adapter review added remote-email collision blocking before any create, safe error codes in audit and conflicting dry-run/execute flag rejection. Re-ran lint/typecheck and all 32 tests successfully after these changes.
- `pnpm demo:offline`: passed assertions; three synthetic leads, one duplicate suppressed, one approval, one completed internal follow-up, one rejected lead without action, one injection lead blocked, zero sync/execution failures. Review and execution remain separate; all stages New.
- `pnpm eval`: fixture provider, realInference=false; intent **14/14**, priority **14/14**, manual flag **14/14**. No real model benchmark or operational improvement claimed.
- `pnpm seed --dry-run`: 18 input cases, 15 syntactically valid including duplicate, no CRM writes. `pnpm sync:approvals`: dry-run only. `pnpm setup:monday --dry-run`: manifest printed, no network/writes.
- Repository document link check: no broken local links. No TODO/pseudocode/unimplemented markers in delivered source/docs. No `.env` file created. Supplied task document preserved. Directory was not a Git checkout; no commit, push, PR or remote repository was created.

### Actual integration status
`LIVE_MONDAY_VERIFIED=false`; actual AI model exercised=false; Make successful run=false; native monday automation/AI Agent configured=false. No account token, sandbox IDs, plan feature evidence or Make credentials were available. Intercepted tests do not prove live account compatibility.

### Smallest manual route to live evidence
1. Use an existing authorised account; confirm plan/permissions and create/select exactly named synthetic sandbox workspace. Set token locally (never chat), workspace ID and existing demo-board allowlist.
2. Review setup dry run, enable explicit writes, provision/reuse demo boards, save returned board IDs in local env. Configure native relation targets in UI if permitted and rediscover IDs. Contact→Account and Opportunity native links remain manual; SQLite relations work offline.
3. Run read-only smoke, then the documented synthetic intake/dedup/manual-approval/replay/rejection sequence. Capture actual board and internal-update evidence before claiming live success. Reset write flag afterwards.
4. Only if entitled and a secure authorised endpoint already exists, authenticate/configure/test the documented Make scenario/native flag rule. Real inference additionally needs explicit consent and a user-authorised endpoint; do not incur paid usage by default.

### Deliberate scope limits
No outbound messages, real data, purchases, hosting/deployment, webhooks, RAG, SSO, enterprise auth, distributed workers, custom frontend or revenue forecast. No native task subitem is claimed: live follow-up is an internal Lead update with a unique marker. Human stage/owner/customer decisions remain outside automation. Offline fixture results and synthetic counts support only portfolio claims in docs/CV_BULLETS.md.

## GitHub upload preparation — 2026-10-22
- User requested upload to their GitHub account. Verified existing GitHub CLI authentication as Lingtronics; sandbox-only credential check had failed, reviewed network access succeeded.
- Target: private repository Lingtronics/monday-crm-ai-deployment-demo. Name was available at preparation time.
- Scanned 60 project text files for common credential/private-key patterns: no matches. .env, node_modules, .local SQLite state and generated live mapping are excluded by .gitignore.
- Existing build/test evidence above remains unchanged; this step packages the verified project and does not claim new live integration verification.
