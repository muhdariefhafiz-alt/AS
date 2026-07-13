# Unified Inbox - Strategy Memo

## TL;DR

- **Build the FairComparisons-scoped inbox, not the housapp mirror.** In Singapore the agent's day runs on personal/consumer WhatsApp, which has no ingest API; the only route is unofficial automation that gets the *agent's own livelihood number* banned under Meta's 2025-26 crackdown and drags us into PDPA exposure over their clients. That premise is dead on arrival. The honest, ownable surface is every conversation FC *originates or controls*: seller leads, inbound email replies, Planner bookings, and an FC-provisioned WhatsApp line with opt-in.
- **We already ship ~80% of the safe half.** Cloud API wrapper, inbound webhook, opt-in model, Resend outbound, and a fact-grounded/CEA-safe AI draft engine all exist - they are env-gated and inert, not missing. "Shipped" here means code-complete, not live.
- **The one true missing piece is a contact entity.** Today an "inbox item" is a single `sg_lead_shortlist` row from the internal `/sell` funnel; `wa_inbound` events are orphaned; there is no person-level record. A housapp-style timeline is impossible until identity resolution exists. That is the first build, not more channels.
- **The moat is the draft that knows their numbers, plus the record that doesn't leak.** We deliberately do *not* clone the agent's voice; we ground the draft in their real AgentScore/URA/HDB transactions and comps, CEA-safe. That is more defensible than mimicry and safer under advert rules.
- **This is a retention + monetization feature riding the marketplace's unique trigger** - a real seller lead landing - never an acquisition feature. Keep the base inbox, the seller's first reply, and a free draft allowance free forever; monetize draft volume, timeline depth, and channels.

## The Job & the Wedge

**The job is "don't let a lead die," not "organize my contacts."** A solo SG agent hires a unified inbox to *capture and never forget*: leads arrive across WhatsApp, Gmail, and portal DMs, and every dropped follow-up is real commission gone. The emotional job is relief from the low-grade dread of "did I miss someone?" The social job is looking fast and expert to a seller who is actively interviewing three or four agents at once. Nobody is desperate about *storage* - a generic CRM answers "store my relationships." They are desperate about **speed and leakage at the top of the funnel.**

**Why FairComparisons and not a generic CRM.** We own two things no CRM can manufacture:

1. **The lead.** We originate the intent-verified seller enquiry (`sg_leads` → `sg_lead_notifications`). A standalone SaaS inbox has no reason to ping the agent; the agent must remember to open it. Ours pings *because money just arrived.*
2. **The record.** We hold the agent's verifiable transaction history (AgentScore, URA/HDB comps). That means our draft can be grounded in the agent's *own real numbers* - a claim a message-shuffling CRM literally cannot make.

**Desperate-specificity job statement:** *"Help me win the FairComparisons leads you send me - reply first, reply backed by my real track record, and never drop one."* Narrow on purpose. The alternative today is juggling WhatsApp Business + Gmail + a notebook that remembers nothing and grounds nothing.

## Positioning

**One-liner (agent-facing):**
> **FairComparisons Inbox - every seller lead we send you in one place, replied to first and backed by your real numbers, so you never drop a deal.**

**Tagline for surfaces:** *"Win the leads we send you. Reply first. Never drop one."*

**vs housapp:** housapp digitizes your *whole office* across every channel for an established agency. We do the opposite bet - depth on a sliver: *we bring you the deal AND the proof, then help you win it.* housapp's aha is "it writes like me." Ours is stronger for a high-stakes seller pitch: "in ten seconds it drafted a reply citing my real recent transactions and this street's comps, and it refused to let me overclaim."

**vs status quo (WhatsApp + Gmail + notebook):** the status quo remembers nothing and grounds nothing. Here every FC lead is captured, timed with an SLA, and pre-drafted from real transactions, one tap to reply.

**The line we never cross:** never say "unifies your WhatsApp" or "all your client chats." SG can't honor it, and an agent who expects existing chats and sees only FC-originated threads reads the feature as broken. Scope-honest copy only: *"every FairComparisons lead in one place."* `wa.me` click-to-chat stays as the honest escape hatch to the agent's own number.

## Growth Loops & Retention

**The habit is "clear the money queue," not "check messages."** The daily-open trigger must be *money-at-risk* - a fresh seller lead plus an aging unanswered one - not message volume. Reframe the Leads tab around commission-at-risk sorting with an SLA countdown, and a single top line the agent internalizes: *"2 leads need a reply, 1 aging 18h."*

**The engagement loop (in words):**

