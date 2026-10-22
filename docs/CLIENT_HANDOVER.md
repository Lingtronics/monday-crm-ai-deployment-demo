# Client handover — local synthetic demonstration

Administrator owns the demo workspace, board allowlist/mapping, local API key, SQLite backup and plan checks. Reviewer owns approvals and evidence inspection. Sales owner remains a fictitious unassigned team in this delivery. There is no outbound communications channel.

Daily local operation: run `pnpm intake lead-01` or authenticated POST intake; inspect recommendation/reason, source data in local SQLite and separate review/execution status. Use `pnpm approve lead-01` for an executable proposal or `pnpm reject lead-01`. Use `pnpm status` for audit/metrics. Approval is immutable and repeated commands do not create another action. Clarification/invalid/low-confidence cases remain manual; do not force-edit the database to approve them. Source corrections and requalification need a separately reviewed change; this MVP intentionally has no general record editor.

Live operation after setup: a human changes the mapped Review Status in the real demo board. Run `pnpm sync:approvals` for dry run, then `pnpm sync:approvals --execute` to poll and apply. Polling imports only Approved/Rejected states for locally mapped items; it cannot authenticate the individual who clicked the status, so audit actor is `monday-review-status-poll`, not an invented user identity. Obtain monday activity-log evidence manually if individual attribution is needed. CLI uses `local-demo-reviewer`.

| Symptom | Operator response |
|---|---|
| 400 intake | Fix missing/invalid synthetic fields; keep same externalId for retries |
| 401 | Check X-Demo-Api-Key against local configuration; never remove auth |
| 413 | Keep JSON under 8 KiB and message at most 2,000 characters |
| Needs manual review | Inspect missing evidence, ambiguity, injection signal or provider failure; no execution allowed |
| Failed execution / Pending sync | Inspect sandbox IDs, mapped column types/labels, write flags and token permissions; `pnpm retry:sync lead-01` uses same durable operation |
| Uncertain write | Check marker remotely and retry reconciliation. Never clear `.local` or journal to force a second create. If marker remains absent, stop and investigate using API/account evidence |
| Board/label mismatch | Stop writes; rediscover the exact demo board with setup; do not silently remap by name |
| Rate limit | Honour Retry-After; long waits are surfaced for manual retry rather than blocking indefinitely |
| Conflicting decision | Stop; decisions are immutable. Investigate the review history; do not auto-reverse completed work |

Before changing credentials, schemas or dependencies: stop the server and poller, back up the synthetic SQLite file and generated mapping, run lint/typecheck/tests/demo, then perform the live smoke checklist if connected. `.env`, `.local`, mapping and model secrets remain uncommitted. The SQLite data can contain synthetic message text; routine logs/audits do not. Preserve write journals with their database. Backing up while stopped avoids losing WAL state.

Stop/rollback: Ctrl+C the server; stop any external scenario; set DEMO_WRITE_ENABLED=false and remove local credentials when finished. No delete-board or destructive rollback command is provided. Preserve local database/mapping for reconciliation; manually archive only known demo items in the UI if the account owner later chooses. Never apply cleanup to unrelated boards.

Costs/limits: local mode needs no paid service. Free-plan board/features depend on actual product; trial features may expire. Do not activate trials or spend model/Make credits to complete this demo. Compatible model calls require explicit LLM_NETWORK_CONSENT and local configuration; remote usage can be billable, and none was made here. One local process, synthetic data, no production availability/PII/security/ROI claims. See MONDAY_SETUP and MAKE_SETUP for remaining UI steps.
