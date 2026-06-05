# Experiment 2: Ego-bait leaderboards + "you made the list" outreach

Publish per-town and per-district Top-10 agent leaderboards, then tell the ranked agents they made the list. Agents reflexively share rankings they appear in, which distributes the brand to their peers and clients for free, and the share-or-claim instinct pulls signups.

## Hypothesis

If we tell an agent they rank in the public Top 10 for their area and give them a clean page to share, then a meaningful share of them will claim their profile and share the leaderboard, because professional status and visible peer ranking are strong motivators for commission-driven agents.

## Design

- **Asset:** per-area leaderboard pages already partly exist (`/insights/top-agents-2026`, `/property-agents/best/[area]`). Add a shareable, social-card-optimised "Top 10 agents in {area}" view with per-agent OG images.
- **Audience:** agents ranked 1 to 10 in each of the highest-demand areas from GSC (start with Tampines, Bedok, Sengkang, Punggol, Queenstown, D09, D15, D10). Pull from `sg_area_top_agents`.
- **Channel:** email first (Klaviyo), WhatsApp second for any with a number on file.
- **Variants (subject-line A/B):**
  - A (rank callout): "You're ranked #{rank} in {area}"
  - B (list framing): "You made the Top 10 agents in {area}"
- **Duration:** one send Saturday to the seed areas, second send Monday to the rest with the winning subject.

## Success metrics

| Tier | Metric | Target |
|------|--------|--------|
| Primary | Verified claims attributed to `ref=leaderboard` | >= 5% of agents emailed |
| Primary | Email click rate | >= 12% |
| Secondary | Leaderboard share / outbound clicks from the page | track via `share_click` event |
| Secondary | Email open rate | >= 35% (warm-ish, name + area relevance) |
| Guardrail | Unsubscribe rate | < 1% |
| Guardrail | Spam complaints | < 0.1% |

**Ship / iterate / kill:** scale to all areas if verified-claim attribution clears 5%; iterate subject and the rank-vs-list framing if opens are high but clicks low; pause if unsubscribe or complaints breach guardrails.

## Build needed (medium)

- A share-optimised leaderboard view per area with a dynamic OG image ("Top 10 agents in {area}, ranked on CEA data") so shares render a strong card.
- `?ref=leaderboard&utm_*` on the per-agent claim links.
- A lightweight `share_click` event on the leaderboard share buttons.

The leaderboard data and ranking already exist; this is presentation + sharing + attribution.

## Email (ready to send)

**Subject A:** You're ranked #{rank} in {area}
**Subject B:** You made the Top 10 agents in {area}
**Preheader:** Ranked on your actual CEA transaction record, not advertising.

```
Hi {first_name},

FairComparisons ranks every CEA-registered agent in Singapore on
real transaction records, not advertising or paid placement.

In {area}, you rank #{rank} of {areaTotal} agents, with an
AgentScore of {score}.

See your ranking:  {leaderboard_url}?ref=leaderboard
Your profile:      {profile_url}?ref=leaderboard

Your profile is already live from public CEA data. Claim it free to
respond to seller leads in {area}, add your photo, and manage how you
appear. Claiming is free; you only pay a 0.25% success fee if you
complete a sale from a lead we refer.

{claim_cta_button: Claim my profile (free)}

Independent rankings from CEA, URA and HDB data.
Reply STOP to opt out. FairComparisons, Singapore.
```

Plain-text and HTML versions: reuse the ink/blue welcome-email shell in `app/api/subscribe/route.ts` (header `#0a1733`, button `#1f44ff`).

## Creative

**Shareable leaderboard card (OG image brief):**
- 1200x630, ink `#0a1733` background, white serif headline "Top 10 Agents in {area}", blue `#1f44ff` accent rule.
- Rows 1 to 3 with name + AgentScore badge. Footer: "Ranked on CEA data. fair-comparisons.com".
- No photos (we may not have rights). Use initials avatars like the site.

**WhatsApp message (for agents with a number):**
```
Hi {first_name}, you are ranked #{rank} of {areaTotal} agents in {area}
on FairComparisons (independent, ranked on CEA data). Your profile is
already live: {profile_url}?ref=leaderboard . Claim it free to get seller
leads in {area}. Reply STOP to opt out.
```

## Run-of-show

1. Friday: pull top 10 per seed area from `sg_area_top_agents`; build the Klaviyo segment with consent flags.
2. Saturday 10am SGT: publish seed-area leaderboards; send subject A to half, B to half within each area.
3. Sunday: pick the winning subject by click rate.
4. Monday: publish remaining areas, send winner.
5. Tuesday: read verified-claim attribution; decide scale.

## Risks

- Low-ranked agents are not emailed in this experiment (only top 10) to keep the ego frame clean.
- Sharing may surface the brand to sellers too (good), but ensure the public leaderboard funnels sellers to `/sell` as well (the SellCtaBand already does on content pages).
- PDPA: same guardrails as Exp 4. Business contact only, clear opt-out.
