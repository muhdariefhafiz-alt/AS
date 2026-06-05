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
