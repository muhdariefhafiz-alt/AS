<!-- /autoplan target: "Your standing" (full review) -->
# Plan: "Your standing" — agent-side value + retention engine

## Problem
The agent dashboard's headline value (seller enquiries, profile views, contact clicks)
is gated on consumer demand that does not exist yet at cold-start. An agent claims,
sees "No enquiries yet" and a paywall in front of empty analytics, and never returns.
Supply-side activation and retention are broken because value is demand-dependent.

## Premises (to be challenged in review)
1. Agents are status/rank-driven; seeing where they stand vs competitors on objective
   CEA data is a felt "superpower" (the real aha), independent of seller demand.
2. We uniquely hold complete CEA transaction data on every agent AND their competitors,
   plus a monthly refresh that creates real rank movement.
3. A weekly "your rank" loop can retain agents with zero sellers, buying us time to build
   the demand side (solves the marketplace chicken-and-egg from the controllable side).
4. The felt need the intel creates (who's ahead of me, how do I climb) is a stronger,
   more honest pull to paid than a demand-gated analytics wall.

## What already exists (leverage map)
- `sg_area_top_agents` (1,061 rows) + RPCs `get_top_agents_in_area_rich(area, lim)` and
  `get_top_agents_in_town_rich(town, lim)` — ranked agents per area/town. Rank is derivable.
- `get_agent_txn_record` / `get_agent_track_record` RPCs — per-agent transaction record.
- `calculate_agent_scores()` — sale-weighted AgentScore with components (sale-weighted
  volume, recency, breadth, years active, agency review standing) + `score_breakdown` jsonb,
  `percentile`, `sale_txns`, `seller_sales`, `primary_area` on `sg_agents`.
- Dashboard at `app/dashboard/` (agent session via `getAgentSession`), profile editor,
  `isPaid()` tier gating, subscriber tiers Free/Verified 29/Professional 69/Elite 149.
- Transactional email now sends via Resend (`app/lib/email.ts`).
- `sg_funnel_events` for instrumentation.

## The feature

### A. Your standing (the aha — free, un-gated, first screen on claim)
On the dashboard, above everything, for each of the agent's active area(s):
- Rank: "You are #7 of 214 HDB agents in Tampines."
- The #1 and the agent immediately above them (name + deal count), to create the gap.
- The single biggest lever on their score, computed from `score_breakdown` vs the area
  top-decile benchmark (e.g. "Recency is your biggest drag — last recorded deal 5 months ago"
  or "2 more seller-side sales in Bedok would crack the top 10").

### B. Score breakdown + how to climb (free teaser -> paid depth)
- Free: the five AgentScore components as a simple bar vs the area top-decile benchmark,
  plus the one headline lever.
- Verified (S$29): the full competitor table (who is above/below you in each area), all
  your areas, the ranked "climb plan", and the existing contact-click analytics.

### C. The weekly loop (retention engine)
- A "Your rank this week" email digest: rank moved +/-N, a competitor passed you, and X
  new deals recorded in your area(s). Manufactured loop (weekly send) riding the environment
  loop (monthly CEA data refresh moves ranks). Sent via the existing Resend path.
- Dashboard shows the same "what changed" strip on visit.

### Monetization ladder, re-pointed at the felt need
- Free: score + rank in one area + the top lever.
- Verified S$29: full competitor table, all areas, climb plan, contact-click analytics.
- Professional S$69: area market intelligence (where demand/prices are moving), seller-lead
  analytics.
- Elite S$149: reputation/badge tools + data exports.

## Journey (target)
- Setup: claim + verify + pick target area(s)/segment (reframe the profile editor as
  "unlock your standing").
- Aha: first view of rank + gap + top lever, in session 1, un-gated. Time-bound.
- Habit: returns to check standing/movement. Habit metric: >=3 standing-view opens in 14 days.
- Retention: weekly rank digest + monthly refresh movement.
- Monetization: felt need pulls to Verified.

## Scope

### In scope (MVP, phase 1)
- "Your standing" panel on the dashboard (rank + gap + top lever) from existing RPCs.
- Target-area selection in the profile editor (or inferred from `primary_area`).
- Free score-component bar vs area benchmark.
- Weekly rank digest email (cron + Resend), opt-out aware.
- Instrument activation (standing view in session 1) and habit (>=3 opens/14d) via
  `sg_funnel_events`.

### In scope (phase 2)
- Verified competitor table + climb plan (paid gate).
- "Rank changed" strip using a weekly snapshot table.

### NOT in scope (deferred)
- Off-platform outcome logging ("did you win this listing?") to raise ICED Control — later.
- Professional/Elite market-intelligence surfaces — later.
- Any change to how AgentScore is computed.

## Architecture (proposed)
- Rank + gap: server component in the dashboard calls `get_top_agents_in_area_rich` for the
  agent's area(s), finds the agent's position, and the neighbor above + the #1. Cache per
  area (revalidate daily; ranks only move on the monthly refresh).
- Weekly snapshot: a small `sg_agent_rank_snapshots` table (agent_id, area, rank, score,
  week) written by a weekly cron, so "you moved +/-N" and "a competitor passed you" are
  diffable. ~38k agents x active areas x 1 row/week.
- Digest cron: weekly job builds per-agent digest from the latest two snapshots + new-txn
  counts, sends via `sendBatchEmails` (now Resend-aware), honors `email_unsubscribes`.
- No change to auth, tiers, or scoring.

## Risks / failure modes (to expand in review)
- Thin data: an agent with few/no recent transactions has no meaningful rank — must show
  "not enough recent activity to rank in [area]" honestly, never a fake position.
- Demotivation: telling a low-ranked agent they are #180 could churn them; frame around the
  climbable next step, not the absolute floor.
- Defamation/accuracy: rank is factual CEA-derived; keep framing factual, no editorializing.
- Snapshot cost + cron reliability at 38k agents.
- Digest as spam: frequency cap, clear value, easy opt-out.

## Success metrics
- Activation: % of claims that reach the standing view in session 1.
- Habit: % with >=3 standing-view opens in 14 days.
- Retention: week-4 return rate of claimed agents.
- Monetization: free -> Verified conversion attributable to the competitor-table gate.

---

# GSTACK REVIEW REPORT (/autoplan)

Pipeline: CEO -> Design -> Eng. DX skipped (no developer-facing surface).
Voices: Claude independent subagents. Codex unavailable -> [subagent-only].

## Review scores
- CEO (strategy/scope): activation diagnosis CORRECT; full engine over-scoped for the abundant side. [subagent-only]
- Design (UI/UX): strategy right, doc is not a build spec; 4 build-breaking gaps. [subagent-only]
- Eng (architecture): load-bearing rank mechanism is WRONG; needs a new set-based RPC. [subagent-only]

## Consensus tables

CEO
| Dimension | Verdict |
|---|---|
| Premises valid? | CHALLENGE (1,3,4 unevidenced; 2 "unique CEA data" likely false) |
| Right problem? | PARTIAL (activation fix yes; retaining the abundant side is wrong-side optimization) |
| Scope calibration? | NO (over-scoped; only phase-1-A is justified pre-validation) |
| Alternatives explored? | NO (seller-concierge, first-party reviews dismissed without analysis) |
| Competitive/legal risk? | UNDER-WEIGHTED (incumbent fast-follow; defamation on named rank + flawed score) |
| 6-month trajectory? | AT RISK (engine for the side we already had; no revenue/seller metric) |

Design
| Dimension | Verdict |
|---|---|
| Information hierarchy | FIX (standing collides with naked AgentScore card; absorb it, explicit order) |
| Missing states | CRITICAL (loading/empty/unranked/error/partial/multi-area/ties + digest degenerate states) |
| Emotional arc | CRITICAL (unranked = "you don't count"; mid-pack treadmill; need forward framing + tone gradient) |
| Specificity | CRITICAL (climb-plan schema, gap spec, ONE canonical rank def, reuse RankRow/ScoreBand) |

Eng
| Dimension | Verdict |
|---|---|
| Architecture sound? | NO (get_top_agents_in_area_rich is capped/mis-signatured/seller-ranked; sg_area_top_agents excludes long-tail) |
| Test coverage? | ABSENT (adopt the provided test matrix) |
| Performance? | RISK (38k snapshot cron blows the ~340s cap; must be one SQL set-based statement) |
| Security? | GATING PROTECTS PUBLIC DATA (sg_area_top_agents is public-read; reframe the paid value) |
| Error/area paths? | UNHANDLED (4 conflicting area taxonomies: town/general_location/district/primary_area) |
| Deployment? | CRON SLOT COLLISION at 0 1 * * *; test heaviest (import) week |

## Cross-phase themes (flagged independently by 2+ voices -> high confidence)
1. Weekly digest on MONTHLY-moving data (CEO+Design+Eng). Stale/fake movement 3 weeks in 4.
2. Named competitor + deal count = legal/accuracy exposure (CEO+Design).
3. The "rank" is ill-defined and possibly wrong (Eng: sg_area_top_agents.rank is seller-tier order, not AgentScore; CEO: score counts rentals as sales). Selling a "climb plan" on it is selling advice on known-bad data.
4. Over-built infra before validation (CEO+Eng): snapshot table + weekly cron before any evidence the loop retains.

## Decision Audit Trail (auto-decided via the 6 principles)
| # | Phase | Decision | Class | Principle | Rationale |
|---|---|---|---|---|---|
| 1 | Eng | Replace rank mechanism with a new set-based RPC get_agent_area_rank(reg, area_type, area_name) = rank() OVER (ORDER BY score DESC) over ALL area-active agents + count(*) denominator; do NOT reuse sg_area_top_agents.rank | Mechanical | P5 explicit | Current mechanism cannot yield "#7 of 214" and mislabels seller-tier as standing |
| 2 | Eng | Pin the area axis: HDB dominant -> area_type='town', else 'district'; identical inclusion filter for numerator+denominator | Mechanical | P5 | 4 taxonomies don't join; "#N of M" must be internally consistent |
| 3 | Eng+CEO | Digest fires on the MONTHLY refresh, movement sentence gated on a real non-zero diff; suppress no-change/unranked sends | Mechanical | P1 + no-fake-data | Weekly cadence on monthly signal fabricates movement |
| 4 | Eng | Snapshot = one SQL set-based INSERT in a DB function (statement_timeout 0), UNIQUE(agent_id,area_type,area_name,week) + ON CONFLICT, CRON_SECRET, off the 1am slot | Mechanical | P3/P5 | Per-agent Node loop at 38k blows the ~340s cap and isn't idempotent |
| 5 | Eng | New agent-digest audience (sg_agents claimed_email); do NOT reuse the consumer weekly-digest / sg_email_subscribers; one agent suppression source of truth | Mechanical | correctness | Reusing consumer digest emails the wrong people |
| 6 | Eng | Serve standing from the precomputed snapshot (single indexed row by agent_id), not live per request | Mechanical | efficiency | Avoids live ranking on every dashboard open |
| 7 | Eng | Reframe the paid gate to PERSONALIZED value (climb plan + your-position + contact analytics), not the public ranking table | Mechanical | correctness | sg_area_top_agents is already public-read; gating it protects nothing |
| 8 | Design | Full state matrix incl. an un-ranked FORWARD state ("one recorded seller-side deal puts you in the ranked top ~120"), never a floor/"#180" | Mechanical | P1 completeness | Cold-start majority hits the unranked state first |
| 9 | Design | ONE canonical rank definition (area+segment+denominator) shared by panel, competitor table, and digest | Mechanical | P5 | Divergent ranks across surfaces destroy trust |
| 10 | Design | Climb-plan item schema {lever, yourValue, benchmark, gapAsAction, projectedEffect, controllable}; <=3 steps; flag uncontrollable levers; reuse RankRow/ScoreBand/score bars | Mechanical | P1/P5 | The paid driver is currently a black box |
| 11 | Design | Absorb the naked AgentScore stat card into the standing panel; explicit dashboard order (standing -> what-changed -> enquiries -> activity) | Mechanical | P5 | Score appears twice, naked one first |
| 12 | Eng | Precompute per-area p90 component benchmarks in the same refresh; "biggest lever" = cheap subtraction | Mechanical | efficiency | No live per-area top-decile aggregate |
| 13 | Eng | Adopt the full test matrix (rank correctness, axis resolution, empty/thin, multi-area, digest diff dedup, opt-out, cron idempotency, heaviest-week) | Mechanical | P1 | Plan had no test plan |

## Taste decisions (surfaced at the gate)
- T1 Rank display: lead with percentile BAND + movement (Design rec) vs exact "#N of M". Rec: band-first, exact on expand.
- T2 Score defect: fix the sale-weighting (rentals-as-sales) BEFORE any paid climb plan, or ship with a visible caveat and no paid climb plan yet. Rec: don't monetize a climb plan on a known-flawed score.
- T3 Named neighbors: show named competitor + deal count vs anonymize ("the agent above you: 14 deals"). Rec: anonymize / keep private-to-agent.

## USER CHALLENGE (both the CEO voice and primary review agree; NOT auto-decided)
Stated direction: build "Your standing" FULL (panel + weekly cron + snapshot table + paid competitor ladder).
Both recommend: ship ONLY the free, live/snapshot-computed standing screen at claim (the cheap activation fix), and GATE the engine (weekly cron, snapshot infra, paid ladder) behind a 30-day validation test (fake-door digest + a manual 20-seller concierge match) with pre-registered kill criteria; do not move eng off the demand/seller side.
What we might be missing: your read on how status-driven SG agents really are, and whether supply retention now is strategically worth it to survive the cold-start.
If we're wrong (you build full and it flops): ~1 eng cycle spent on the abundant side, a snapshot/cron system to maintain, and a paid tier built on a known-flawed score, while the seller side stayed empty.

## Revised scope (if the challenge is accepted)
Phase 1 (ship): free "Your standing" panel on claim, correct set-based rank, canonical rank def, full state matrix incl. forward unranked state, absorb the score card. No cron, no snapshot table, no paid gate. Compute live from the new RPC.
Gate: 30-day fake-door digest + concierge test with kill criteria + hard metric thresholds.
Phase 2 (only if the gate clears): monthly event-triggered digest (SQL snapshot, idempotent), personalized paid value, per-area benchmarks.

---

## DECISION (approved at /autoplan gate)
Chosen: SHIP MVP, VALIDATE FIRST.

Phase 1 (build now): the free "Your standing" panel at claim only.
- Rebuilt set-based rank RPC get_agent_area_rank(reg, area_type, area_name): rank() over
  (order by score desc) across ALL area-active agents + count(*) denominator; identical
  inclusion filter for numerator and denominator; axis = town for HDB-dominant agents else
  district. Do NOT reuse sg_area_top_agents.rank (seller-tier order, excludes the long tail).
- ONE canonical rank definition, shared by every surface.
- Full state matrix: loading (skeleton), ranked, mid-pack (percentile band + movement),
  unranked FORWARD state ("one recorded seller-side deal puts you in the ranked top ~120",
  never a floor/"#180"), error (fall back to score + "rank refreshing"), partial/multi-area, ties.
- Absorb the naked AgentScore card into the standing panel; explicit dashboard order.
- Instrument activation + habit via sg_funnel_events. Compute live (single indexed lookup).
- NO cron, NO snapshot table, NO paid gate, NO climb plan yet.

Taste calls locked:
- T1: lead with percentile band + movement; exact "#N of M" only on expand.
- T2: no paid climb plan until the AgentScore sale-weighting (rentals-as-sales) defect is fixed.
- T3: anonymize the neighbor ("the agent above you: 14 deals"), never a named third party.

Phase-2 gate (build the engine ONLY if these clear in 30 days):
- Activation: >=60% of claims reach the standing view in session 1.
- Habit: >=25% of claimed agents open standing >=3x in 14 days.
- Fake-door digest (manual send to ~100 agents): >=25% week-4 return AND >=15% click the
  "see who's above you" WTP gate.
- Concierge (20 real sellers matched to agents by hand): >=1 agent shows paid intent after a
  real lead.
- Guardrail: seller enquiries/week must not fall while eng is on this.
Fail any of activation/habit, or both digest-and-concierge signals -> "Your standing" stays a
static claim-time screen and the roadmap pivots to the demand/seller side.

---

## SHIPPED (2026-07-04)
Phase 1 "Your standing" MVP is LIVE on fair-comparisons.com.

Built:
- get_agent_standing(p_reg) RPC (set-based rank() over score desc among all scored, >=1-txn
  area-active agents; axis = town for HDB-dominant else district; pct + anonymized neighbor
  gap). Applied to prod DB.
- app/dashboard/StandingPanel.tsx: percentile band leads (Top 10% / Top 25% / Top half /
  Building), raw rank hidden below the bottom quartile (forward frame instead), neighbor gap
  only shown near the top, forward "on the board" state when unranked, CEA provenance line.
- Wired into app/api/dashboard/lookup/route.ts (returns standing + primary_area).
- Absorbed the naked AgentScore card into the panel; stats row now 2-up.
- Instrumented: sg_funnel_events "standing_view" {ranked, area, pct} on every dashboard load
  (this is the activation + habit measurement stream for the 30-day gate).

Verified live: homepage 200, dashboard 200, lookup 401 unauthenticated, RPC returns
YISHUN #560/4152 pct 87 -> "Top 25%". Anonymity sweep clean (dot-dirs 404, no operator
identity in client bundle, source maps not exposed).

