# Evaluation report

Provider: **fixture**. Real model inference: **false**. 14 independently labelled synthetic cases; labels are never read by the classifier.

| Measure | Correct / cases |
|---|---|
| Intent | 14 / 14 |
| Priority | 14 / 14 |
| Manual-review flag | 14 / 14 |

No classification mismatches in this fixture run.

- lead-01: sales → sales; priority correct=true; manual flag correct=true
- lead-02: sales → sales; priority correct=true; manual flag correct=true
- lead-03: support → support; priority correct=true; manual flag correct=true
- lead-04: partnership → partnership; priority correct=true; manual flag correct=true
- lead-05: other → other; priority correct=true; manual flag correct=true
- lead-06: sales → sales; priority correct=true; manual flag correct=true
- lead-07: support → support; priority correct=true; manual flag correct=true
- lead-08: partnership → partnership; priority correct=true; manual flag correct=true
- lead-09: sales → sales; priority correct=true; manual flag correct=true
- lead-10: other → other; priority correct=true; manual flag correct=true
- lead-11: other → other; priority correct=true; manual flag correct=true
- lead-12: sales → sales; priority correct=true; manual flag correct=true
- lead-13: other → other; priority correct=true; manual flag correct=true
- lead-14: sales → sales; priority correct=true; manual flag correct=true

These are deterministic fixture regression results, not measured LLM quality, operational time savings or production outcomes. A small deliberately simple dataset cannot establish generalisation or prompt-injection immunity. Validation and action allowlists, absence of tools, human approval and sandbox gates provide the execution boundary. Three invalid inputs and duplicate cases are covered separately by workflow/API tests.

Run pnpm eval to regenerate; a real provider requires explicit local consent and authorised configuration. Inspect docs/evaluation-results.json for per-case evidence and confusion pairs. No real model was exercised during delivery.
