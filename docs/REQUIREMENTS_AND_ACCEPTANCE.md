# Requirements and acceptance evidence

The delivered acceptance scope is **Mode C**. Live portions remain conditional, not accepted as tested.

| AC | Requirement | Evidence / status |
|---|---|---|
| 01 | Valid lead intake | workflow/api tests + demo; live unverified |
| 02 | externalId replay | workflow/durability tests; same logical lead |
| 03 | exact email dedup | workflow tests + demo; alias and audit |
| 04 | typed recommendation/manual fallback | triage tests: malformed/extra keys/evidence/confidence |
| 05 | untrusted input has no authority | triage/approval tests; provider has no tools |
| 06 | explicit human approval | approval tests: no action before review; rejection none |
| 07 | exactly one follow-up | concurrent replay/restart tests; unique operation and marker |
| 08 | schema/permission/GraphQL failures | monday-client/monday-contract tests; intercepted only |
| 09 | bounded retry/reconcile | rate hint/network tests; timeout-after-commit and unresolved restart |
| 10 | required commands | BUILD_LOG final run: lint/typecheck/test/demo/eval |
| 11 | honest documentation | README, CAPABILITIES, MONDAY_SETUP, MAKE_SETUP, DEMO_SCRIPT |
| 12 | no secrets/real data/outreach/unsafe boards | synthetic schemas; no outbound channel; allowlist/gate/redaction tests |

P0 is executable: intake, durable deduplication, fixture triage, approval/rejection, mock CRM, tests, client brief and demo script. P1 code includes guarded provisioning/discovery, mapping, API adapter, contacts, conditional relation linking and review polling. P1 live acceptance requires a user-owned sandbox and the manual smoke sequence. P2 Make/native workflow and real inference are documented/configurable; no successful live run is claimed.

Evaluation covers 14 labelled valid enquiries; invalid email, missing email, excessive length, case duplicates and prompt injection are separate regression fixtures. See EVALUATION_REPORT and evaluation-results.json for actual measurements. The dataset and rules are deliberately simple; regression correctness is not a model benchmark or production impact measurement.
