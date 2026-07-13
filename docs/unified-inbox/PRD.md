# Unified Inbox: FairComparisons Agent Reply Workspace (Final PRD)

Product: FairComparisons (fair-comparisons.com). Stack: Next.js + Supabase (RLS + service-role writes) + Vercel + Resend + WhatsApp Cloud API. Status: build-ready spec, hard-gated by phase. Date: 2026-07-13. Author: Lead PM (post adversarial-review revision).

Positioning line for every agent-facing surface: **"Win the leads we send you. Reply first. Never drop one."** Scope-honest sub-claim: "every FairComparisons lead in one place," never "your whole WhatsApp."

---

## 0. Executive summary and the one strategic decision

Three adversarial reviews converged on a single correction to the draft: **the defensible bet is narrow, and the draft over-committed to CRM breadth before proving the narrow bet retains.** This final PRD keeps the SCOPE architecture (a contact spine and a later unified inbox) as the *destination*, but hardens sequencing so that only the cheap, high-severity wedge is a committed build. Everything heavier is gated behind two measured facts we do not yet have.

The wedge (Phase 0, committed): on the leads FairComparisons already sends, make the agent reply first, backed by their real numbers, and never drop one. This is the grounded AI draft plus money-at-risk sort plus SLA aging on the existing `sg_lead_shortlist` feed. It is roughly 90% of the defensible value at roughly 10% of the cost.

The platform (Phase 1: contact spine, unified inbox, inbound email, timeline) is **not** greenlit by this PRD. It is gated behind: (Gate A) a measured lead-arrival frequency floor, and (Gate B) a pre-registered Phase-0 retention bar. If Phase 0 does not retain, we do not build the spine. This directly resolves the product skeptic's "wrong first bet" and "over-platforming" findings without discarding the architecture-for-later mandate.

Two structural truths the draft glossed and this version now states plainly:

1. **Frequency reality.** Every `/sell` lead is fanned to the top 7 agents (`sellMatch.ts`, `limit=7`). At current MRR scale a solo agent plausibly receives a handful of FC leads per month, not per day. The "daily habit" framing in the draft is not supported by volume. We reframe to an event-triggered, per-lead loop and make the true frequency a Gate-A measurement before any Phase-1 code.
2. **Win-rate reality.** Each seller picks one agent of seven. Structurally about six of seven agents lose every lead. The dominant emotional experience of this queue is rejection, not relief. We therefore anchor retention value on the *cumulative owned record* (responsiveness stat, standing movement, AgentScore-backed reports) that pays off even on lost leads, and we instrument a `draft_sent → not_picked` churn cohort as a Phase-0 kill/scale signal.

---

## 1. Problem and context

### 1.1 The job to be done
A Singapore CEA-registered agent working a live seller lead is not desperate about "storing relationships." They are desperate about **speed and leakage at the top of the funnel**: the seller is actively interviewing three or four agents at once, and every follow-up that is late or forgotten is real GCI gone. The functional job is capture-and-never-forget; the emotional job is confidence that they answered fast and looked credible; the social job is looking fast and expert to a seller who is comparing.

The reference product, **housapp.com** (NL agent-office SaaS), answers a broader version of this with a unified Email + WhatsApp inbox, style-trained AI drafts, a per-contact timeline, and colleague primitives. **Housapp's literal premise is undeliverable in Singapore** (Section 4.4). We therefore build the FairComparisons-scoped version, and we lean on the two assets no generic CRM holds: we route the lead, and we hold the verifiable record (AgentScore, URA/HDB comps).

### 1.2 Two realities that constrain the design (new, per product review)

- **Lead frequency is low and lumpy.** With a 7-way fan-out and pre-PMF volume, the arrival of a fresh FC lead is the manufactured trigger, but it fires on the order of weekly-or-less for a typical solo agent, not daily. Any copy, metric, or habit target that implies a daily loop is dishonest until measured otherwise. **Gate A** (Section 4.1) requires pulling leads-received-per-active-agent-per-week from `sg_lead_shortlist` over the last 90 days before Phase-1 scoping. The design assumes per-lead, event-triggered engagement as the default and only upgrades to "habit" language if the data supports it.
- **The median agent loses.** One pick per seven shortlisted means an approximate 14% per-lead win rate. A beautifully grounded draft followed repeatedly by "seller picked someone else" trains agents that opening the inbox equals disappointment. The retention thesis cannot rest on per-lead outcomes. It rests on the record that compounds regardless of any single loss (see 1.4).

### 1.3 Current state: what "Inbox v2" already does (cited)

Inbox v2 is a **single-channel marketplace lead pipeline**, not a housapp-style unified inbox.