Deferred to Phase 2 (gated on the 30-day kill criteria above): loading skeleton, multi-area
tabs, paid climb plan, monthly digest, snapshot table/cron.

NOW MEASURING (query sg_funnel_events): activation = share of claims that fire standing_view
in session 1 (target >=60%); habit = share opening standing_view >=3x in 14 days (target
>=25%). Do not build the Phase-2 engine until these clear.

---

## OPERATIONAL LOOP (2026-07-04, same day)
Lex: "Can we make this operational though? Instead of a painted door." Scope chosen: full
loop including the email digest. The painted-door scaffolding (fake-door digest, dead WTP
gate) is replaced by a real, running system:

1. DATA (the unlock): the live table had 730,000 of 1,341,539 CEA transactions (54%) and
   nothing after Feb 2026. Full dataset loaded to staging and promoted via the new guarded
   promote_staging_transactions() RPC (refuses partial loads). Data now runs through Jun 2026.
   Scores recomputed in-DB: scored agents 12,960 -> 29,687. A monthly GitHub Action
   (.github/workflows/cea-monthly-refresh.yml, 1st 00:00 UTC) keeps it fresh
   (needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY repo secrets, a manual owner step).
2. SNAPSHOT: sg_agent_standing_snapshots (RLS locked, service-role only) + set-based
   snapshot_agent_standing() computing every scored agent's rank in their primary area in one
   pass. Baseline written for all 29,687 agents (2026-07-01). pg_cron
   monthly-standing-snapshot runs 1st 19:30 UTC (after the 18:00 in-DB score refresh).
3. MOVEMENT: lookup returns a delta vs the latest PRIOR-month same-area snapshot;
   StandingPanel renders "Up N places since June" / "held your position". Null until August
   by design (no fabricated movement at baseline). Verified end to end with a temporary
   prior-month row (delta +29 computed and rendered), then removed.
4. DIGEST: /api/cron/standing-digest (Vercel cron, 2nd 08:00 UTC) emails claimed, opted-in
   agents their standing + movement via Resend. ?dry=1 inspection mode. /unsubscribe now
   actually exists (old links were dangling) and sets email_opt_out_at.

Monthly cadence chain: 1st 00:00 CEA refresh -> 1st 18:00 score recompute -> 1st 19:30
snapshot -> 2nd 08:00 digest.

Notable side effect of the data completion: ranks re-based site-wide (more agents, fuller
records). Candy R027687E: #560/4,152 -> #1,171/9,031, pct HELD at 87 (Top 25%). The
percentile-band-first design (T1) absorbed the re-basing exactly as intended.

Still true: no paid climb plan until the rentals-as-sales score defect is fixed (T2). The
30-day activation/habit gate still governs Phase-2 paid features; what changed is that the
loop now runs on real data instead of a static one-time screen.
