# Capability report — 22 October 2026

LIVE_MONDAY_VERIFIED=false

| Capability | Available | Configured | Verified | Blocker |
|---|---|---|---|---|
| Node/pnpm/offline SQLite | yes | yes | install, typecheck, tests and durable restart checked | none |
| Mock CRM / fixture classification | yes | yes | assertion-driven demo; 14 labelled cases | deterministic behaviour, no AI inference |
| Local authenticated HTTP | yes | yes | injection tests and real loopback requests | sandbox needed reviewed loopback permission |
| monday API | adapter only | no | no | no token or sandbox IDs |
| Plan A four boards / relations | account dependent | no | no | plan and permissions unknown |
| Plan B three boards | account dependent | no | no | account limits must be checked |
| OpenAI-compatible model | provider only | no | no | endpoint, consent and credentials absent |
| Make / native automation / AI agents | account dependent | no | no | accounts, privileges and UI setup absent |

Official references checked during discovery (documentation is not account verification):
- [Authentication](https://developer.monday.com/api-reference/docs/authentication): personal tokens inherit user permissions.
- [Versioning](https://developer.monday.com/api-reference/docs/api-versioning): explicitly pin API-Version 2026-07.
- [Boards](https://developer.monday.com/api-reference/reference/boards), [columns](https://developer.monday.com/api-reference/reference/columns), [items](https://developer.monday.com/api-reference/reference/items), [pagination](https://developer.monday.com/api-reference/reference/items-page).
- [Connect boards](https://developer.monday.com/api-reference/reference/connect): configure target boards before linking items; relation availability must be confirmed.
- [Webhooks](https://developer.monday.com/api-reference/reference/webhooks): challenge and retry behaviour; public webhook deliberately omitted.
- [Errors](https://developer.monday.com/api-reference/docs/error-handling): errors can accompany HTTP 200. [Limits](https://developer.monday.com/api-reference/docs/rate-limits): bounded read retries and retry hints needed.
- [Free plan](https://support.monday.com/hc/en-us/articles/360010487220-Understanding-the-Free-Plan): three-board fallback; native automation/integration unavailable. Check the actual product subscription in the account.
- [AI agents](https://support.monday.com/hc/en-us/articles/38411699315346-Build-and-configure-your-AI-agent): do not infer availability from marketing documentation.
- [Make app](https://apps.make.com/monday?v=1): documentation says v1 maintenance has ended; use the current v2 app, confirm module names in account UI.