> A new or aging seller lead lands → the existing `sg_lead_notifications` pipeline pushes a **Change trigger** through a channel (push / email / WhatsApp once live) → the agent lands on the row where a **fact-grounded AI draft is already generated** → the core action (reply) costs *one tap* → reward: a fast, credible, professional reply and a progressed lead → the agent's responsiveness feeds their record and standing → the platform routes and surfaces more leads to reliably responsive agents → more inbox opens.

This is the loop a pure-SaaS inbox cannot replicate: *the marketplace lead is the highest-value manufactured cue,* and it is exclusive to us. The AI draft collapses the action cost, which is exactly what raises loop-completion rate.

**Activation ladder - measure at habit, not setup.** Setup here is unusually *cheap* (we already hold the lead data; no channel-ingest needed), so the bottleneck is not setup friction - it is aha → habit.
- **Setup** = claimed + lead alerts on + reply channel confirmed.
- **Aha** = first one-tap AI draft *sent on a real lead*, where the draft visibly cited the agent's own stats/comps ("drafted from your 2024 Tampines transactions + 3 recent comps"). This is the superpower feeling - protect it.
- **Habit** = 3+ replies across 2+ distinct leads within the first 14 days.

Instrument all three as separate events. The classic mistake - counting "connected" as activated - would badly overstate success here.

