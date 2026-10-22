# Client brief — fictional Northstar Systems

Northstar is a fictional mid-market B2B professional services provider. Website and webinar enquiries arrive in a shared inbox. Sales operations manually copy records, check email duplicates, route enquiries and organise follow-up. The demonstration addresses inconsistent intake and review evidence, without claiming to have measured a real client's workload.

| Actor | Responsibility |
|---|---|
| Sales Operations Reviewer | Inspect recommendation/evidence; explicitly approve or reject |
| Sales Owner | Carry out the internal follow-up after review; no automated outreach |
| Client Administrator | Own sandbox, plan permissions, mappings, credentials and exception queue |

Target outcomes: validated intake, deterministic exact-email deduplication, reviewed recommendations, replay-safe internal action and inspectable audit. Measures implemented: submissions, duplicate count/rate, pending review, approvals, failed/pending synchronisation and completed internal follow-ups. No time saving, adoption, satisfaction or revenue outcome is asserted.

Assumptions: synthetic data only, one local application instance/operator, Node 24, no paid dependencies or hosting, and optional user-owned monday sandbox. Plan A uses four boards; Plan B uses three and keeps contacts in Leads; Mode C stores all relations locally. Actual account privileges are unknown. Evidence is the automated regression suite and executable offline demo.
