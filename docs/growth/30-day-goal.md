# 30-Day Goal: reframed from "10x traffic" to activated claims + organic

Set 2026-07-17. Window: 2026-07-17 to 2026-08-16. Owner: solo. Direction: housapp-inspired supply-first.

## Why the literal goal was reframed

"10x traffic in 30 days" was pressure-tested with a 5-lever model plus 3 adversarial critics. All three converged:

- The only lever that reliably produces that volume (an agent-outreach blast) already ran on 07-04 to 07-08: ~4,000 sessions in 5 days, **0 claims**, decayed to ~40/day within days. "10x sessions" restates that failure.
- Honest lever base case sums to ~6,370 sessions (~5x), and 13,000 only appears if every lever hits its high ceiling at once, drawn from the same fixed ~10.5k email pool (not additive).
- Chasing it would require mass-emailing 10,530 unvalidated scraped addresses from a young domain, the single most reliable way to get blocklisted, which also kills Stripe/transactional mail and the retention loop's only channel.

Odds of a real (non-vanity, bot-filtered) 13,000 sessions: ~5-10%, and even that converts ~0. Odds of the reframed goal with disciplined execution: ~40-55%.

## The scoreboard

| Tier | Metric | From -> target | Source |
|---|---|---|---|
| North Star | Activated claimed agents (claim + 1 core action within 7d) | 1 -> 25-50 | `get_growth_scoreboard()` north_star |
| Guardrail | Organic non-UTM sessions/week | already 109/wk and rising -> 250+/wk | `get_growth_scoreboard()` organic_by_week |
| Guardrail | Qualified demand events/week (sg_leads) | >0 and growing | `get_growth_scoreboard()` demand_by_week |
| Diagnostic only | Bot-filtered sessions by first-touch channel | agent_pulse segmented OUT of "success" | `get_growth_scoreboard()` sessions_by_channel_week |

Note: organic ran 6 -> 41 -> 109 sessions/week (06-29 -> 07-06 -> 07-13) as M1-M5 indexed. The original "~150/mo organic" baseline was too low; reset the organic guardrail to hold/extend the ~109/wk climb.

Biggest bet: **organic harvest**. Only compounding, already-live, demand-carrying, anonymity-safe, domain-safe lever. Everything else is a decaying pulse or saturates the fixed ~38k pool.

## Built (backend, verified, no owner dependency)

- `get_growth_scoreboard(from,to)` jsonb RPC: North Star + guardrails + first-touch channel diagnostic, bot-filtered, SG-scoped. Activation = strictly post-claim actions (profile edits / subscription / whatsapp_opt_in within 7d of claim).
- `sg_agent_contactable` view (PII, service_role only) + `get_contactable_summary()`: deduped one-row-per-agent fuel gauge with reachability, suppression, contact history, and `preferred_channel` (wa.me first). Pools: 16,578 wa.me acquisition, 10,530 email retention, 6,059 wa.me-only.

## The one rule that cannot break

Never single-blast the raw 10,530-email list (all `email_status_valid=0`). Validate first, dedicated warmed subdomain on a cold-tolerant ESP (never the root/Stripe/SEO domain), hard gates at <2% bounce / <0.1% complaints. Acquisition pulse goes through wa.me only. Email is only ever the retention loop.

## Week-by-week

- **Wk 1 (instrument + protect, zero mass sends):** scoreboard RPC [done], deduped contactable view [done], grade the 10,530 emails, resubmit 13 sitemap shards + Request Indexing top 50 URLs, dynamic OG share cards + share_click event, redesign claim landing (rival-rank module + real profile-view count), admin scoreboard panel.
- **Wk 2 (organic + first wa.me pulse):** on-page optimize striking-distance pages (`cea agent check`, `99 co agent fee`, `agent commission singapore`), ship "check any CEA agent" utility, first wa.me wave ~150-200/day to an unburned cohort with a pre-declared claims-per-1,000 kill threshold.
- **Wk 3 (compounding asset + retention loop):** publish "We scored 38,110 CEA agents" (CEA data only), llms.txt + schema for AI citation, turn on weekly retention digest from the warmed subdomain (email = retention only).
- **Wk 4 (double down + seed PR):** pitch the data asset to SG property media as "fair-comparisons.com data" (anonymity-safe), scale only what produced claims, kill everything below the claim floor.

## Kill criteria

- Any wave with claim_completed/sessions ~0 (the 07-04 pattern): abort/redesign, do not scale.
- Any email batch over 2% bounce or 0.1% complaint: immediate halt.
- Any Spamhaus/blocklist/ESP-suspension signal: stop all email (protects retention loop + Stripe mail).
- Weekly agent return <2% or claims near zero through the window: cap outreach, shift all effort to organic. This also falsifies the housapp supply-conversion thesis, which is the most valuable thing to learn this quarter.
- Programmatic pages landing in "Crawled - currently not indexed" at scale: noindex/consolidate thin clusters, pause generation.
- Any asset singling out named agents beyond comparative-factual CEA-attributed framing: pulled before publish.

## Owner-ops (blocked on you, start the starred item TODAY)

1. **[STAR / critical path] Stand up the warmed sending subdomain now.** Warmup takes 3-4 weeks, nearly the whole window. Dedicated outreach subdomain (not root/Stripe/SEO domain), SPF + DKIM + DMARC + RFC 8058 one-click List-Unsubscribe, on a cold-tolerant ESP (Instantly / Smartlead / lemlist, not Resend/Postmark whose AUP bans scraped lists). Ramp 30-50/day upward. Without this, the Week-3 retention loop cannot ship.
2. **Provide a paid email-validation key** (ZeroBounce / NeverBounce / Kickbox, ~US$50-100) so the 10,530 list can be graded beyond free syntax+MX. Expect to drop 30-50%.
3. **GSC: resubmit all 13 sitemap shards + Request Indexing on the top ~50 URLs** (agency league, high-volume HDB towns, striking-distance targets). Needs Search Console access.
4. **Confirm the legal basis before any send:** PDPA business-contact-information exemption (professional-capacity emails only) AND Spam Control Act 2007 compliance (truthful subject, working unsubscribe honored within 10 business days, sender identity). These are separate regimes; the PDPA exemption does not cover SCA.
5. **(Optional) Import the Jul 4-8 blast send log** from the email/WhatsApp provider so future waves can exclude already-burned agents. Those recipients were never persisted to our DB.
