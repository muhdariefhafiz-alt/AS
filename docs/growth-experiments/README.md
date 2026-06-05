# Agent Signups: Growth Experiment Pack

Prepared 3 Jun 2026. Four experiments to drive CEA agent signups (profile claims) on fair-comparisons.com, designed to run over a weekend. Each experiment has its own file with hypothesis, design, metrics, copy, creatives, emails, and a step-by-step run-of-show.

The defensible asset behind all four: roughly 10,594 agents already have a live profile and a public AgentScore they do not control. These experiments turn that into signups.

| # | Experiment | Type | Build status | File |
|---|-----------|------|--------------|------|
| 1 | "You're already ranked" claim hook | On-site CRO | BUILT + live (ClaimBanner variant B with real rank/score/area/views; A/B by agent_id; ?ref attribution) | [exp-01-claim-hook.md](exp-01-claim-hook.md) |
| 2 | Ego-bait leaderboards + "you made the list" outreach | Content + outreach | BUILT + live (per-area dynamic OG share card on best/[area]; ?ref=leaderboard on agent links). Leaderboards already exist. | [exp-02-leaderboards-outreach.md](exp-02-leaderboards-outreach.md) |
| 3 | Embeddable AgentScore badge | Viral loop | BUILT + live (/badge/[slug].svg, band-coloured, badge_view logged; dashboard "Copy embed code" card) | [exp-03-agentscore-badge.md](exp-03-agentscore-badge.md) |
| 4 | Personalized cold outreach at scale | Channel | No build needed (uses Klaviyo + data) | [exp-04-cold-outreach.md](exp-04-cold-outreach.md) |

**All four are now runnable.** Exp 1-3 dev work shipped to prod on 3 Jun; Exp 4 needs only Klaviyo setup.

## North Star and the agent funnel

**North Star for this push:** verified agent claims per week (an agent whose `sg_agents.claimed_at` is set and who has a signed `sg_agent_agreements` row).

Funnel stages (instrument every step):

```
Reach            outreach sent / leaderboard view / badge impression / profile impression
  ->  Profile view        unclaimed agent profile opened
  ->  Claim form view      #claim form seen (claim_form_view)
  ->  Claim submit         form posted to /api/claim (claim_submitted)
  ->  Verified claim       email verified + agreement signed (claim_verified)  <- North Star
  ->  Activated            photo + bio added, or first lead response
  ->  Retained             first completion logged (0.25% fee)
```

## Shared measurement spine

All four experiments report against the same funnel so they are comparable.

**Where the data lives (already exists):**
- `sg_agents.claimed`, `sg_agents.claimed_at`, `sg_agents.subscription_tier` (claim outcome)
- `sg_claim_requests` (claim attempts)
- `sg_agent_agreements` (signed agreement, source field)
- `/api/funnel` (event log; POST `{ event, metadata }`)
- Klaviyo (email opens, clicks, per-campaign)

**Events to log (add to `/api/funnel` calls where missing):**
| Event | Fired when | Key metadata |
|-------|-----------|--------------|
| `agent_profile_view` | unclaimed profile opened | `agent_id`, `claimed:false`, `ref` |
| `claim_form_view` | #claim form scrolled into view | `agent_id`, `variant` |
| `claim_submitted` | POST /api/claim | `agent_id`, `variant`, `ref` |
| `claim_verified` | email verified + agreement signed | `agent_id`, `source` |
| `badge_view` | badge SVG served | `agent_id`, `referrer` |
| `outreach_click` | landing from an outreach link | `campaign`, `agent_id` |

**Attribution scheme (UTM + ref):**
- Outreach and badge links carry `?ref=<campaign>` and `utm_source/medium/campaign`.
- `ref` is persisted to the claim request so a verified claim attributes back to the experiment.
- UTM taxonomy: `utm_source = outreach | leaderboard | badge | community`; `utm_medium = email | whatsapp | linkedin | embed`; `utm_campaign = claim-w24-<variant>`.

## Prioritization (ICE)

| Exp | Impact | Confidence | Ease | ICE | Run order |
|-----|--------|-----------|------|-----|-----------|
| 1 Claim hook | 9 | 8 | 9 | 8.7 | First (converts traffic you already pay for) |
| 4 Cold outreach | 9 | 6 | 7 | 7.3 | Second (largest reach, needs care) |
| 2 Leaderboards | 7 | 7 | 6 | 6.7 | Third |
| 3 Badge | 6 | 6 | 5 | 5.7 | Fourth (compounding, slower) |

## Weekend run-of-show

**Friday PM (setup, ~2h)**
- Confirm the funnel events above are firing (open `/api/funnel` logs, load an unclaimed profile, check `agent_profile_view`).
- Pull the target agent list from `sg_area_top_agents` (top 10 per area) and export to CSV (the outreach + leaderboard audience).
- Stand up the Klaviyo list "Agent claim W24" and import the CSV with consent flags.

**Saturday (launch)**
- Exp 1: flip the claim-hook variant live (or ship it; see file). Baseline starts now.
- Exp 4: send batch 1 of cold outreach (cap 100, see PDPA guardrails) at 9am SGT.
- Exp 2: publish the first 3 per-town leaderboards; send the "you made the list" email to those agents only.

**Sunday (observe + iterate)**
- Read open/click by variant; promote the winning subject line for batch 2 Monday.
- Check claim_submitted vs claim_verified drop-off; if verify is leaking, the bottleneck is the email step, not the copy.
- Exp 3: publish the badge page; add the embed snippet to the dashboard for already-claimed agents.

**Decision gate (following Tue):** keep, iterate, or kill each experiment against the thresholds in its file.

## Guardrails (apply to all)

- **PDPA:** cold outreach to agents uses business contact only, with a clear opt-out in every message and an honest "your public profile is live" framing. No purchased lists. Honor unsubscribes immediately. See Exp 4 for the compliant template.
- **CEA:** never imply CEA endorses or ranks; AgentScore is our independent computation from public data.
- **No fake data:** every number shown to an agent (rank, score, area deal count, profile views) must be real and queryable. No invented "3 sellers viewed you" unless the view count is real. See [[feedback_no_fake_data]].
- **No paid placement claim stays true:** signups must never be sold as "pay to rank higher." The pitch is "claim to respond to leads and manage your listing," not "buy visibility."
- **Brand:** The Record (ink #0a1733, blue #1f44ff), no teal, no em dashes, no emoji in agent-facing copy.
