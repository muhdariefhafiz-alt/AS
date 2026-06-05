# Experiment 1: "You're already ranked" claim hook

On-site CRO experiment on the unclaimed agent profile. Convert the agent traffic you already earn (agents google themselves; GSC shows person-name queries hitting profiles) by adding rank, score, area, and real activity to the claim prompt, framed with ego and loss aversion.

## Hypothesis

If an agent who lands on their own unclaimed profile sees their public rank, their AgentScore, and that sellers are already viewing agents in their area, then the claim-form submit rate will increase versus the current generic claim banner, because ego and loss aversion are stronger motivators than a neutral "claim your profile" prompt.

## Design

- **Surface:** `app/components/ClaimBanner.tsx` rendered on `/property-agents/agent/[slug]` when `!agent.claimed`.
- **Type:** A/B if volume allows; otherwise ship-and-measure with a clean pre/post baseline (the claim form only became reachable on 3 Jun, so there is effectively no prior baseline to contaminate).
- **Assignment:** deterministic by `agent_id % 2` (stable per agent, no flicker). Log `variant` on every `claim_form_view` and `claim_submitted`.
- **Control (A):** current banner copy.
- **Variant (B):** ranked / ego / loss-aversion banner (copy below). Every figure is pulled live (rank from `sg_area_top_agents`, score from `sg_agents.score`, area deal count, real profile-view count from the `agent_profile_view` event count). If a figure is not available for an agent, that line is omitted (never fabricated).
- **Duration:** run until 200 unclaimed-profile views per arm or 14 days, whichever first. With low volume, prefer ship-and-measure and judge on absolute submit rate.

## Success metrics

| Tier | Metric | Definition | Target |
|------|--------|-----------|--------|
| Primary | Claim submit rate | `claim_submitted` / `claim_form_view` | Variant B >= 1.5x control, or absolute >= 8% |
| Primary | Verified claim rate | `claim_verified` / unclaimed `agent_profile_view` | >= 3% |
| Secondary | Form-view rate | `claim_form_view` / `agent_profile_view` | >= 40% (is the form even seen) |
| Guardrail | Verify drop-off | 1 - (`claim_verified` / `claim_submitted`) | < 40% (else email step is broken) |
| Guardrail | Seller funnel | no drop in `/sell` starts | flat or up |

**Ship / iterate / kill:**
- Ship B to 100% if submit rate beats control and verify drop-off is under 40%.
- Iterate copy if form-view rate is healthy but submit rate is low (message problem).
- Investigate plumbing if submit is healthy but verify leaks (email deliverability).

## Build needed (small)

Enrich `ClaimBanner` (or the profile section that renders it) to pass and display:
- `rankInArea` and `areaName` (from `sg_area_top_agents` for the agent's primary area)
- `score` (already on the profile)
- `areaDeals` (already shown as "N deals")
- `profileViews7d` (count of `agent_profile_view` events for this agent in last 7 days; only show if > 0)
- `variant` (A/B) and persist it on the funnel events + claim request

Estimated effort: ~1 short session. This is the only dev dependency for Exp 1; copy and metrics below are final.

## Copy

### Variant B headline options (test in order)
1. "This is your profile. You rank #{rank} of {areaTotal} agents in {area}."
2. "You are ranked #{rank} in {area} on FairComparisons. Claim your profile."
3. "Your AgentScore is {score}. Sellers in {area} can already see it."

### Variant B body
> This profile was built from your public CEA transaction record, so it is live whether or not you manage it. Claim it free to respond to seller leads in {area}, add your photo and bio, and see your full AgentScore breakdown.
>
> Claiming is free. You only pay a 0.25% success fee if you complete a sale from a lead we send you. No upfront cost, no monthly fee.

### Real social-proof line (show only when the number is real)
> {profileViews7d} people viewed agents in {area} this week.

### Loss-aversion line (show when a same-area competitor has claimed)
> {nClaimedInArea} agents in {area} have already claimed their profile.

### Primary button
- "Claim my profile (free)"

### Reassurance microcopy under the button
- "Verify with the email on your CEA record. Takes two minutes. You can edit or unpublish anything you add."

### Control (A) copy (leave as current)
- Headline: "Is this your profile?"
- Button: "Claim your profile"

## Creative

No image asset required. The "creative" is the live data treatment:
- Rank shown as a pill next to the score gauge ("#4 in Tampines").
- Score uses the existing band-coloured gauge.
- Optional: a thin progress bar "Profile 40% complete" once claimed, to pull activation (photo, bio, WhatsApp). Spec only; build in activation follow-up.

## Tracking

- `claim_form_view { agent_id, variant }` on intersection of `#claim`.
- `claim_submitted { agent_id, variant, ref }` on POST success.
- `claim_verified { agent_id, source:"profile_hook", variant }` at verify.
- Dashboard query: submit rate and verified rate grouped by `variant`.

## Run-of-show

1. Ship the enriched banner (or flip the variant flag) Saturday AM.
2. Confirm a live unclaimed profile shows real rank + score + area; confirm events fire.
3. Let the SEO traffic do the work; no spend. Read results Sunday and the following Tuesday.
4. If B wins, set B to 100% and fold the winning headline into the Exp 4 outreach subject lines.

## Risks

- Low organic volume means slow significance. Mitigation: ship-and-measure on absolute rate, and drive volume by pointing Exp 4 outreach at the profile (every outreach link lands on the agent's own enriched profile).
- Showing rank could discourage low-ranked agents. Mitigation: for agents outside the area top 10, lead with score and "respond to leads" rather than rank.
