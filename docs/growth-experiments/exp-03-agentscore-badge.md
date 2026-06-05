# Experiment 3: Embeddable AgentScore badge

Give claimed agents a verified badge ("AgentScore 82 · Verified on FairComparisons") to embed in their email signature, WhatsApp bio link, personal site, and portal profile. Every placement is a backlink, a brand impression, and a trigger for the next agent who sees it. This is the TrustPilot / G2 vanity-widget loop.

## Hypothesis

If claimed agents can embed a good-looking, score-bearing badge that links back to their profile, then a meaningful share will install it, and those placements will drive new agent profile views and claims (peer-triggered) plus seller traffic, because agents like to display a number that makes them look good and the badge advertises the platform to exactly the right audience.

## Design

- **Asset:** a public, cacheable badge image per agent at `/badge/[slug].svg` (SVG so it stays crisp and is trivial to serve), plus a copy-paste embed block in the agent dashboard.
- **Audience:** all claimed agents (start), surfaced in `/dashboard` after claim. Highest-score agents first (they are proudest of the number).
- **Type:** adoption + loop measurement, not a clean A/B (the loop is the point). Optionally A/B the dashboard prompt copy.
- **Duration:** publish Sunday; measure installs and referral traffic over 2 to 4 weeks (this one compounds slowly).

## Success metrics

| Tier | Metric | Definition | Target (4 weeks) |
|------|--------|-----------|------------------|
| Primary | Badge install rate | distinct agents with >= 1 external `badge_view` referrer / claimed agents | >= 15% |
| Primary | Referral claims | verified claims with `ref=badge` | track, target > 0 and rising |
| Secondary | Badge impressions | `badge_view` events from non-fair-comparisons referrers | growth week over week |
| Secondary | Backlinks | referring domains serving the badge | track in Search Console |
| Guardrail | Score accuracy | badge score always matches live profile | 100% (cache invalidated on recompute) |

**Ship / iterate / kill:** keep and promote if install rate clears 15% and referral traffic is positive; iterate the dashboard prompt and badge styles otherwise. Low risk, so default to keep and let it compound.

## Build needed (medium)

1. `app/badge/[slug]/route.ts` returning an SVG (or `app/badge/[slug].svg`) with the agent name, AgentScore, band colour, and "Verified on FairComparisons". Cache with revalidate; bust on weekly recompute. Log `badge_view { agent_id, referrer }`.
2. Dashboard embed block (HTML snippet + Markdown + image URL) for the agent to copy.
3. `?ref=badge&utm_source=badge&utm_medium=embed` on the badge link target.

## Creative (final SVG, drop-in)

Light badge, 320x96, ink text, blue accent, band-coloured score chip. Replace the four tokens.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="96" viewBox="0 0 320 96" role="img" aria-label="AgentScore {SCORE} verified on FairComparisons">
  <rect x="0.5" y="0.5" width="319" height="95" rx="12" fill="#ffffff" stroke="#d7deee"/>
  <circle cx="52" cy="48" r="28" fill="#eef2fb"/>
  <text x="52" y="56" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="28" font-weight="700" fill="{BAND_COLOR}">{SCORE}</text>
  <text x="96" y="34" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="11" letter-spacing="1.5" fill="#56618a">AGENTSCORE · VERIFIED</text>
  <text x="96" y="56" font-family="Georgia,'Times New Roman',serif" font-size="17" font-weight="700" fill="#0a1733">{AGENT_NAME}</text>
  <text x="96" y="76" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="12" fill="#1f44ff">fair-comparisons.com</text>
</svg>
```

`{BAND_COLOR}` follows the site bands (for example >=80 ink-blue `#1f44ff`, 60-79 slate `#56618a`). `{SCORE}`, `{AGENT_NAME}` from the agent record.

## Embed snippet (what the dashboard hands the agent)

**HTML (site / email signature):**
```html
<a href="https://fair-comparisons.com/property-agents/agent/{slug}?ref=badge">
  <img src="https://fair-comparisons.com/badge/{slug}.svg" alt="My AgentScore on FairComparisons" width="320" height="96">
</a>
```

**Markdown:**
```
[![My AgentScore](https://fair-comparisons.com/badge/{slug}.svg)](https://fair-comparisons.com/property-agents/agent/{slug}?ref=badge)
```

**Direct image URL (WhatsApp / social):**
```
https://fair-comparisons.com/badge/{slug}.svg
```

## Dashboard prompt copy

> Show off your AgentScore. Add your verified badge to your email signature, website, or social profiles. It links back to your FairComparisons profile so sellers can see your full record.
> Button: "Copy my badge code"

## Run-of-show

1. Sunday: ship the badge endpoint + dashboard block.
2. Email already-claimed agents: "Your verified AgentScore badge is ready" with the copy block.
3. Track installs and `ref=badge` claims weekly; report in the SEO + growth review.

## Risks

- Score changes weekly; a cached badge must update or it misrepresents. Mitigation: short cache + invalidate on recompute; the badge reads live score at serve time.
- An agent whose score drops may remove the badge. Acceptable; the loop still nets positive.
- Do not let the badge imply CEA endorsement. Wording is "AgentScore · Verified" (our score), with "fair-comparisons.com", not "CEA verified".
