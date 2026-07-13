# Unified Inbox (Email + WhatsApp) - product package

A housapp-inspired unified inbox for FairComparisons agents, scoped honestly to
what is buildable and compliant in Singapore. Produced 2026-07-13 from a
multi-agent strategy + feasibility + PRD pipeline (Reforge lenses + adversarial
review).

## The documents

- [STRATEGY.md](STRATEGY.md) - Reforge framing: the job, the wedge, positioning
  vs housapp, growth loops, monetization/packaging, GTM, defensibility.
- [PRD.md](PRD.md) - full build-ready PRD: functional requirements + acceptance
  criteria, Supabase data model, WhatsApp/email architecture, PDPA/CEA/Meta
  compliance, metrics, phasing, rollout. Hardened against 3 adversarial reviews.
- [USER-STORIES.md](USER-STORIES.md) - 13 epics, stories with Gherkin acceptance
  criteria, across solo agent / team lead / seller-buyer / operator.

## The decision in one paragraph

Do NOT build the housapp mirror. In Singapore the agent's day runs on personal
WhatsApp, which has no ingest API; the only route bans the agent's own number
under Meta's 2025-26 enforcement and creates PDPA exposure over their clients.
That premise is dead on arrival. Instead build the FairComparisons-scoped inbox:
one contact-keyed place for every conversation FC already originates or controls
(seller leads, inbound email replies, Planner bookings, and an FC-provisioned
WhatsApp line with opt-in), with the already-built fact-grounded AI drafts turned
on, a relationship timeline, and assignment/labels. Architect for a later Gmail
and two-way-WhatsApp phase, but gate those on proven Phase-1 retention.

## Phasing

- **Phase 0 (committed wedge):** make today's lead inbox win. Turn on the
  fact-grounded AI draft, add money-at-risk sort + SLA aging, add a contact
  spine, instrument Setup/Aha/Habit. ~90% of the value at ~10% of the cost.
- **Phase 1 (gated on Phase-0 retention):** the FC-scoped unified inbox -
  contact entity, multi-source threads, inbound email, relationship timeline,
  assignment/labels, free/paid line.
- **Phase 2 (deferred):** two-way FC WhatsApp on our own WABA (needs Meta ops,
  backlog #39, hard per-account budget cap).
- **Phase 3 (open compliance question):** the agent's own Gmail via restricted
  -scope OAuth (Google CASA assessment; likely descoped).

## North Star

Number of FairComparisons leads that receive a timely first agent reply (within
SLA), sent from the Inbox, per week.

## Key non-negotiables

- Never ingest personal WhatsApp; never auto-send; never let a paid tier change
  ranking; never market "unifies your whole WhatsApp."
- Keep the base inbox, the seller's first reply, and a free draft allowance free
  forever.