| Capability | State today | Evidence (file) |
|---|---|---|
| "Inbox item" | A `sg_lead_shortlist` row (one agent's relationship to one `/sell` seller lead), status `invited/quoted/picked/not_picked`, rendered as a card list | `app/dashboard/LeadsInbox.tsx`, `app/dashboard/page.tsx` (Leads tab) |
| Feed source | Only the internal `/sell` seller funnel (`sg_leads`). No email/chat/WhatsApp/portal source | `app/api/dashboard/leads/route.ts` |
| AI-drafted reply | Direct Anthropic Messages API call, model = `process.env.CLAUDE_DRAFT_MODEL` (default currently `'claude-sonnet-5'`, **unverified, see 7.4**), `anthropic-version: 2023-06-01`, `max_tokens: 400`; fact-grounded, not style-trained; draft-only / copy-to-clipboard; **never sent**; returns 503 until `ANTHROPIC_API_KEY` set | `app/lib/draft-reply.ts`, `app/api/dashboard/draft-reply/route.ts`, `app/dashboard/DraftReply.tsx` |
| Draft grounding | Lead brief + agent name/agency/AgentScore/`primary_area` + up to 5 comps from RPC `area_recent_sales`; hard rules ban invented transactions and CEA-risky claims, mirroring `cea-advert.ts` | `app/lib/draft-reply.ts` |
| Outbound email | `sendEmail`/`sendBatchEmails` prefer Resend when `RESEND_API_KEY` set, else legacy Klaviyo event+Flow (silently drops if no live Flow), else dry-run log | `app/lib/email.ts`, `app/lib/activation-emails.ts` |
| Inbound email | None. Only a Resend delivery/bounce webhook (Svix HMAC), inert until `RESEND_WEBHOOK_SECRET` set | `app/api/webhook/resend/route.ts` |
| Inbound WhatsApp | Orphaned. `webhook/whatsapp` logs each inbound to `sg_lead_events` as `event_type='wa_inbound'` with only `{from, message_id, type, text, timestamp}`, not keyed to a lead/agent/contact. Dormant until WABA provisioned | `app/api/webhook/whatsapp/route.ts` |
| Outbound WhatsApp | Template-only, FC's own WABA, Graph API v20.0; `isWhatsAppLive()` false until `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN` set | `app/lib/whatsapp.ts`, `app/api/profile/route.ts`, `app/lib/reachability.ts` |
| wa.me click-to-chat | Live; a launcher, not an inbox | `app/components/WhatsAppButton.tsx`, `app/admin/tabs/WaNotifyButton.tsx` |
| Contact / relationship entity | None. Seller identity lives per-lead on `sg_leads`. Two `/sell` forms equal two unrelated leads | (no `sg_contacts` table exists) |
| Cross-channel timeline | Not possible today | `supabase/migrations/20260712000004_sg_viewings.sql` |

**Critical data-model caveat:** the core lead tables (`sg_leads`, `sg_lead_shortlist`, `sg_lead_quotes`, `sg_lead_completions`) were applied directly via Supabase MCP and are NOT in `supabase/migrations/`. Live columns must be verified via MCP and snapshotted into migrations before anything is built on them.

**Send-path caveat (load-bearing, per completeness review).** There is **no outbound send path** in the product today. Pre-pick, the only structured outbound is the Quote; the AI draft is copy-to-clipboard only and is never dispatched. Therefore the system has **no ground-truth "reply sent" signal.** Every metric that says "reply sent" must be redefined as a proxy (Section 5.12 and 9.1), or wait for a channel (Phase-1 email, Phase-2 WhatsApp) that produces a real outbound message row.

### 1.4 Where durable retention value actually lives
Once seller and agent swap numbers, the real conversation migrates to the agent's personal WhatsApp and the mediated thread goes cold. This is structural and permanent. Retention value must therefore come from what does **not** leak: the owned record (email thread, timeline, response-time stat, standing movement, and the co-branded AgentScore/URA/HDB seller report only FairComparisons can produce). Even on a lost lead, that record compounds. The product is designed around this, not around owning the deep conversation.

---

## 2. Goals and non-goals

### 2.1 Goals
1. On FairComparisons-originated leads, make the agent reply first, backed by real numbers, editable, never auto-sent, so no lead dies from leakage.
2. Prove that this wedge retains (Phase-0 Gate B) before building any spine.
3. Measure real lead-arrival frequency (Gate A) and design the loop to the true cadence, not an assumed daily one.
4. Only if Gates A and B pass: introduce the contact/identity spine and unify FC-originated streams into one timeline, without ever gating ranking, the base inbox, or the seller's first reply.
5. Architect (not pre-build) so a later phase can add an FC two-way WhatsApp line, and evaluate the agent's own Gmail, without re-platforming.

### 2.2 Non-goals (explicit)
| Non-goal | Why |
|---|---|
| Ingesting the agent's existing personal/consumer WhatsApp chats | No API; only unofficial automation, which bans the agent's own livelihood number and creates PDPA exposure over their clients. Permanent no-go (4.4). |
| Auto-send / auto-reply on the agent's behalf, on any channel including FC WhatsApp | Protects trust and the pre-pick PDPA gate; also keeps FC's own WABA outside Meta's Jan-15-2026 third-party-AI-chatbot restriction (8.3). |
| A writing-style / voice-clone model | Fact-grounded on the real record is the CEA-safe differentiator vs housapp. |
| Any paid tier that changes ranking, search order, or visibility | Violates the "tools never rank" promise and the trust wedge. |
| Marketing "unifies your whole WhatsApp / all your client chats" | SG cannot honor it; agents would read the feature as broken. |
| Building the contact spine, unified inbox, inbound email, or timeline before Gates A and B pass | Over-platforming a not-yet-retained core (product review). |
| Buyer-side message unification in Phase 1 | No buyer message source, table, or route exists today; struck from the Phase-1 stream list and deferred (see 4.2). |
| Cross-sale merge of unrelated `/sell` submissions into one durable profile without a fresh lawful basis | PDPA purpose-limitation; the persistent contact spine needs its own basis and `/sell` notice (8.1). |

---

## 3. Personas and JTBD

| Persona | Context | Job statement | Alternative today | Realistic frequency |
|---|---|---|---|---|
| **Solo listing agent** (primary) | Runs phone as CRM; heavy portal spend | "Help me win the FairComparisons leads you send me, reply first with my real track record, and never drop one." | WhatsApp Business + Gmail + notebook | **Per-lead, event-triggered** (order of weekly-or-less, pending Gate A) |
| **Small-team / KEO agent** (Professional, Phase 1+) | 2 to 8 agents, shared leads | "Assign the right lead to the right colleague and see who has replied." | WhatsApp groups + spreadsheet | Per-lead |
| **Agency ops / team lead** (Elite, Phase 1+) | Franchise or boutique | "One board of every lead across my agents with SLA aging so nothing rots." | Manual chasing | Per-lead, batched |
| **Seller** (lead source, not a paying user) | Submitted `/sell`, comparing agents | "A fast, credible reply from the agents I shortlisted." | Waiting; cold-called | One-off per sale |
| **Admin / operator** (internal) | Runs the marketplace | "Notification-integrity worklist, deliverability grading, unmatched-inbound and merge-review queues." | `app/admin/tabs/LeadsTab.tsx` | Daily |

**Activation ladder (redefined to be measurable given no send path, per completeness review).** Instrument three events, each bound to a concrete loggable action, measured against a **claimed and lead-receiving** denominator, never all ~30k CEA agents:

- **Setup** = lead alerts on AND reply channel confirmed (email default; WhatsApp opt-in optional). Deliberately light.
- **Aha** = first **response action** on a real lead, defined concretely as `quote_submitted` OR `draft_copied` OR `draft_marked_sent` (5.12). "First AI-drafted reply sent" is a proxy, not confirmed delivery.
- **Habit** = a response action on 2 or more distinct leads within the first 30 days. (Widened from the draft's "3 replies in 14 days," which assumes a lead cadence we have not confirmed. The exact bar is finalized after Gate A.)

Target bars are **provisional and re-baselined after Gate A**. Do not ship "80% adoption / 50% daily retention" copy or dashboards until the frequency data justifies the cadence. Retention is measured at the per-lead response-action level, not at a daily-active level.

---

## 4. Scope, phasing, and the build gates

Phasing is gated on measured facts, not pre-committed. The heavy build does not start until Phase 0 earns it.

### 4.1 Phase 0: the committed wedge (Must)
Make today's single-source lead inbox fast, trustworthy, measured, and honestly framed. **This is the only build this PRD greenlights.**

Build items:
- Verify live columns of `sg_lead_*` and `sg_viewings` via Supabase MCP; snapshot them into `supabase/migrations/` (reproducible schema). Add a fallback if `sg_viewings` does not store a resolvable seller email/phone (Section 6.10).
- Flip on the AI draft path in prod (`ANTHROPIC_API_KEY`); keep editable / never-send / CEA guardrails; add a per-agent monthly draft-volume counter and a thumbs/edit feedback signal.
- **Ship the reply-sent proxy (5.12) in Phase 0**, not later: `draft_copied`, `quote_submitted`, and an optional in-product "Mark as sent" affordance. Without this, Aha/Habit are un-instrumentable (completeness review high finding).
- Money-at-risk sort + SLA aging on the Leads tab; wire the existing `sg_lead_notifications` pipeline as the per-lead Change trigger. SLA threshold is config-owned (5.1 AC2).
- Instrument Setup/Aha/Habit + a `draft_sent → not_picked` churn cohort + an admin activation funnel.
- **Gate A measurement (blocking Phase 1 scoping):** pull leads-received-per-active-agent-per-week from `sg_lead_shortlist` over 90 days. If the median is under 1 to 2 per week, drop all daily-habit framing and design Phase 1 (if built at all) for per-lead / weekly cadence, leaning on aging nudges, the weekly digest, and Deal Radar prospecting rather than lead arrival alone.

**Gate B (pre-registered Phase-0 retention bar, blocking any Phase-1 code):** a pre-declared, honest threshold that must hold before a single line of `sg_contacts` is written. Provisional bar, to be confirmed with the founder at Phase-0 kickoff: at least 50% of lead-receiving agents perform a response action on at least one lead per active lead-week for four consecutive weeks, AND the `not_picked` cohort shows no material retention collapse (losing agents keep responding). If Gate B fails, we iterate on the wedge or stop; we do not proceed to the spine.

Notably, `sg_contacts` and identity resolution are **moved out of Phase 0** (they were Must in the draft). They are net-new PII infrastructure with a DPO dependency and belong in Phase 1, behind the gates. Phase 0 operates on the existing lead-keyed feed.

### 4.2 Phase 1: FairComparisons-scoped unified inbox (gated; Must-if-built)
Only after Gates A and B pass. One contact-keyed place for every conversation FC originates or controls, with a timeline and the free/paid line enforced.

Build items:
- Ship `sg_contacts` + a deterministic identity-resolution function with defined merge/split handling (5.13, 6.1, 6.9) that back-links `sg_leads`, `sg_lead_events` (including the resolution-ready-but-dormant `wa_inbound`), `sg_lead_notifications`, and `sg_viewings`.
- Merge streams into one Inbox: lead-shortlist rows + inbound email replies + Planner booking requests (`sg_viewings`) + `wa_inbound` (dormant until Phase 2). **Buyer messages are struck from this list** and deferred until a buyer-message source exists (2.2).
- Per-contact relationship timeline (outbound + inbound + notes/docs), with the pre-pick PII gate extended to inbound content (5.11).
- Net-new inbound email capture with mandatory sender authentication (5.14 mechanism: 7.2) and header-threading validation.
- Enforce free/paid packaging in `tiers.ts` (base inbox + first reply + capped drafts free forever; gate depth/volume/channels only, never rank).
- Assignment / tag / notes / @mentions, with the team-vs-PII-gate conflict resolved (5.5) and team-membership-change handling (5.5).
- Response-time metric surfaced; weekly digest.
- Add the `/sell` per-channel consent checkbox change (a required form change, called out as a build item per completeness review).

### 4.3 Phase 2 (Could, deferred): two-way FC WhatsApp
Only after Phase-1 shows retained repeat usage.
- Complete Meta-ops activation (backlog #39): WABA, permanent System User token, approved templates, webhook verify token; flip `isWhatsAppLive()`.
- **Utility/transactional messages only, inside the 24h customer-service window, human-reviewed.** The AI draft is never auto-dispatched over WhatsApp (keeps FC outside Meta's third-party-AI-chatbot restriction, 8.3).
- Re-engagement / marketing templates are **out of Phase-2 scope** until a separate, Meta-compliant, business-named WhatsApp marketing consent and Spam Control Act guardrails are in place (8.1, 8.3).
- Per-account monthly message budget cap; every send `isWhatsAppLive()`-gated. Packaged as Elite.

### 4.4 Phase 3 (open compliance question, likely descoped): agent's own Gmail
Reframed per the compliance review from "reuse the calendar pattern" to a **distinct restricted-scope integration with unresolved PDPA exposure.** It is not greenlit and may be permanently descoped.

Honest facts:
- The shipped calendar OAuth requests `calendar.events`, a **sensitive** scope. Gmail read (`gmail.readonly`/`gmail.metadata`) is a **restricted** scope, a categorically heavier tier: it requires an annual independent CASA Tier 2 security assessment (recurring cost, typically thousands of USD per year, plus a penetration test), Google Limited Use attestation, and a longer verification cycle. Only the token-store/refresh plumbing is reusable; the verification tier is not.
- Ingesting the agent's own client email into FC's central store means **FC processes the personal data of the agent's buyers, sellers, lawyers and other third parties who never consented**, the exact defect that makes Approach A a permanent no-go. If pursued at all, the agent (not FC) must be the controller for their mailbox, FC acts as processor under a DPA, and there must be a lawful basis/notification covering the agent's correspondents. Otherwise Gmail is descoped.
- "Auto-labeling trained on office history" applied to Gmail content would likely breach Google's API Services Limited Use policy (which restricts using restricted-scope Gmail data to train/improve models). It is dropped for any Gmail-sourced content.

Phase-3 gate: a standalone security-assessment budget, a resolved third-party-correspondent lawful basis, and explicit founder + DPO sign-off. Default assumption: **descoped.**

### 4.5 DOA / out of scope: documented no-go

| Approach | Verdict | Why |
|---|---|---|
| **A: ingest agent's existing personal/consumer WhatsApp** | NOT-FEASIBLE (permanent no-go) | No message/history API. Only WhatsApp Web automation / unofficial libraries, which violate Meta ToS, get accounts banned, and the ban lands on the agent's own primary business number. Meta ramped enforcement 2024 to 2026 and restricts third-party AI chatbots from Jan 15 2026. Also ingests the agent's clients' PII without consent (PDPA). |
| **C: agent connects their OWN WABA number** | NOT-FEASIBLE commercially | Near-zero SG agents run a WABA; migrating a number to WABA removes it from the normal WhatsApp mobile app (their phone-as-CRM). No history backfill. Rare opt-in only. |
| **B: FC-provisioned WABA, mediated** | CONDITIONAL (Phase 2) | Unifies only FC-originated threads, utility-only inside 24h window. |
| **D: wa.me click-to-chat** | FEASIBLE (already shipped) | A launcher, not an inbox; kept as the honest escape hatch. |

### 4.6 MoSCoW summary
**Must (Phase 0):** verify+commit `sg_lead_*` + `sg_viewings` schema; AI draft path live (editable/never-send/CEA guardrails/PII-minimized prompt); reply-sent proxy + Mark-as-sent; money-at-risk + SLA sort; per-lead Change trigger; draft-volume counter + thumbs/edit; Setup/Aha/Habit + not_picked churn cohort on the right denominator; Gate A measurement; Gate B pre-registration.
**Must (Phase 1, gated):** contact/identity spine with merge/split handling; unified Inbox over FC streams (no buyer stream); per-contact timeline; inbound email with SPF/DKIM/DMARC auth + idempotency; free-forever base inbox/first reply/free draft allowance in `tiers.ts`; pre-pick PDPA gate extended to inbound content and to team assignees; PDPA lawful basis + `/sell` notice for persistent contact spine + DPO sign-off (a hard Phase-1-entry gate).
**Should:** assignment/tag/notes/@mentions; team-membership-change handling; wa.me logged into timeline; draft-volume meter + upgrade prompt; first-reply latency surfaced (fairness-audited, non-pay-to-rank); weekly digest; co-branded seller report with CEA advertiser identifiers.
**Could:** FC two-way WhatsApp (Phase 2, utility-only, budget-capped, gated); agent's own Gmail (Phase 3, likely descoped); saved-reply snippets.
**Won't:** personal-WhatsApp ingest; auto-send/auto-reply anywhere; pay-to-rank; voice-clone; "unifies your whole WhatsApp" copy; two-way WhatsApp before Meta activation + budget cap; WhatsApp marketing/re-engagement before separate consent + Spam Control Act guardrails; Gmail auto-labeling on restricted-scope content; heavy platform build before Gates A and B.

---

## 5. Functional requirements

Each requirement: description, user value, behavior, acceptance criteria (Given/When/Then). Requirements 5.1, 5.4, 5.7, 5.9, 5.10, 5.11, 5.12 apply in Phase 0. The rest apply in Phase 1 (gated).

### 5.1 Unified inbox list (Phase 0 = lead-only; Phase 1 = multi-source)

**Description.** A single list that, in Phase 0, is the existing `sg_lead_shortlist` feed with money-at-risk sort and SLA aging; in Phase 1, merges all FC-originated conversations for a person (lead shortlist, Planner bookings `sg_viewings`, inbound email, and `wa_inbound` once Phase 2 is live). Each Phase-1 row is a thread (`sg_inbox_threads`) resolved to a contact (`sg_contacts`).

**User value.** Clear the money queue: one place to know what needs a reply, sorted by what will cost commission if ignored.

**Behavior.**
- Sort by money-at-risk: (1) new unanswered lead, (2) aging-unanswered with SLA countdown, (3) quoted-awaiting-pick, then recency.
- Top summary line, e.g. "2 leads need a reply, 1 aging 18h."
- Row shows: contact display name (masked pre-pick, 5.11), source icon(s), last-message snippet (masked pre-pick), status pill, SLA age, needs-reply badge.
- Filters: All / Needs reply / Aging / Assigned to me / Unassigned (team tiers).
- **Pagination (5.14):** keyset cursor on `(sla_due_at, created_at)`, page size 50, never load all rows.

**SLA config ownership.** Global default 12h, overridable per tier and per agent, owned in a config surface (`tiers.ts` default + a per-agent override column); not a hardcoded literal.

**Acceptance criteria.**
- AC1. Given 3 invited and 1 picked lead, when the agent opens the tab, all 4 render with correct pills and the summary reflects unanswered counts.
- AC2. Given a lead with no agent response action logged for longer than the configured SLA, the row shows an "aging" badge and sorts above answered threads. The SLA value is read from config, not a literal.
- AC3. (Phase 1) Given two `/sell` submissions from the same phone/email, identity resolution links both threads to one contact, subject to merge/split rules (5.13).
- AC4. Given no leads, the tab renders an empty state with the free-tier value message, not an error.
- AC5. The list route is session-gated; an unauthenticated request returns 401 with no data.
- AC6. Given an agent or team with more than 200 threads, the first page renders within budget using keyset pagination without loading all rows.

### 5.2 Conversation / thread view (Phase 1; Phase 0 uses the existing lead card)

**Behavior.**
- Messages oldest to newest with channel labels, direction, timestamp, delivery status where known (reconciled from `sg_lead_notifications` / webhooks).
- Composer: AI draft (5.4) + editable textarea + Copy button + (pre-pick) `QuoteForm`; (on picked) released contact details + reply options + optional "Mark as sent" (5.12).
- Pre-pick: no free-text send-to-seller control; the structured Quote is the only outbound (5.11).
- 3-step `CompletionStepper` preserved.

**Acceptance criteria.**
- AC1. A thread with an inbound email reply and an outbound notification renders both in correct order with channel labels and timestamps.
- AC2. A pre-pick thread shows the QuoteForm and AI draft but no free-text send-to-seller control, and the inbound content is masked per 5.11.
- AC3. A picked thread renders released seller details and shows the release event on the timeline.
- AC4. Marking a CompletionStepper step persists across reload.
- AC5. A thread-route 500 renders a distinct error state (retry available), not the empty state.

### 5.3 Relationship timeline (Phase 1)

**Behavior.**
- Backed by `sg_inbox_messages` + `sg_inbox_notes` + references to `sg_lead_quotes`, `sg_viewings`, `sg_lead_completions`, keyed by `contact_id`.
- Migrates lead-keyed ledgers to be also contact-linked (nullable `contact_id`, backfilled per Section 6.12).
- Documents attach via Supabase Storage (6.14).
- Horizon is tier-gated (Free 30 days, Verified 90, Professional/Elite full); depth gating only, never gating a reply.
- **Long timelines are paged/lazy-loaded (5.14).**

**Acceptance criteria.**
- AC1. A contact with 2 leads, 3 emails, 1 viewing and 1 note renders all 7 events chronologically under one contact.
- AC2. A Free-tier agent opening a contact older than 30 days sees older events collapsed behind an upgrade prompt (not deleted, not gating reply).
- AC3. A resolved `wa_inbound` event appears on the contact timeline; an unresolved one lands in the operator "unmatched" queue, never silently dropped.
- AC4. A contact with more than 200 timeline events loads the first page within budget; older pages load on demand.

### 5.4 AI-drafted replies (Phase 0)

**Behavior.**
- Engine `app/lib/draft-reply.ts`: `buildDraftPrompt()` injects lead brief + agent stats + up to 5 `area_recent_sales` comps; `callClaude()` POSTs to Anthropic Messages API, model `CLAUDE_DRAFT_MODEL`, `max_tokens: 400`.
- **PII minimization (compliance review):** the prompt payload must not send the seller's real name or contact identifiers to Anthropic. Substitute a neutral token (for example "the seller") for any direct PII. The draft is fact-grounded and human-reviewed, so no PII needs to cross the border.
- **Style = fact-grounded, not voice-mimicked.** No per-agent voice model, no conversation-history feed.
- **Guardrails:** hard-ban invented transactions and CEA superlatives/guarantees (`cheapest`, `No.1`, guarantees), mirroring `cea-advert.ts`; server-side lint rejects/regenerates on any banned token before returning.
- **Human-in-the-loop:** editable textarea + Copy; the agent sends via their own channel (pre-pick, only the Quote is available).
- **Transparency:** provenance line, e.g. "drafted from your N recent [area] transactions + M street comps."
- **Feedback:** thumbs/edit captured to `sg_inbox_draft_feedback` with edit-distance.
- **Inert-until-keyed:** returns 503 until `ANTHROPIC_API_KEY` set.
- **Loading/error/timeout (completeness review):** the UI shows a loading state during generation; on Anthropic 429/5xx/timeout, one bounded retry with backoff, then a non-alarming "couldn't draft right now, try again or write your own" state. The manual reply path is never blocked by a draft failure.
- **Volume metering:** each generation increments a per-agent monthly counter (5.9).

**Acceptance criteria.**
- AC1. With `ANTHROPIC_API_KEY` unset, a draft request returns 503 and the UI shows a non-alarming "not configured" state.
- AC2. With 0 area comps, the draft makes no numeric comp claim and cites only verifiable agent stats.
- AC3. The draft never contains banned tokens; a server-side lint rejects and regenerates or strips.
- AC4. The draft is always editable and never sent automatically; no code path dispatches a draft to a seller without an explicit human action.
- AC5. Every generation writes an audit row (agent_id, contact/thread, model, token counts, provenance facts) for CEA record-keeping.
- AC6. A thumbs/edit signal persists per draft.
- AC7. The prompt payload sent to Anthropic contains no seller name, email, phone, or WhatsApp number (verified by a test asserting the serialized payload).
- AC8. On Anthropic timeout/429, the UI shows a retry state and the manual composer remains usable.

### 5.5 Assignment / notes / @mentions and team handling (Phase 1)

**Behavior.**
- `sg_inbox_assignments`, `sg_inbox_notes` (internal only), @mention parsing to in-app notifications, same-team constraint enforced in the route layer.
- Team membership derived from agency/office linkage on `sg_agents`; assignment only within the same team.
- Professional+ gate.
- **Pre-pick PII vs team assignment (completeness + compliance review):** the pick/PII-release is **per-agent**, not per-team. Pre-pick, seller PII is masked for **all** team members, including any assignee. PII releases only on `picked` and only to the picked agent. A colleague assignee on a pre-pick thread can triage, add notes, and see the masked brief, but sees no seller PII.
- **Team-membership change (completeness review):** when an agent leaves a team or moves office, their assigned threads revert to unassigned (routed to the team lead if one exists); their internal notes remain visible to the team but their authorship is retained; any released-PII visibility they held is revoked at the route layer on the next request (they retain nothing after departure).

**Acceptance criteria.**
- AC1. Agent A assigns a thread to same-team agent B; B sees it under "Assigned to me," A sees the assignee.
- AC2. Notes are visible only to same-team agents and never included in any outbound message or AI draft prompt.
- AC3. An @mention notifies a same-team teammate; cross-team mentions are rejected.
- AC4. Assignment/notes are Professional-gated; a Free/Verified agent sees an upgrade prompt, not the control.
- AC5. A colleague assigned to a **pre-pick** thread receives no seller PII in any API response (name/email/phone/whatsapp masked, inbound body masked per 5.11).
- AC6. When an agent leaves a team, their open assignments revert to unassigned/team-lead and their PII visibility is revoked on the next request.

### 5.6 Auto-labeling / triage (Phase 1)

**Behavior.**
- Deterministic rules first (not ML): `needs_reply`, `aging`, `quoted_awaiting_pick`, `won`, `lost`, `dormant`.
- `sg_inbox_labels` + `sg_inbox_thread_labels`. Custom labels Professional+.
- Recomputed on message ingest (in-transaction) and on a low-frequency internal cron for aging transitions (no per-message external cost).

**Acceptance criteria.**
- AC1. An inbound reply after the agent's last outbound labels the thread `needs_reply` within the ingest transaction.
- AC2. A `needs_reply` thread crossing the SLA age flips to also `aging` on the scheduled recompute and re-sorts.
- AC3. System labels cannot be deleted by the agent; custom labels are tier-gated.

### 5.7 Notifications: the per-lead Change trigger (Phase 0)

**Behavior.**
- Trigger source = the existing `sg_lead_notifications` pipeline. Channels: in-app + email (Resend) now; WhatsApp template (Phase 2, `isWhatsAppLive()`-gated, budget-capped, utility-only).
- Fires on: (a) new lead arrival, (b) aging-threshold breach.
- Every notification deep-links straight into the thread with the AI draft pre-generated.
- **Fan-out and dedup (completeness review):** for an unassigned lead, notify the shortlisted/owning agent(s) per the existing pipeline; for an assigned thread (Phase 1), notify the assignee plus optionally the team lead, not the whole team. Across the three channels, **one primary channel per event per agent** (in-app always; email or WhatsApp as the single push), deduped by `(event_id, agent_id)`. Per-agent notification preferences and quiet hours are honored.
- **Cost governance:** hard per-account daily cap on paid sends; WhatsApp gated on `isWhatsAppLive()`; suppression logged. Mirrors the logged dormant-cron burn hazard.

**Acceptance criteria.**
- AC1. A new lead notification records to `sg_lead_notifications` and (email) delivers via Resend or logs a dry-run, never throws.
- AC2. A notification deep-link opens the exact thread with a draft ready.
- AC3. WhatsApp notifications never fire unless `isWhatsAppLive()` is true and the agent is opt-in; otherwise a dry-run log, and no copy claims "we WhatsApp'd you."
- AC4. A single lead event produces at most one notification per agent per channel, respects quiet hours, and respects the per-account daily cap; exceeding the cap suppresses further paid sends and logs the suppression.

### 5.8 Opt-in capture and consent classes (Phase 0 for agent side; Phase 1 for seller side)

**Behavior.**
- Agent WhatsApp opt-in stamped only in `app/api/profile/route.ts` when a claimed agent enters their OWN number (`whatsapp_opt_in_at`); clearing the number withdraws consent. `reachability.ts` requires `whatsapp && whatsapp_opt_in_at && isWhatsAppLive()`.
- **Seller/contact consent is split into two distinct classes (compliance review):**
  1. **Transactional/utility consent:** captured at `/sell` (a required new per-channel checkbox, a Phase-1 build item), covers connecting the seller with shortlisted agents and servicing the lead. Sufficient for utility WhatsApp inside the 24h window and transactional email.
  2. **Marketing/re-engagement consent:** a **separate** consent class, with Meta-compliant, business-named WhatsApp opt-in wording (not a bundled `/sell` checkbox), required before any re-engagement template or marketing message. Stored distinctly in `sg_contact_consents.consent_class`.
- Scraped numbers are never auto-messageable.

**Acceptance criteria.**
- AC1. An agent number with no `whatsapp_opt_in_at` is never auto-messaged.
- AC2. Clearing the agent's WhatsApp number nulls the timestamp and stops sends.
- AC3. A seller who did not tick WhatsApp consent at `/sell` receives no FC WhatsApp message; consent is queryable per contact, per channel, per class.
- AC4. No marketing/re-engagement message is sent to a contact holding only transactional consent.

### 5.9 Monetization hooks (Phase 0 metering; Phase 1 packaging)

**Behavior.**
- Free = base lead inbox + email reply + capped drafts/month (default 10, founder decision) + limited timeline horizon.
- Verified S$29 = higher cap + verified badge + longer horizon + email health.
- Professional S$69 = high fair-use drafts + wa.me launcher + full timeline + assign/tag/notes + co-branded seller report.
- Elite S$149 = FC two-way WhatsApp thread + team seats.
- Counter incremented in the draft-reply route; dashboard shows "7 of 10 free drafts used"; upgrade prompt fires at the cap and at the aha moment, not on a generic pricing page.
- `tiers.ts` guards a hard invariant: base inbox, seller's first reply, and ranking are never gated.

**Acceptance criteria.**
- AC1. Generating a draft increments the monthly counter; hitting the cap blocks further generation and shows an upgrade prompt, but never blocks a manual reply.
- AC2. No tier changes ranking/search order; a test asserts `tiers.ts` exposes no rank-affecting flag.
- AC3. The seller's first reply path is available on Free with a non-zero draft allowance.

### 5.10 Unsubscribe / DNC suppression (Phase 0 email; extended Phase 1+)

**Behavior.**
- `sg_contact_consents` holds per-channel, per-class state: `opted_in`, `unsubscribed`, `dnc`, `bounced`, `complained`, fed by `/sell`, unsubscribe clicks, and the Resend webhook. (WhatsApp block-event capture is **not** in the current webhook; it is either implemented in Phase 2 or explicitly struck as a consent source, per completeness review 5.14 note.)
- Every outbound send checks suppression first and short-circuits if suppressed.
- Marketing-class email carries an unsubscribe link; transactional lead notifications are separated from marketing per PDPA hygiene.
- **DNC Registry (compliance review):** no SMS or voice marketing channel ships without a Singapore DNC Registry check integration. WhatsApp's DNC status is currently grey (OTT, outside the Registry's letter); marketing WhatsApp therefore ships only on documented, timestamped, per-number consent, never on an assumption that DNC does not apply.

**Acceptance criteria.**
- AC1. A contact marked `unsubscribed` or `dnc` receives no marketing-class send on that channel; the attempt is logged as suppressed.
- AC2. A hard bounce/complaint on the Resend webhook flips status and future sends are suppressed.
- AC3. Every marketing-class email contains a working unsubscribe link that writes suppression on click.
- AC4. No SMS/voice marketing send occurs without a prior DNC Registry check or a matching per-number consent record.

### 5.11 PII / pre-pick gate, extended to inbound content (cross-cutting; Phase 0 + Phase 1)

**Description.** Preserve and extend the PDPA gate: seller contact PII (email/phone/whatsapp) is withheld until `sg_lead_shortlist.status='picked'`, and this now covers **inbound message content and identifiers**, not just structured columns (compliance review).

**Behavior.**
- Pre-pick, the contact record exposes only non-PII fields (masked name/area) to the agent; the Inbox row and timeline honor the mask.
- **Inbound email and `wa_inbound` are masked pre-pick:** the sender's raw From-address, phone, and message body are held in an operator/unmatched queue or shown to the agent with identifier and body masked. Release only on `picked`.
- The new `sg_contacts` store must not leak PII earlier than the current lead flow does.
- PII release is an auditable timeline event.

**Acceptance criteria.**
- AC1. Pre-pick, no API response to the agent contains the seller's email/phone/whatsapp, and no inbound message body or from-address is surfaced unmasked.
- AC2. On `picked`, PII (including held inbound content) is released and a release event is written to the timeline.
- AC3. A regression test asserts no code path exposes `sg_contacts` PII columns, or inbound content, to a non-picked agent (including a same-team assignee, per 5.5).

### 5.12 Reply-sent signal: proxy plus "Mark as sent" (Phase 0, new; resolves the North Star instrumentability gap)

**Description.** Because the product has no true send path, "reply sent" is defined as an explicit, loggable proxy until a real outbound channel exists.

**Behavior.**
- Instrument `draft_copied` (fires when the agent clicks Copy on a draft) and `quote_submitted` (structured pre-pick outbound) as the primary response-action signals.
- Add an optional "Mark as sent" affordance (patterned on the existing `WaNotifyButton` "Mark sent" control) that records a `draft_marked_sent` event and stamps `last_outbound_at`.
- A response action is any of `quote_submitted`, `draft_copied`, or `draft_marked_sent`. The North Star and activation ladder are defined on this proxy (9.1), with the explicit caveat that it is a proxy for intent-to-reply, not confirmed delivery.
- When Phase-1 email or Phase-2 WhatsApp lands, an actual outbound `sg_inbox_messages(direction='out')` row supersedes the proxy for those channels.

**Acceptance criteria.**
- AC1. Clicking Copy on a draft logs exactly one `draft_copied` event bound to the thread and agent.
- AC2. Submitting a Quote logs `quote_submitted` and updates `last_outbound_at`.
- AC3. "Mark as sent" logs `draft_marked_sent` and updates `last_outbound_at`; the row leaves the `needs_reply` state.
- AC4. The North Star query counts a lead as "responded" if and only if at least one response action exists within SLA (9.1).

### 5.13 Identity resolution and merge/split conflicts (Phase 1, new; resolves the hard-fail against partial-unique indexes)

**Description.** A deterministic `resolve_contact(email, phone)` used by all ingestion paths, with defined behavior for the collision the draft's partial-unique indexes would otherwise hard-fail on.

**Behavior.**
- Normalize email (lowercase/trim) and phone (E.164 SG).
- **Match precedence: phone first, then email.** If only one key matches an existing contact, use it.
- **Collision (email matches contact A, phone matches contact B):** do not attempt a conflicting insert (which would violate the partial-unique index). Instead route to a **merge decision**: if the two contacts are safely mergeable (no conflicting released-PII ownership across different picked agents), pick a survivor (older `first_seen_at`), repoint all threads/messages/consents/notes to the survivor, write a `sg_contact_merges` audit row, and soft-retire the other. If ambiguous (for example the two contacts belong to different picked agents, or a shared family/office identifier is suspected), route to a **manual merge-review operator queue** and do not auto-merge.
- **Shared identifiers:** a phone/email flagged as shared (family line, office reception) is excluded from auto-merge and always routed to the review queue.
- Idempotent: re-running resolution on the same inputs yields the same survivor and no duplicate rows.

**Acceptance criteria.**
- AC1. Given an inbound event whose email matches contact A and phone matches contact B, resolution does not throw a unique-violation; it either merges with an audit row or enqueues a merge-review item.
- AC2. A merge repoints all threads, messages, consents, and notes to the survivor and writes an audit row capturing both source ids.
- AC3. Re-running resolution after a merge is a no-op (idempotent).
- AC4. A shared/family identifier is routed to review, never auto-merged.

### 5.14 Loading, error, timeout, pagination, and inbound-auth states (cross-cutting, new)

**Behavior (consolidated from completeness review).**
- **Draft generation:** loading state; bounded retry with backoff on Anthropic 429/5xx/timeout; non-alarming failure message; manual composer stays usable (5.4 AC8).
- **List/thread routes:** a 500 renders an error state distinct from the empty state, with retry (5.1, 5.2).
- **Realtime (7.5):** on Supabase Realtime disconnect, fall back to polling; reconnect resubscribes.
- **Pagination:** keyset cursor on inbox list and lazy/paged timeline (5.1 AC6, 5.3 AC4).
- **Inbound email authentication (7.2):** SPF/DKIM/DMARC must pass; failures are quarantined to an operator "unverified" queue, never threaded into a contact timeline. `In-Reply-To`/`References` are validated to belong to a thread owned by the resolved contact before threading; a mismatch creates a new thread rather than attaching to an unrelated one.
- **Webhook idempotency (6.3, 7.6):** replaying a webhook payload yields exactly one message and one notification.

**Acceptance criteria.**
- AC1. A spoofed-From inbound email (DMARC fail) lands in the unverified operator queue, not on any timeline.
- AC2. An inbound email whose `References` point at a thread not owned by the resolved contact starts a new thread rather than attaching.
- AC3. Replaying the same Resend or Meta webhook payload produces exactly one `sg_inbox_messages` row and one notification.
- AC4. On Realtime disconnect, the inbox continues updating via polling.

---

## 6. Data model

New/changed Supabase tables. **RLS posture:** RLS enabled, no anon policies (deny-by-default); all reads/writes go through session-gated Next.js API routes using the service-role client (`supabaseAdmin`). Agent scoping enforced in the route layer by the authenticated session, not by permissive RLS. This matches the codebase's hard-won pattern (anon-key writes silently fail RLS).

> Before writing migrations: verify live columns of `sg_leads`, `sg_lead_shortlist`, `sg_lead_quotes`, `sg_lead_completions`, and `sg_viewings` via Supabase MCP and snapshot them into `supabase/migrations/`. All FKs below assume verified columns.

Phase note: 6.1 to 6.9 and 6.12 to 6.14 are **Phase 1** (gated). Phase 0 touches only existing tables plus the event instrumentation in Section 9.

### 6.1 `sg_contacts` (Phase 1, the spine)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `email_normalized` | text | lowercased/trimmed; nullable |
| `phone_normalized` | text | E.164 SG; nullable |
| `display_name` | text | may be masked pre-pick |
| `is_shared_identifier` | boolean | true if flagged family/office line; excludes from auto-merge |
| `first_seen_at` | timestamptz | |
| `last_activity_at` | timestamptz | |
| `pii_released` | boolean | per-agent release tracked on the thread, not globally trusted; this flag is a convenience, the gate is enforced per request |
| `lawful_basis` | text | records the consent basis that justified persistence (8.1) |
| `retention_due_at` | timestamptz | consent-lifecycle-driven purge clock (6.13) |
| `created_by_run_id` | text | provenance |
| unique | `(email_normalized)` partial, `(phone_normalized)` partial | dedup keys; resolution routes collisions to merge, never a failing insert (5.13) |

`resolve_contact(email, phone)` RPC implements phone-first-then-email precedence and the merge/review routing of 5.13.

### 6.2 `sg_inbox_threads` (Phase 1)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `contact_id` | uuid FK → `sg_contacts` | nullable until resolved |
| `agent_id` | FK → `sg_agents` | owning agent |
| `lead_id` | FK → `sg_leads` | nullable |
| `shortlist_id` | FK → `sg_lead_shortlist` | nullable |
| `source` | text enum | `sell_lead/email/whatsapp/planner` (buyer/portal reserved, not built) |
| `status` | text | mirrors/extends shortlist status |
| `last_inbound_at` / `last_outbound_at` | timestamptz | drive `needs_reply` |
| `sla_due_at` | timestamptz | computed from config (5.1) |
| `assigned_agent_id` | FK | nullable |
| `created_at` / `updated_at` | timestamptz | |

Indexes: `(agent_id, status, sla_due_at)`, `(contact_id)`, `(assigned_agent_id)`.

### 6.3 `sg_inbox_messages` (Phase 1, channel-agnostic)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `thread_id` | uuid FK | |
| `contact_id` | uuid FK | denormalized for timeline |
| `channel` | text enum | `email/whatsapp/note/system` |
| `direction` | text enum | `in/out/internal` |
| `body` | text | held/masked pre-pick per 5.11 |
| `provider_message_id` | text | **UNIQUE** (idempotency); joins delivery status |
| `email_message_id_hash` | text | hash of the RFC `Message-ID` header for provider-less email idempotency; **UNIQUE** partial where channel='email' |
| `auth_result` | text | `spf/dkim/dmarc` pass/fail summary for inbound email (7.2) |
| `delivery_status` | text | delivered/read/bounced/complained/failed |
| `attachments` | jsonb | Storage refs (6.14) |
| `sent_by_agent_id` | FK | nullable |
| `created_at` | timestamptz | |

Ingestion is upsert-on-conflict-do-nothing against the unique keys (7.6). Indexes: `(thread_id, created_at)`, `(contact_id, created_at)`, unique `(provider_message_id)`.

### 6.4 to 6.8 (Phase 1)
- `sg_inbox_labels(id, agent_id nullable for system, key, name, kind system|custom, created_at)` and `sg_inbox_thread_labels(thread_id, label_id, applied_by, applied_at)` PK `(thread_id, label_id)`.
- `sg_inbox_assignments(id, thread_id, assignee_agent_id, assigned_by, assigned_at, unassigned_at)`. Same-team constraint enforced in route layer; departure reverts assignments (5.5).
- `sg_inbox_notes(id, thread_id nullable, contact_id nullable, author_agent_id, body, mentions jsonb, created_at)`. Internal only.
- `sg_contact_consents(id, contact_id, channel email|whatsapp, consent_class transactional|marketing, state opted_in|unsubscribed|dnc|bounced|complained, source, updated_at)`; unique `(contact_id, channel, consent_class)`. Two distinct classes (5.8).
- `sg_inbox_draft_feedback(id, thread_id, agent_id, model, tokens_in, tokens_out, provenance jsonb, verdict thumbs_up|edited|discarded, edit_distance, created_at)`. Doubles as the CEA/audit record; retained under the CEA clock, not the PDPA-purge clock (6.13).

### 6.9 `sg_contact_merges` (Phase 1, new; merge audit)
`(id, survivor_contact_id, retired_contact_id, matched_on email|phone|manual, decided_by system|operator, repointed_counts jsonb, created_at)`. Written on every merge (5.13).

### 6.10 Changed / reused tables

| Table | Change | Reason |
|---|---|---|
| `sg_lead_events` | add nullable `contact_id`; backfill via resolution (6.12); give `wa_inbound` a home (link `from` → contact). Note: `wa_inbound` is **resolution-ready plumbing** that only carries live data once WhatsApp is provisioned in Phase 2 | de-orphan inbound WhatsApp |
| `sg_lead_notifications` | add nullable `contact_id`; keep lead-keyed ledger | timeline join |
| `sg_viewings` (Planner) | **verify via MCP that it stores a resolvable seller email/phone**; if it stores only `agent_cea_no` and no seller identifier, add a nullable seller-contact identifier at booking or resolve via the parent lead; do not assume "booking email/phone" exists | unify Planner requests without a false assumption |
| calendar OAuth (`20260713000006/07`) | **token/refresh plumbing reused**; verification tier NOT reused (Gmail is restricted-scope, 4.4/7.3) | own-mailbox phase (likely descoped) |
| `sg_leads`, `sg_lead_shortlist`, `sg_lead_quotes`, `sg_lead_completions` | verify live columns via MCP, snapshot into migrations; add per-agent SLA override column (5.1); no destructive change | reproducibility + SLA config |
| `sg_agents` | add nullable `whatsapp_opt_in_at` (already present per profile route); add notification preferences + quiet-hours columns | fan-out control (5.7) |

### 6.11 RLS matrix

| Table | Anon | Authenticated (RLS) | Access path |
|---|---|---|---|
| all `sg_inbox_*`, `sg_contacts`, `sg_contact_consents`, `sg_contact_merges` | deny | deny (no policy) | service-role via session-gated routes only |
| webhooks (inbound email/WhatsApp/Resend) | n/a | n/a | service-role, HMAC-verified endpoints |

No column-level anon grants for PII columns.

### 6.12 Migration and backfill plan (Phase 1, new; resolves the "asserted but unspecified" gap)

- **Ordering:** (1) create new tables; (2) add nullable `contact_id` columns to `sg_lead_events`, `sg_lead_notifications`; (3) backfill contacts from `sg_leads`; (4) create threads from `sg_lead_shortlist` rows; (5) link events/notifications/viewings to contacts.
- **Idempotent, batched functions**, each `run_id`-isolated (matching the codebase's existing run_id habit) with a stable batch cursor:
  - `backfill_contacts()`: resolve each `sg_leads` row into `sg_contacts` via `resolve_contact`; safe to re-run (upsert on the partial-unique keys, merges via 5.13).
  - `backfill_threads()`: one `sg_inbox_threads` row per existing `sg_lead_shortlist` row (keyed by `shortlist_id`, so re-running does not duplicate).
  - `backfill_event_links()`: set `contact_id` on `sg_lead_events` and `sg_lead_notifications` via resolution; skip rows already linked.
  - `wa_inbound` rows carry only a phone `from`: resolve by phone; if no match, leave unlinked and available to the unmatched queue. This is plumbing; most `wa_inbound` volume arrives only post Phase-2.
- **Dry-run reconciliation:** each function has a count-only mode that reports expected vs actual row counts before commit; a backfill is accepted only if counts reconcile.
- **Re-run safety:** every function is a no-op on a second run (keyed upserts, skip-if-linked).
- **Rollback:** the new tables and nullable columns are additive; rollback drops the new tables and the nullable columns, leaving the pre-existing lead flow untouched. No destructive change to `sg_lead_*`.

**Acceptance criteria.**
- AC1. Post-backfill, the count of `sg_inbox_threads` equals the count of `sg_lead_shortlist` rows (one-to-one), reconciled by the dry-run report.
- AC2. Re-running any backfill function produces zero new rows and zero errors.
- AC3. Rollback removes new tables/columns without altering `sg_lead_*` data.

### 6.13 Retention and purge policy (Phase 1, new; resolves the retention-vs-audit conflict)

- **Per-table clocks, not one global N.** Consent-lifecycle-driven, not arbitrary:
  - `sg_contacts` + `sg_inbox_messages` (PII content): purge or anonymize when the linked lead(s) close with no active engagement and consent lapses (`retention_due_at`). Anonymize (null out PII, keep the row skeleton) rather than hard-delete, to preserve referential integrity with `sg_lead_completions`.
  - `sg_inbox_draft_feedback` (CEA audit): retained under the **CEA record-keeping clock**, which supersedes the PDPA-purge clock for these rows. These are advertising/record-keeping artifacts and are anonymized (agent-facing, minimal seller PII by design) rather than destroyed.
- **FK on-delete:** `restrict` or `set null` with anonymization, never `cascade`-destroy an audit record. A PDPA purge nulls PII fields; it does not delete the CEA audit row.

**Acceptance criteria.**
- AC1. A PDPA purge on a closed lead nulls seller PII in `sg_contacts`/`sg_inbox_messages` while preserving the required CEA fields in `sg_inbox_draft_feedback`.
- AC2. No purge cascade destroys a row referenced by `sg_lead_completions`.

### 6.14 Attachments storage (Phase 1, new)
- A dedicated Supabase Storage bucket, service-role-only access, delivery via signed URLs.
- Max size cap (for example 15 MB), MIME allowlist (pdf/jpeg/png/common docs), and a scan/quarantine step for inbound email attachments before they attach to a timeline.

**Acceptance criteria.**
- AC1. An oversized or disallowed-MIME inbound attachment is rejected/quarantined, not attached.
- AC2. Attachment URLs are signed and time-limited; no public bucket read.

---

## 7. Architecture and integrations

### 7.1 WhatsApp Cloud API (Phase 2)
- Wrapper `app/lib/whatsapp.ts` (Graph API v20.0, FC's own WABA). Extend for free-form **utility** replies inside the 24h customer-service window; outside the window, approved **utility** templates only. **No marketing/re-engagement templates until the separate marketing consent + Spam Control Act guardrails exist (8.3).**
- Inbound webhook `app/api/webhook/whatsapp/route.ts` (Meta HMAC via `WHATSAPP_APP_SECRET`): resolve `wa_inbound.from` → `sg_contacts` → attach to the right thread; unresolved → unmatched queue. Idempotent on `provider_message_id`.
- **AI draft is never auto-dispatched over WhatsApp** (keeps FC outside Meta's Jan-15-2026 third-party-AI-chatbot restriction). Every WhatsApp message is human-reviewed.
- Every send `isWhatsAppLive()`-gated + per-account monthly budget cap.
- Provisioning (backlog #39) is the owner Meta-ops gate; until done, the channel dry-runs.

**Acceptance criterion.** AC: no code path dispatches an AI draft to WhatsApp without an explicit human send action.

### 7.2 Email inbound-parse webhook (Phase 1; chosen provider: Resend)
- Why Resend: already the preferred outbound provider, Svix-style webhook plumbing exists, `sg_agents.email_status` grading is wired. Resend Inbound (MX-routed parse) is the Phase-1 mechanism.
- Flow: inbound email → Resend inbound webhook → HMAC verify → **SPF/DKIM/DMARC check** → parse (from, subject, text/html, Message-ID, References/In-Reply-To) → resolve contact → append `sg_inbox_messages(channel='email', direction='in')`, **masked pre-pick (5.11)** → thread via validated `In-Reply-To`/`References` (7.6, 5.14), else new thread.
- Auth failures → unverified operator queue, never a timeline.
- Idempotency: unique `provider_message_id` and, for provider-less inbound, unique `email_message_id_hash`.
- Fallback (open decision 8 in Section 12): dedicated mailbox/IMAP or per-agent forwarding addresses if Resend inbound threading proves insufficient.
- The existing delivery webhook remains for bounce/complaint → suppression + email_status.

### 7.3 OAuth pattern reuse (Phase 3, likely descoped)
- Only the token store / refresh / provider abstraction from the calendar OAuth (`20260713000006/07`) is reusable. Gmail is a **restricted** scope requiring annual CASA Tier 2, Limited Use attestation, and a longer verification cycle (4.4). Not gated on "reuse the pattern"; gated on a standalone security-assessment budget and a resolved third-party-correspondent lawful basis. Default: descoped.

### 7.4 AI drafting (Phase 0)
- Model = Claude via Anthropic Messages API (`app/lib/draft-reply.ts`), `anthropic-version: 2023-06-01`, model configurable via `CLAUDE_DRAFT_MODEL`, `max_tokens: 400`.
- **Model-id verification is a launch-blocking task:** verify the configured id resolves against the Anthropic Models API for the target account before go-live. Do not assume `claude-sonnet-5` is a valid id; the current default is treated as a placeholder until verified.
- **PII minimization:** the prompt omits seller name/contact identifiers, substituting a neutral token (5.4 AC7). Anthropic is a declared PII sub-processor only insofar as any residual free-text leaks; the design target is zero seller PII in the payload.
- Prompt: deterministic `buildDraftPrompt()`; hard honesty rules; no history, no voice model.
- Cost control: `max_tokens` cap, per-agent monthly draft cap, one guardrail-lint retry only, generation counted + audited.
- Failure/inert: 503 until `ANTHROPIC_API_KEY`; loading/retry/timeout states per 5.4.

### 7.5 Realtime updates (Phase 1)
- Supabase Realtime (or polling) on `sg_inbox_threads`/`sg_inbox_messages` scoped to the agent, authorized server-side; no anon subscription to PII tables (subscribe to a filtered non-PII projection or push via server-sent events from a session-gated route). **On disconnect, fall back to polling (5.14).**

### 7.6 Ingestion sequence (per inbound event; idempotent)
1. Webhook verifies HMAC (Resend / Meta).
2. For email, verify SPF/DKIM/DMARC; on fail, route to unverified queue and stop.
3. Idempotency check: if `provider_message_id` (or `email_message_id_hash`) already exists, do nothing and return 200.
4. Normalize identity → `resolve_contact()` (phone-first, merge/review per 5.13).
5. Upsert-on-conflict-do-nothing `sg_inbox_messages`; attach to a validated thread (else new thread); mask pre-pick per 5.11.
6. Recompute deterministic labels in-transaction.
7. Check suppression before any response (there is none pre-pick).
8. Fire notification (deduped per `(event_id, agent_id, channel)`, budget-capped, `isWhatsAppLive()`-gated).

---

## 8. Compliance and security

### 8.1 PDPA (Singapore)
| Obligation | Implementation |
|---|---|
| Lawful basis for the **persistent contact spine** | **Hard Phase-1-entry gate.** Building `sg_contacts` and cross-sale identity resolution is a new purpose (persistent CRM/profiling) beyond the original `/sell` connect-me consent. Before build: establish the lawful basis and update the `/sell` collection notice to name this purpose (persistent contact record, cross-sale resolution, relationship timeline). Do not merge unrelated `/sell` submissions into one durable profile without this basis. |
| Consent | `/sell` per-channel checkboxes → `sg_contact_consents`, split into transactional and marketing classes (5.8); agent WhatsApp opt-in only on own-number entry. |
| Purpose limitation | Contact data used only to connect the seller with shortlisted agents and service the lead; notes/AI prompts never repurpose PII for marketing. |
| Notification | Purpose stated at collection on `/sell`, updated to cover the persistent record. |
| Access / correction | Contact + timeline queryable; correction path via operator. |
| Retention limitation | Consent-lifecycle-driven per-table clocks (6.13), not an arbitrary global N; CEA audit rows on their own clock. |
| Do-Not-Contact | `sg_contact_consents.dnc/unsubscribed` short-circuits sends; DNC Registry check gates any future SMS/voice marketing (5.10). |
| Data breach | Access confined to service-role routes; audit logging on PII release; breach runbook. |
| Pre-pick PII gate | Preserved and extended to inbound content and to team assignees (5.11, 5.5). |
| **Transfer limitation (reframed per compliance review)** | The real obligation is not in-country residency but comparable-protection for overseas recipients. Execute DPAs + comparable-protection assurances for **Supabase, Anthropic, Resend, Meta, and (if pursued) Google**, plus a short transfer impact assessment. Region choice is a risk-reduction preference, not a legal prerequisite. |
| DPO sign-off | Required before any Phase-1 PII store goes live; a hard gate, not a Phase-1 open item. |

### 8.2 CEA (record-keeping and advertising)
- AI drafts obey `cea-advert.ts` rules; every generation writes an audit row supporting CEA record-keeping and defensible claims.
- **Co-branded seller report (Should):** it is marketing material distributed on behalf of a CEA-registered agent, so it must carry the mandatory advertiser identifiers: agent name + CEA registration number, agency name + agency licence number, and no misleading claims. Run it through `cea-advert.ts` **and** enforce these identifier fields.
- **URA data:** confirm FairComparisons' URA/REALIS data rights permit redistribution inside an agent-branded outbound document (a different use than on-site display). If rights are unclear, restrict the report to HDB open data + first-party AgentScore.

### 8.3 Meta / WhatsApp policy
- FC's own WABA only, opt-in enforced (`reachability.ts`), notification-only utility templates carry no seller PII, no auto-reply, no personal-WhatsApp ingest, respect the 24h window + per-message billing, never route through unofficial libraries.
- **Marketing/re-engagement is a separate consent class** with Meta-compliant business-named opt-in wording (not a bundled `/sell` checkbox) and Spam Control Act guardrails (working opt-out + sender identification in the message). Out of scope until in place.
- **AI draft is never auto-dispatched over WhatsApp** (7.1), keeping FC outside Meta's Jan-15-2026 third-party-AI-chatbot restriction.

### 8.4 Data residency and PII handling
- Reframed to transfer-limitation compliance (8.1). PII columns never exposed to anon, never in URLs/query strings, never fed to marketing tools; server writes via `supabaseAdmin` only.

### 8.5 Email deliverability hazard (documented)
- Klaviyo fallback silently drops emails whose metric has no live Flow. Keep `RESEND_API_KEY` set; treat any unset-Resend state as P1. Gate dormant senders (`OUTREACH_ENABLED`-style) so a provider swap cannot resurrect a drip cron (prior incident: 1,042 phantom outreach rows).

---

## 9. Metrics and instrumentation

### 9.1 North Star (redefined per the send-path reality)
**Number of FairComparisons leads that receive a first agent response action within SLA, per week,** where a response action is `quote_submitted` OR `draft_copied` OR `draft_marked_sent` (5.12). "Reply sent" is an explicit proxy for intent-to-reply, not confirmed delivery, until Phase-1 email / Phase-2 WhatsApp provide a real outbound message row. The "per week" denomination is a **throughput** measure, not a claim of daily active use.

### 9.2 Input metrics (re-baselined after Gate A)
| Metric | Definition | Target |
|---|---|---|
| Gate-A frequency | median leads-received-per-active-agent-per-week over 90 days | measured before Phase-1 scoping; drives cadence design |
| Setup rate | % of claimed/lead-receiving agents with alerts on + reply channel confirmed | rising |
| Aha rate | % of set-up agents performing a first response action on a real lead | rising |
| Habit rate | % performing a response action on 2+ distinct leads within 30 days | rising (bar finalized post Gate A) |
| Median first-response latency | per lead | falling |
| Draft acceptance | copied/marked-sent vs discarded (edit-distance as trust proxy) | high |
| **`not_picked` churn cohort** | retention of agents whose drafted-and-responded lead was not picked, vs the winning cohort | no material collapse (Gate B kill signal) |
| Feature retention | steady-state % of adopted agents still performing response actions at the true lead cadence | bar set post Gate A |
| Adoption | % of **lead-receiving claimed** agents actively using the Inbox (never all CEA agents) | set post Gate A |
| Contact-resolution coverage (Phase 1) | % of inbound events linked to a contact | high |
| Backfill reconciliation (Phase 1) | dry-run expected vs actual counts | 100% before commit |
| Free→paid conversion | at draft cap and Verified→Professional | monitored |

### 9.3 Events to log
`inbox_setup_done`, `draft_generated`, `draft_copied`, `draft_marked_sent`, `quote_submitted`, `draft_thumbs`/`draft_edited`/`draft_discarded`, `lead_not_picked` (churn cohort), `thread_assigned`, `note_added`, `mention_created`, `label_applied`, `notification_fired`, `notification_deeplink_opened`, `pii_released`, `consent_changed`, `suppression_hit`, `contact_merged`, `merge_review_enqueued`, `inbound_auth_failed`, `upgrade_prompt_shown`, `upgrade_prompt_clicked`, `whatsapp_send_suppressed_budget`. Denominator for all adoption reporting = claimed/lead-receiving agents.

### 9.4 Analytics validation (new)
Before Phase-0 launch reporting is trusted, run an analytics-QA pass: assert each event in 9.3 fires exactly once against the right denominator, replay a webhook to confirm no double-count, and confirm the North Star query counts a lead as responded if and only if a response action exists within SLA. No launch dashboard ships until this passes.

---

## 10. Dependencies and sequencing

| Phase | Depends on |
|---|---|
| Phase 0 | Supabase MCP access to read live `sg_lead_*` + `sg_viewings` columns; `ANTHROPIC_API_KEY` provisioned + model-id verified; reply-sent proxy (5.12); existing `sg_lead_notifications` + `reachability.ts`; founder decision on free draft allowance; **Gate A measurement**; **Gate B pre-registration** |
| Phase 1 (gated) | **Gates A and B passed**; PDPA lawful basis + updated `/sell` notice for the persistent spine + DPO sign-off; `sg_contacts` + resolution (5.13); inbound-email mechanism decision; transfer-limitation DPAs; `tiers.ts` packaging decision |
| Phase 2 (deferred) | Phase-1 retained repeat usage; Meta business verification + backlog #39; budget-cap + spend-monitoring infra; utility-only + human-reviewed posture; opt-in model |
| Phase 3 (likely descoped) | Standalone CASA/Limited-Use budget; resolved third-party-correspondent lawful basis; founder + DPO go/no-go; Phase-1 retention proven |

Sequencing rule: gate the spine on Gate A + Gate B; gate Phases 2 to 3 on proven Phase-1 retention. Do not build channel depth before the core wedge retains.

---

## 11. Risks and mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Frequency fallacy** (daily-habit thesis unsupported by 7-way-fan-out volume) | High | Gate A measures true cadence before Phase-1 scoping; design defaults to per-lead/weekly; no daily-loop copy or metrics until data justifies it. |
| **Loss graveyard** (median agent loses ~6/7, inbox trains disappointment) | High | Anchor value on the cumulative owned record (1.4); instrument the `not_picked` churn cohort as a Gate-B kill signal; consider shrinking the shortlist / lead exclusivity (open decision 12.9). |
| **Wedge drift** (CRM breadth swallowing the sharp bet) | High | Phase 0 is the only committed build; the spine/timeline/email/Gmail are gated, not pre-committed; positioning is "win the leads we send you." |
| **Over-platforming before PMF** | High | Gate B blocks any `sg_contacts` code until the wedge retains. |
| Trust-fragility of AI draft (one wrong fact burns core-accuracy trust) | High (existential) | Fact-grounded + editable + never-auto-send + guardrail lint + provenance line + thumbs/edit + PII-minimized prompt. |
| Relationship leakage (conversation migrates to personal WhatsApp) | Structural | Retention rests on the owned record, not on owning the deep conversation. |
| Opex creep (Claude tokens, Meta per-message, nudge cadence) | High | Hard per-agent draft cap + per-account WhatsApp budget cap + template discipline + `isWhatsAppLive()` gate + notification dedup/quiet hours. |
| Data-model fragility (`sg_lead_*` not in migrations; spine net-new) | High | Verify live columns via MCP; snapshot into migrations; specify backfill/rollback (6.12). |
| **PDPA lawful basis for the persistent spine** | High | Establish basis + updated `/sell` notice + DPO sign-off as a hard Phase-1-entry gate; retention tied to consent lifecycle. |
| **Inbound PII leak around the pre-pick gate** | High | Extend the gate to inbound content/identifiers; mask/hold pre-pick (5.11). |
| **Cross-border PII to Anthropic** | Medium | PII-minimized prompt; declare Anthropic as sub-processor; DPA + transfer assessment. |
| **WhatsApp marketing = unsolicited commercial message** | Medium | Utility-only inside 24h window; separate marketing consent class + Spam Control Act guardrails before any re-engagement. |
| **Gmail restricted-scope + third-party PII** | Medium | Reframed as likely-descoped; distinct CASA/Limited-Use track; agent-as-controller + DPA if ever pursued; drop auto-labeling on Gmail content. |
| Webhook duplication (Meta/Resend retries) | Medium | Unique `provider_message_id`/`email_message_id_hash`; upsert-do-nothing; notification dedup (7.6). |
| Inbound email spoofing | Medium | SPF/DKIM/DMARC enforcement + unverified queue + references validation (7.2). |
| Meta-ops activation gate (#39) | Medium | Sell wa.me as the honest WhatsApp story until `isWhatsAppLive()`; never market two-way before it is true. |
| Wrong-denominator reporting | Medium | Always measure vs claimed/lead-receiving agents, at response-action level, re-baselined after Gate A. |
| Klaviyo silent-drop deliverability | Medium | Keep `RESEND_API_KEY` set; gate dormant senders; audit call sites before any provider swap. |

---

## 12. Open decisions for the founder

1. **Scope-ambition fork.** Stop at the FC-scoped wedge (Phase 0) as the durable product, or proceed to the spine/inbox (Phase 1) once Gates A and B pass? Recommendation: commit only Phase 0 now; gate everything heavier.
2. **Gate B threshold.** Confirm the pre-registered retention bar (provisional: 50% of lead-receiving agents performing a response action per active lead-week for four consecutive weeks, with no `not_picked` retention collapse).
3. **Free/paid line.** Exact free monthly AI-draft allowance (e.g. 10) and which capabilities gate at Verified S$29 / Professional S$69 / Elite S$149. Non-negotiable: never gate the seller's first reply, the base inbox, or ranking.
4. **Provision the FC WhatsApp Business number now** (trigger backlog #39 + budget cap) or defer and ship wa.me only until Phase-1 retention is proven? Recommendation: defer.
5. **PDPA lawful basis and `/sell` notice** for the persistent contact spine and cross-sale resolution: approve the updated collection notice and secure DPO sign-off as a Phase-1-entry gate.
6. **Transfer-limitation compliance** (reframed from residency): approve DPAs + comparable-protection assurances + a transfer impact assessment for Supabase, Anthropic, Resend, Meta, and (if pursued) Google.
7. **Inbound email mechanism (Phase 1):** Resend inbound parse vs dedicated mailbox/IMAP vs per-agent forwarding addresses.
8. **Response-time-into-standing:** do we let genuine responsiveness influence shortlist standing / the guarantee-reachable pool, and if so, how do we keep it demonstrably fairness-audited and NOT pay-to-rank?
9. **Shortlist size / lead exclusivity (new, per product review):** does the current 7-way fan-out make the inbox a loss graveyard, and should we shrink the shortlist or introduce time-boxed lead exclusivity so replying feels winnable? This is a marketplace-level change outside inbox scope but directly conditions inbox retention.
10. **Phase 3 Gmail:** pursue the restricted-scope CASA/Limited-Use track with a real recurring budget and a resolved third-party lawful basis, or permanently descope? Recommendation: descope until Phase 1 clearly retains.

---

## 13. Rollout, feature-flags, and QA plan

### 13.1 Inert-until-creds discipline (feature-flag posture per capability)
Every external capability ships code-complete but gated by an explicit flag/env:
- AI draft: 503 until `ANTHROPIC_API_KEY` (and model-id verified).
- Reply-sent proxy: always on in Phase 0 (no external dependency).
- Inbound email: no-op until Resend inbound + `RESEND_WEBHOOK_SECRET` configured (Phase 1).
- WhatsApp: dry-run until `isWhatsAppLive()` true (backlog #39) + opt-in (Phase 2).
- Contact spine / unified inbox: behind a `INBOX_SPINE_ENABLED` flag, off until Gates A and B pass and DPO sign-off is recorded.
- No user-facing copy asserts a channel is live unless its gate returns true.

### 13.2 Staged rollout sequence
1. **Phase 0 internal:** enable AI drafts + reply-sent proxy for a handful of top-decile FC responders (concierge onboard, first response action on a real lead = aha). Instrument Setup/Aha/Habit + not_picked cohort; run the analytics-validation pass (9.4).
2. **Phase 0 cohort:** roll drafts + money-at-risk sort to all claimed lead-receiving agents; turn on upgrade prompts at the cap and aha moment. **Run Gate A measurement.**
3. **Gate B decision:** review the pre-registered retention bar. Only on pass, and with DPO sign-off + updated `/sell` notice, flip `INBOX_SPINE_ENABLED` and begin Phase 1.
4. **Phase 1:** run backfill in dry-run first (6.12), reconcile counts, then commit; ship `sg_contacts` + unified Inbox + inbound email + timeline to the cohort; enforce free/paid in `tiers.ts`; add assign/notes for Professional; weekly digest.
5. **Phase 2:** only after Phase-1 retained repeat usage; utility-only FC WhatsApp (Elite), budget-capped.
6. **Phase 3:** default descoped; revisit only on explicit founder + DPO go/no-go.

### 13.3 QA and test plan (AC-to-test mapping)
- **Unit/integration:** each AC in Section 5 maps to a test. Priority set: 5.4 (guardrail lint, PII-free payload, 503, timeout), 5.11 (pre-pick masking including inbound content and team assignee), 5.12 (proxy events fire once), 5.13 (email→A/phone→B collision does not throw; merge repoints; idempotent), 5.14 (spoofed-From quarantine, references mismatch, webhook replay idempotency, Realtime fallback), 6.12 (backfill reconciles, re-run no-op, rollback clean), 6.13 (purge preserves CEA audit fields).
- **Analytics QA (9.4):** replay webhooks; assert single-count; assert North Star counting rule.
- **Post-deploy checks (per standing rule):** verify via Browser (not curl); confirm inert gates return the expected 503/dry-run in prod; confirm no PII exposed pre-pick (including inbound content and to a same-team assignee); confirm no anon read on `sg_inbox_*`; confirm no operator-identity leak in any deployed scratch/dot-dir.
- **Rollback drill:** exercise the Phase-1 rollback (6.12) in staging before the production backfill.

### 13.4 Cohort and success gates
- **Cohort 1:** top-decile FC responders (highest severity, most leads).
- **Gate to Phase 1:** Gates A and B passed; zero invented-fact drafts in the audit; DPO sign-off + updated `/sell` notice recorded.
- **Gate to Phase 2:** Phase-1 feature retention at the true lead cadence meets the post-Gate-A bar.
- **Rollback:** any AI-draft accuracy incident or notification mis-fire pauses the affected capability (feature flag) while the guardrail/trigger is fixed; the core inbox stays up.

**Positioning (all agent-facing surfaces):** "Win the leads we send you. Reply first. Never drop one." Lead with the painful job and the alternative ("stop losing leads scattered across WhatsApp, Gmail and portals"), name the honest scope ("every FairComparisons lead in one place," never "your whole WhatsApp"), keep wa.me as the explicit escape hatch, and never imply a daily loop the lead volume cannot sustain.

---

## 14. Changes from adversarial review

Grouped by the reviewer that raised each point. "Actioned" means the spec now reflects it; "partially" and "not actioned" are explained.

### 14.1 Product skeptic (Review 3)
- **Frequency fallacy (critical): actioned.** Removed all "daily habit / daily-open" framing. Added the frequency reality (1.2), redefined the loop as per-lead and event-triggered (Section 3), added **Gate A** (measure leads-per-active-agent-per-week over 90 days) as a blocking pre-Phase-1 step (4.1, 9.2, 10), and re-baselined all activation targets after Gate A. The North Star "per week" is now explicitly a throughput measure, not a DAU claim. I did not embed a specific volume number in the doc because I did not run the production query as part of authoring this PRD; instead the measurement is codified as a launch-blocking gate with a decision tree, which is the reviewer's requested fix and avoids shipping a stale figure.
- **Loss graveyard (critical): actioned.** Added win-rate reality (1.2), moved the retention thesis onto the cumulative owned record (1.4), instrumented a `not_picked` churn cohort as a Gate-B kill signal (9.2), and raised shortlist-size / lead-exclusivity as founder open decision 12.9. Committing an actual change to the 7-way fan-out is deliberately left as an open decision, not a spec change, because it is a marketplace-wide mechanism outside the inbox's build surface; flagging it is the right altitude here.
- **Wedge drift (high): actioned.** Renamed the product framing to "Win the leads we send you," made Phase 0 (grounded draft + money-at-risk + SLA aging on the existing feed) the only committed build, and demoted the contact spine, inbox unification, inbound email, timeline, and Gmail to gated phases (Section 4). Retained the "Unified Inbox" as the doc's descriptive title but subordinated it to the wedge positioning, since the SCOPE mandate explicitly asks us to architect for the later inbox.
- **Wrong first bet / over-platforming (high): actioned.** Moved `sg_contacts` and identity resolution out of Phase 0 into gated Phase 1, and added **Gate B**, a pre-registered retention bar that must pass before any spine code (4.1, 10, 13). This is a substantive change from the draft, which had the spine as a Phase-0 Must.
- Review 3 was truncated mid-finding; I actioned the fully stated portion (the Gate-B pre-registration concept) and did not invent additional findings beyond what was legible.

### 14.2 Compliance / SG legal (Review 2)
- **Gmail restricted-scope understatement (high): actioned.** Rewrote 4.4 and 7.3 to split token-plumbing reuse from the restricted-scope verification track (annual CASA Tier 2, Limited Use, longer verification, recurring cost), and reframed Phase 3 as an open compliance question, default descoped.
- **Gmail third-party-PII inconsistency (high): actioned.** Applied the same no-go logic used for personal WhatsApp; if ever pursued, agent-as-controller + FC-as-processor under a DPA + a correspondent lawful basis; dropped auto-labeling on Gmail content (Limited Use).
- **Persistent contact spine lawful basis (high): actioned.** Made the PDPA lawful basis + updated `/sell` collection notice + DPO sign-off a hard Phase-1-entry gate (8.1, 10, 13.4), tied retention to the consent lifecycle (6.13), and barred silent cross-sale merges without a fresh basis.
- **WhatsApp marketing = unsolicited commercial message (high): actioned.** Restricted FC WABA to utility/transactional inside the 24h window, split consent into transactional vs marketing classes (5.8, 6.7), and pushed re-engagement templates out of scope until Meta-compliant business-named opt-in + Spam Control Act guardrails exist (4.3, 8.3).
- **Pre-pick gate leak via inbound channels (moderate): actioned.** Extended 5.11 to inbound message content and identifiers (mask/hold pre-pick), with ACs.
- **Anthropic as undeclared sub-processor + PII in prompt (moderate): actioned.** Added PII minimization (neutral token for seller name), a test AC that the payload carries no seller PII (5.4 AC7), and declared Anthropic in the transfer-limitation set (8.1). Added the model-id verification launch gate (7.4).
- **Co-branded report CEA advertising + URA redistribution (moderate): actioned.** Required CEA advertiser identifiers on the report and a URA redistribution-rights check, falling back to HDB open data + AgentScore if rights are unclear (8.2).
- **DNC Registry (moderate): actioned.** Added the DNC Registry obligation for any future SMS/voice marketing and stated WhatsApp's grey status (5.10, 8.1).
- **Residency over-indexing (low): actioned.** Reframed from "which region" to transfer-limitation compliance (DPAs + comparable protection + transfer impact assessment); region is now a preference, not a prerequisite (8.1, 8.4, 12.6).
- **Meta AI-chatbot restriction on FC's own WABA (low): actioned.** Added the explicit Phase-2 rule that the AI draft is never auto-dispatched over WhatsApp, with an AC (7.1, 8.3).

### 14.3 Completeness / technical (Review 1)
- **North Star un-instrumentable / no send path (high): actioned.** Added Section 5.12 (reply-sent proxy: `draft_copied` + `quote_submitted` + optional "Mark as sent"), redefined the North Star and activation ladder on that proxy (9.1), moved the proxy into Phase 0, and stated plainly it is intent-to-reply, not confirmed delivery.
- **Identity-resolution merge/split conflicts (high): actioned.** Added Section 5.13 with phone-first precedence, a defined merge procedure, a `sg_contact_merges` audit table (6.9), a manual merge-review operator queue, shared-identifier handling, and ACs for the email→A/phone→B collision and the repoint.
- **Team assignment vs pre-pick PII gate (high): actioned.** Declared pick/PII-release **per-agent**, masked PII for all team members including assignees pre-pick, and added ACs (5.5).
- **Webhook idempotency/dedup (high): actioned.** Added UNIQUE `provider_message_id` and `email_message_id_hash`, upsert-do-nothing ingestion, notification dedup per `(event_id, agent_id, channel)`, and a replay AC (5.14, 6.3, 7.6).
- **Inbound email spoofing (high): actioned.** Required SPF/DKIM/DMARC pass, an unverified quarantine queue, and references-ownership validation, with ACs (5.14, 7.2).
- **Backfill/migration unspecified (high): actioned.** Added Section 6.12 (ordered, idempotent, batched, run_id-isolated functions; dry-run reconciliation; re-run no-op; rollback) with ACs.
- **"Buyer messages" phantom stream (med): actioned.** Struck buyer messages from the Phase-1 stream list and deferred them until a source exists (2.2, 4.2, 6.2).
- **Notification fan-out for teams (med): actioned.** Specified fan-out targets, one-primary-channel dedup, per-agent preferences, quiet hours, and a cap AC (5.7).
- **Loading/error/timeout states (med): actioned.** Added draft loading/retry/timeout, distinct list/thread error states, and Realtime polling fallback (5.4, 5.2, 5.14).
- **Pagination/virtualization (med): actioned.** Added keyset pagination and lazy timelines with a >200-thread AC (5.1, 5.3, 5.14).
- **Retention vs CEA audit conflict (med): actioned.** Added Section 6.13 (per-table clocks, anonymize-not-cascade, CEA clock supersedes PDPA purge for audit rows) with ACs.
- **Team-membership change (med): actioned.** Added departure handling: assignments revert, notes retained, PII visibility revoked (5.5).
- **Attachments (low): actioned.** Added Section 6.14 (bucket, service-role + signed URLs, size cap, MIME allowlist, scan/quarantine) with ACs.
- **Config/source gaps (low): actioned.** SLA config ownership (5.1), verify `sg_viewings` columns with a fallback (6.10), `/sell` consent checkbox added as a Phase-1 build item (4.2, 5.8), and WhatsApp block-event capture either implemented in Phase 2 or struck as a consent source (5.10).
- **Sequencing inconsistency (low): actioned.** Moved the proxy instrumentation into Phase 0 so Aha is measurable, and reframed Phase-0 `wa_inbound` work as resolution-ready plumbing that only carries live data post Phase-2 (4.1, 6.10).
- **Document truncation / missing sections (high): actioned.** Completed the compliance section, and added feature-flag/rollout, QA/test, and analytics-validation plans (13, 9.4) and an Open Decisions section importing all founder decisions with recommendations (12).

### 14.4 Deliberately not actioned (with reason)
- **Changing the 7-way shortlist fan-out in this PRD.** Raised as founder open decision 12.9 and instrumented via the `not_picked` cohort, but not specified as a build change, because it is a marketplace-matching mechanism outside the inbox's surface; deciding it inside an inbox PRD would overreach.
- **Removing the contact spine / unified inbox from the roadmap entirely** (the strongest reading of Review 3's "defer, do not phase"). Partially actioned: hard-gated behind Gates A and B rather than deleted. Reason: the SCOPE mandate is explicit that we architect for a later inbox and that the spine is the missing enabler; gating preserves optionality without pre-committing spend, which satisfies the reviewer's underlying concern (no build before retention is proven).
- **Asserting a specific model id** (`claude-sonnet-5`). Not actioned as an assertion; instead the id is treated as an unverified placeholder with a launch-blocking verification task (7.4). Reason: propagating a possibly-invalid id would repeat the exact defect the reviewer flagged.
- **Committing a specific Supabase region.** Not actioned as a mandate; reframed to transfer-limitation compliance (8.1). Reason: the compliance review correctly notes PDPA imposes comparable-protection, not residency, so committing a region would stall on the wrong control.