**Retention is gated by a single bad draft or a single mis-fired alert.** The two failure modes are existential, not cosmetic: *novelty* (try AI drafts, revert to WhatsApp) and *buggy* (one invented transaction or CEA-risky claim, get burned, never come back - and it damages trust in the platform's *core* accuracy promise, not just the feature). The current design already de-risks the worst case: drafts are fact-grounded, always editable, copy/mark-sent, **never auto-sent**. Keep it that way. Add a thumbs/edit signal so we detect rejected drafts and fix the prompt before a bad one burns trust. Steady-state retention at daily frequency (target 50%+), not week-1 trial, is the only real signal.

**Switching cost compounds through the record, not data lock-in.** We can't own the deep relationship - it migrates to personal WhatsApp the moment numbers are swapped. So defensibility comes from owning *the record*: response-time stats, quote-win history, completion ledger, and the standing they feed. An agent who has replied to 40 leads through us and built a fast-response reputation faces a switching cost measured in *reputation rebuild*, not export.

**Resurrection rides the lead, not a campaign.** Do not run a standalone "we miss you" win-back for the inbox - the dormant bucket is smaller and harder than activating fresh claimers. The compelling offer already exists and is free to fire: *"a seller in [their area] just requested agents - you're shortlisted."* Resurrection is a lead-triggered path, not a separate spend.

## Monetization & Packaging

**Value metric = AI-draft volume + channels connected, never seats.** SG agents are overwhelmingly solo, so per-seat prices almost no one up. Draft volume scales with the agent's lead throughput (more listings → more drafts → more GCI → higher willingness to pay) *and* with our own marginal cost (Claude tokens, Meta per-message), so we never charge for something free to deliver. Seats become a secondary Elite add-on for the rare team/agency case.

**Tier placement follows the cost-and-severity gradient, not a feature checklist:**

| Capability | Placement | Why |
|---|---|---|
| Lead inbox + seller's first reply + capped free drafts | **Free forever** | The marketplace only works if sellers get replied to. Gating this starves the seller side. |
| Verified badge, higher draft cap, email health, longer timeline horizon | **Verified S$29** | Low marginal cost; depth and trust. |
| Unlimited* AI drafts, full relationship timeline, assign/tag/notes for colleagues, co-branded AgentScore-backed seller reports, `wa.me` launcher | **Professional S$69** | The biggest revenue lever - moving solo responders up. Near-zero marginal cost, high perceived value. |
| FC-provisioned **two-way** WhatsApp thread, auto-labeling on office history, team seats | **Elite S$149** | Real Meta per-message opex + the Meta-ops activation gate + compliance surface. |

*\*Soft-capped with fair-use to bound Anthropic API opex.*

**The free line protects the loop, then gates depth / channels / volume.** Keep free-loop friction low so agents habituate; the daily never-drop habit is what makes S$29-149 feel trivial against a *single* saved commission. Guard the free base inbox and first reply in `tiers.ts` with the same invariant as "rankings cannot be bought." **Never gate ranking, search order, or visibility behind any tier** - that breaks the trust wedge vs PropKaki and the platform's core promise.

**Meter and merchandise in-product.** Count drafts per agent per month; surface the counter ("7 of 10 free drafts used"); fire the upgrade prompt *at the cap and at the aha moment* (right after a draft the agent copies/sends), not on a generic pricing page. Merchandise with show/immerse - let a free agent watch a real draft generate on their *own* real lead, then hit the cap. This "digital trial room" clears the perceived-value > price + friction bar far better than a features grid.

**Anchor paid value on what does not leak:** reply speed (one-tap drafts), the AgentScore/URA/HDB-backed co-branded seller report only we can produce, and Deal Radar MOP prospecting. Do not build the case on owning the deep conversation.

## GTM

**Who first:** the already-engaged responders - claimed agents who already reply to FC leads and feel the scattered-channel pain daily. This is a retention/expansion motion, not cold outreach and not dormant win-back.

**The proof:** concierge-onboard a first cohort of top-decile responders, set up their inbox, and generate their first AI draft *live on a real lead* (the aha). Capture on-record before/after time-to-reply proofs - **no invented testimonials, no fabricated numbers.**

**Channels / sequence:**
1. Concierge cohort → live aha on a real lead.
2. Turn on in-product upgrade prompts at the draft cap and aha moment.
3. Use the existing `wa.me` digest, agency-league and standing surfaces to pull more claimed agents into the habit, with *lead arrival* as the trigger.
4. Only then broaden.

**Hold the bar honestly.** Adoption target ~80% among *lead-receiving claimed agents* (this is a high-severity problem); if it lags, read it as "something is broken" (undersurfaced alert, draft not trusted, reply friction), not as an acceptable niche. **Never report against all ~30k CEA agents** - that would make a healthy feature look dead and misdirect the roadmap.

**North-star metric:** number of FC leads that receive a timely first agent reply (within SLA), sent from the Inbox, per week - the "money queue cleared" metric, which simultaneously proves the seller got answered and the agent formed the habit.

## Competitive Whitespace (SG)

- **No SG competitor owns both the demand and the record.** PropertyGuru/99.co sell *listings and eyeballs*; a generic CRM shuffles messages the agent already had. We are the only party that can drop a warm, intent-verified seller lead into the agent's hands *and* ground the reply in that agent's verified transactions.
- **The walled garden that blocks everyone blocks housapp-parity here too** - which means the honest FC-scoped inbox is a *category of one* in SG: it is the only ToS/PDPA-safe unified surface an agent tool can actually ship. Anyone promising "unify your WhatsApp" is either not shipping or risking their users' numbers.
- **The CEA-safe grounded draft is whitespace vs generic ChatGPT.** An agent can already paste a lead into ChatGPT; what they cannot get anywhere else is a draft grounded in their *own* CEA/URA/HDB record that *refuses* to say "cheapest" / "No.1" / guarantees (mirroring `cea-advert.ts`). Compliance-as-a-feature is the defensible edge.

## Why Now / Defensibility

**Why now.** The safe half is already built and merely gated (`ANTHROPIC_API_KEY`, WhatsApp Meta-ops backlog #39, `RESEND_WEBHOOK_SECRET`). We are one contact-entity build and a few env decisions away from a shippable Phase 1, not a ground-up project. The lead-notification pipeline that makes the loop compound already exists.

**Defensibility.** Three moats stack, and each requires the marketplace underneath it:
1. **The exclusive trigger** - only a marketplace that generates the leads can ping the agent with money attached.
2. **The grounded, CEA-safe draft** - needs our transaction data; a generic tool can't reproduce it without the record.
3. **The responsiveness → standing loop** - speed in the inbox visibly earns more leads, and the switching cost is reputation-rebuild, not data export.

**What we deliberately refuse, and why it strengthens the position.** No personal-WhatsApp ingest (bans the agent's own number; PDPA blast radius on FairComparisons - documented no-go). No auto-send (protects the pre-pick PDPA contact gate and the trust that one bad send would destroy). No voice-clone (fact-grounding is the CEA-safe differentiator). No two-way WhatsApp marketing before `isWhatsAppLive()` is true and a per-account budget cap is in place (the dormant-cron cost hazard is already a logged burn). No heavy contacts/timeline platform before Phase-0/1 retention is proven - platforming a not-yet-retained core accelerates the wrong thing.

**Sequencing:** Phase 0 (contact entity + identity resolution + turn on drafts + instrument the ladder) → Phase 1 (FC-scoped unified inbox + inbound email capture + free/paid line) → *gate* Phase 2 (two-way FC WhatsApp) and Phase 3 (agent's own Gmail via restricted-scope OAuth) on proven Phase-1 daily-open retention. Verify the MCP-applied `sg_lead_*` columns and snapshot them into migrations before building anything on them - the schema is currently not reproducible from the repo.

---

*Two open decisions gate the build shape and need a founder call: (1) the exact free draft allowance and the Verified→Professional feature split; (2) the inbound-email mechanism for Phase 1 (Resend inbound parse vs dedicated mailbox vs per-agent forwarding). Both are cheap to decide, expensive to retrofit.*