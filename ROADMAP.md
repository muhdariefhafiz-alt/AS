# FairComparisons SG — Roadmap (milestone-gated)

Features here are deliberately deferred until a trigger condition is met. Building
them before the trigger wastes effort (e.g. Exchange needs agent density to have
any referral volume). Format: **When `<trigger>` → then `<build>`.**

Reference model throughout: **GetAgent.co.uk** ("whatever GetAgent does is the
path"). Pure success-fee, rankings cannot be bought, performance-data moat.

---

## ✅ Done (live in production)

- Seller funnel: `/sell` → shortlist → invite → quotes → pick → completion → PayNow invoice
- AgentScore directory (30,740 agents, 730k transactions, 28 districts, 27 HDB towns)
- MOP tracker, AVM valuation (range), sell-by-area SEO (55 pages)
- AI Discovery Protocol (`/ai/*.json` + llms.txt)
- Admin: invoices, funnel/liquidity/revenue analytics, dunning, reconciliation
- Reviews: verified-completion + open (email double-opt-in, anti-spam)
- Monetisation: pure success-fee, paid-placement removed (rankings can't be bought)
- Funnel instrumented from `view_form` → `paid`

---

## 🎯 Milestone triggers

### M1 — First paying completion
**Trigger:** A real seller completes a sale through the funnel and the 0.5% fee is collected.
**Then:**
- Validate unit economics against the model (CAC, close rate, fee per deal)
- Turn the first verified completion into a case study (with consent; no fake data)
- Confirm the self-serve conversion bet (P0-B) with real drop-off numbers from `/admin?tab=funnel`

### M2 — Notifications live
**Trigger:** Klaviyo flows + Meta WhatsApp templates approved and firing.
**Then:**
- Turn on the retention loops (MOP alerts, AVM updates, review requests, reactivation)
- The funnel stops being "records only" and starts nudging

### M3 — ~100 claimed agents with contact details
**Trigger:** 100+ agents have claimed their profile.
**Then:**
- Begin agency-partner outreach (PropNex/ERA/Huttons "featured lead source")
- Launch the agent league-table newsletter (retention loop for agents)

### M4 — ~500 active agents
**Trigger:** 500+ agents engaging (claimed + receiving leads).
**Then build → AgentMatch Exchange (cross-referral):**
- Agent A refers an out-of-area lead → platform routes to top-ranked Agent B in that area
- **Fee split locked at 50/50** (GetAgent's exact model: referrer earns 50% of the platform fee)
- WhatsApp-integrated routing (`agent_referral` template)
- New table `sg_lead_referrals`; dashboard tab for incoming/outgoing referrals
- *Why gated:* Exchange needs density to have referral volume — useless below ~500 agents

### M5 — Sellers already on-market want help
**Trigger:** Demand signal that sellers want listing-performance feedback (e.g. repeated support requests, or post-completion data showing slow listings).
**Then build → Listing Monitor:**
- **Data source locked: own `sg_listings` data** (days-on-market). NOT PropertyGuru/99.co scraping (their ToS forbids it, and GetAgent uses rights-cleared data, not scraping)
- After ~30 days no-offer: "could another agent sell this faster?" → routes back into `/sell`
- Optional future enrichment: agent-forwarded listing analytics (with consent)

### M6 — Proven SG model, ready to scale
**Trigger:** Sustained completions + positive unit economics + a cash bridge.
**Then:**
- Series A raise (the GetAgent path needed ~$8M over time; this is the bridge for the success-fee revenue lag)
- Consider Malaysia (KL) expansion on LHDN + NAPIC data (analogous to CEA + HDB/URA)

---

## 📌 Standing product decisions (GetAgent-aligned)

### Discount / hybrid agents — EXCLUDE from the comparison
**Decision (per GetAgent model):** GetAgent deliberately does **not** compare
online/discount agents (Purplebricks, Yopa). Rationale: with discount/DIY models
the homeowner does much of the work, so "agent performance" can't be cleanly
isolated — and it dilutes the "performance justifies the fee" narrative.

**SG application:** Do not position against or fold the DIY/hybrid players
(**Propseller**'s salaried-agent agency, **Ohmyhome**'s DIY/budget hybrid) into
the performance comparison. FairComparisons compares **full-service, full-commission
CEA agents on transaction performance.** That is the lane.

**Implementation note (light, do when relevant):** Propseller/Ohmyhome agents are
CEA-registered and will appear in the raw `sg_agents` data. If/when their presence
distorts the comparison, add an `excluded_model` flag on agencies of the
discount/DIY type and filter them from the ranked listings + shortlist matching.
Until there's evidence of distortion, no action needed — just hold the positioning
line in copy (don't market against them, don't include them in "best agent" claims).

### Rankings cannot be bought — PERMANENT
No paid placement, no sponsored slots, no tier-based reordering. Ever. This is the
moat. (Enforced: tier re-sort + sponsored badges removed Jun 2026.)

### Reviews are the durable moat, not the data
CEA data is public/commodity — a competitor can rebuild it. The defensible asset
is the verified-completion review corpus + brand trust. Prioritise getting reviews
flowing (verified-completion + email-verified open reviews, both live) over new
features.

---

## ❄️ Explicitly deferred (do NOT build yet)

- Native mobile app (web-first matches GetAgent; no proven need)
- Multi-language UI (English is SG property lingua franca)
- Premium agent subscription as a primary line (success-fee is the spine; paid tier
  survives only as optional non-ranking tools)
- Community forum (GetAgent has one, but it's late-stage; not before density)
- Full Sentry SDK (shim exists at `app/lib/observe.ts`; wire when error volume justifies)

---

## ⚠️ Unverified paths (found 2026-08-06, close these before trusting the funnel)

These are shipped features whose critical path has never actually been exercised.
Each one is a silent-failure risk, not a build item.

### Payment completion is UNVERIFIED (this gates M1)
A checkout has been *started* on the live path (a real Stripe customer was created
2026-07-27), but **no payment has ever completed**, so the webhook and the tier
unlock are unproven. M1's trigger is "a real seller completes and the fee is
collected", and we do not yet know that money can actually land.
**Close it:** one live-mode purchase on a hidden sandbox agent, then refund.

### M2's trigger is stale: Klaviyo flows will never fire
M2 above is gated on "Klaviyo flows firing". They cannot. `app/lib/email.ts`
short-circuits to Resend whenever `RESEND_API_KEY` is set, which it is in
production, so Klaviyo is never called. Its 5 Live flows show 0 deliveries over
30 days while claim-verification mail was in fact being delivered by Resend.
**Two hazards:** (1) the Klaviyo fallback is still reachable, so if the Resend key
is ever rotated or removed, mail silently reverts to a provider whose per-metric
flows drop anything without a matching Flow (this previously broke admin login,
claim verification and agent invites); (2) `KLAVIYO_API_KEY` is still in prod env.
**Close it:** make `sendEmail` fail loudly instead of falling back, drop the key,
pause the flows, and restate M2's trigger in terms of Resend + WhatsApp.

### AI reply drafter: live 3 weeks, never once used
Zero `inbox_draft_generated` events since `ANTHROPIC_API_KEY` was set. The key
itself is unverifiable from outside (Sensitive var), so the first real click is
still the only proof the path works.

### Calendar grounding is inert
The drafter proposes real viewing windows when an agent has a connected calendar,
but nothing writes `sg_agent_calendar` (0 rows), `GOOGLE_CLIENT_ID/SECRET` are
absent from prod, and no connect-calendar UI exists. It fails closed to tentative
suggestions, which is correct, but Tier 2 is not live despite the Jul 2026 OAuth
approval.

---

## 🔴 Standing legal exposure (address before more public-profile surfaces)

### The controller is EU-established, so GDPR applies to everything
`app/privacy/page.tsx` states the controller is registered in the Netherlands and
not in Singapore. An EU-established controller sits inside **GDPR Art 3(1) for all
of its processing**, regardless of where the data subjects are. So the 38,110
involuntary agent profiles and their derived AgentScores are GDPR personal data,
not only PDPA personal data: Art 21 objection, Art 17 erasure, Art 5(1)(d)
accuracy, an Art 14 indirect-collection duty, and a free complaint route to the
Dutch AP that any annoyed agent can use from a phone.

Compounding it: the German BGH *Jameda* ruling (VI ZR 30/17) stripped the
neutral-intermediary defence from a rating portal that gave **paying subscribers
advantages over the non-paying individuals it profiled**. Any paid tier that
changes how a profiled third party appears walks into that precedent. The existing
"rankings cannot be bought" decision above is the thing that keeps us clear of it,
which makes that decision a legal safeguard and not only a positioning one.

**Minimum before the next public surface that names agents:** designate a DPO and
publish a role mailbox, file a one-page legitimate-interests assessment plus an
Art 14(5)(b) disproportionate-effort record, and ship an objection route that
suppresses evaluative derivations while keeping the factual register entry. If the
only answer to an objection is deletion, completeness dies one agent at a time.
(First removal request already received and honoured 2026-07-30 via
`sg_agents.is_hidden`.)
