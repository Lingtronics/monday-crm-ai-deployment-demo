# Exactly five minutes — panel walkthrough

This is a **portfolio demonstration using synthetic data**. Default: **offline Mode C, deterministic fixture rules, no real AI inference**. Have this guide, CLIENT_BRIEF, process diagram, EVALUATION_REPORT and CLIENT_HANDOVER ready. Install dependencies in advance; run `pnpm eval` before the panel. No account login, purchase or live integration is needed.

| Time | Presenter action | Observable outcome |
|---|---|---|
| 0:00–0:45 | Explain fictional Northstar inbox problem; show current/future process and Plan B relationships. State verification limits. | Clear business problem, three-board design and human responsibility |
| 0:45–1:45 | Run `pnpm demo:offline`; show output step 1 and later table. Explain Lead UUID and Account relation in persistent SQLite. | Synthetic lead accepted, High suggestion, Pending review before approval |
| 1:45–2:30 | Point to demo step 2; inspect the assertion-driven replay/duplicate flow in src/scripts/demo-offline.ts if asked. | Same external ID and case-variant email result in one logical lead; audit records suppression |
| 2:30–3:30 | Show recommendation and validated source-snippet count. Explain fixture behaviour and real-provider boundary. Show Approved versus Completed and injected lead Needs manual review. | Review and execution are separate; unsafe/low-confidence recommendations cannot execute |
| 3:30–4:15 | Show step 4, one completed operation, rejected lead Not started. Explain replay after restart from durability/adapter tests. | Approved twice produces one internal work instruction; rejection produces zero |
| 4:15–5:00 | Show audit event names, computed metrics and evaluation report; open handover and capability matrix. | Measured fixture results, transparent live gaps and a usable operating guide |

The one-command demo runs decisions as a scripted **local human-review simulation**. It is automated evidence of the approval gate, not evidence that a person clicked monday in this delivery. For a hands-on variation within the same timing, use a fresh local database and prepare two terminals before starting:

```powershell
$env:MODE='mock'
$env:LLM_PROVIDER='fixture'
$env:DATABASE_PATH = ".local/panel-$([guid]::NewGuid()).sqlite"
pnpm intake lead-01
pnpm intake lead-01
pnpm intake email-duplicate
pnpm status
pnpm approve lead-01
pnpm approve lead-01
pnpm intake lead-02
pnpm reject lead-02
pnpm status
```

Pause after intake to let the panel inspect Pending review. The operator's explicit `approve` command is the human action in this variation. In a later verified live demo, substitute the real monday Review Status change and `pnpm sync:approvals --execute`, then show the unique internal Lead update. Do not show a fabricated board screenshot. Native automation/Make/real AI should be presented only if the corresponding live checklist has actually passed.
