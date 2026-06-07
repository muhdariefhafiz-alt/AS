# SEO page architecture + CEA data pipeline (blueprint vs what we have)

Source: "SEO Playbook + Agent Acquisition Deep Dive: PropertyGuru & 99.co (with
fair-comparisons.com Application)". Pairs with `incumbent-playbook.md` and
`../press/ai-citation-plan.md`.

## The strategic why (the endgame)

PropertyGuru's traffic is now ~61.5% direct. SEO built the brand over 15 years, and the
brand now sustains the traffic autonomously, largely immune to algorithm changes. The lesson:
programmatic SEO is not a traffic tactic, it is how you manufacture a durable brand-and-direct
moat. Build the indexable surface now; it converts into algorithm-proof direct traffic later.
The 5-tier architecture below targets agent/performance queries that neither portal currently
owns (they index listings, not agent track records).

## The 5-tier blueprint, mapped against what is already live

Big finding: most of this is already built. The work is closing gaps, not greenfield.

| Tier | Blueprint target | Live today | Gap / action |
|---|---|---|---|
| 1. Agent hub pages (district x specialization) | district hubs, HDB/new-launch specialist hubs, district x type | `/property-agents/district/[code]`, `/best-by-type/[type]`, `/hdb/[town]`, `/property-agents` index | Add district x type hubs and explicit specialization hubs (hdb-specialist, new-launch) if not covered by best-by-type. Verify coverage. |
| 2. Agent profile pages (one per registrant) | profile + `/reviews` + `/transactions` sub-pages | `/property-agents/agent/[slug]` (+ `/ai/agent/[slug]` machine-readable) | Add dedicated indexable `/transactions` and `/reviews` sub-pages per agent for long-tail surface. Confirm profile count vs registrant universe (see data gap). |
| 3. Development-level agent pages (condo x agents who transacted) | `[condo]/agents`, `/transactions`, `/compare-agents` | `/property-agents/development/[slug]` exists | Verify it surfaces "agents who transacted in this development" + a compare view. This is the tier least likely to be complete and is high-value (low competition). |
| 4. Comparison & ranking pages | top-agents by district and by type x town, agent-fees | STRONG: `/best/[area]`, `/best/hdb/[town]`, `/compare`, `/agency-compare/[pair]`, `/district-compare/[pair]`, `/hdb-compare/[pair]`, `/budget/[range]`, `/guides/property-agent-commission`, `/tools/commission-calculator` | Mostly done. Consider top-agents by property-type x town beyond HDB. |
| 5. Data / tool pages (link-bait, trust) | market index, district data, original research | `/insights/*` (million-dollar-hdb, freehold-premium, court-case-statistics, top-agents-2026), `/tools/*`, `/property-agents/market/[year]` | Add an "agent-performance-index" original-research page. Doubles as the PR + AI-citation asset. |

Net: tiers 4 and 5 are strong, tier 1 and 2 are largely there with sub-page gaps, tier 3 is
the biggest opportunity. We also have an `/ai/*` machine-readable tier the blueprint does not
mention, which is an advantage for AI citations.

## The CEA data pipeline (and our coverage gap)

We do NOT currently pull the data.gov.sg CEA datasets directly (verified: no reference in the
codebase). Two free, openly-licensed datasets give us everything to keep profiles complete and
defensible:

- Dataset 1 - CEA Salesperson Information. ID `d_07c63be0f37e6e59c07a4ddc2fd87fcb`. Updated
  daily. Fields: name, registration number, registration start/end, agency, agency licence.
  Use: seed/refresh the full active-registrant universe (~37,000) so every agent has a profile.
- Dataset 2 - CEA Salespersons' Property Transaction Records (residential). ID
  `d_ee7e46d3c57f7865790704632b0aef71`. Updated monthly. ~1.3M rows since Jan 2017. Fields:
  name, transaction date, reg number, property type, transaction type, represented side, town,
  district. No price (privacy-safe). Use: derive deal counts, specialization mix, district
  concentration, sell vs buy side, recency.

API shape: `https://data.gov.sg/api/action/datastore_search?resource_id={id}&limit=...`,
with `filters={"Salesperson Reg Num": "R123456A"}` for per-agent pulls.

Coverage gap to verify and likely close:
- Agents: ~30,740 in our DB vs ~37,000 active registrants on data.gov.sg. ~6,000 missing
  profiles = missing pages, missing SEO surface, missing claim inventory.
- Transactions: ~730k in our DB vs ~1.3M available since Jan 2017. More records = more accurate
  scores and far better tier-3 (development-level) coverage.
- Provenance: syncing data.gov.sg makes the whole dataset openly-licensed government data, which
  strengthens the PDPA and defamation posture ("calculated from data.gov.sg open records").

This sync is the single highest-leverage technical action: it widens the SEO surface, improves
score accuracy, hardens the legal posture, and refreshes the claim inventory, all at once.

## Agent acquisition: the claim-and-upgrade funnel

The blueprint's pipeline matches what we have (pre-built profile -> claim -> upgrade). Steps:
1. Seed every active registrant (Dataset 1) so a profile exists with zero agent input.
2. Enrich with transaction history (Dataset 2): deals 12m/36m, primary district, specialization
   mix, sell/buy ratio, new vs resale, seniority proxy.
3. Profile auto-populates with no agent input. "Claim this profile" CTA, verify via CEA number
   + OTP. No price shown (not in the dataset, privacy-safe).
4. Claimed agents add photo, bio, languages, respond to reviews. Paid tiers add reputation and
   analytics tools only. Ranking never affected.

## Agent acquisition channel stack (ranked by ROI)

1. CEA data pre-population - auto-build the full profile universe (engineering only, the moat).
2. Programmatic SEO agent pages - inbound discovery via "[name] property" searches.
3. PropertyGuru price-hike monitoring - PG packages now S$1,949 to S$34,322/yr, 82% renewal
   driven by captivity not satisfaction; activate an agent push within 72h of any PG pricing
   announcement (roughly an 18-month cycle). Sales-only, no media spend.
4. Agency partnerships - PropNex (~12k), ERA (~6k), Huttons, OrangeTee, Knight Frank.
5. Agent Telegram/WhatsApp communities (the "No to PropertyGuru" groups are still active).
6. LinkedIn organic - ~5,000+ SG agents; CEA-data-transparency posts resonate.
7. Trial credits + referral - claimed/upgraded agents get credits to invite colleagues.

## The structural advantage no incumbent can counter

"Free forever for agents, ranked by verified data" is a position PropertyGuru and 99.co cannot
match without dismantling their core revenue engine, the same structural reason PropertyGuru
could never offer free listings to block 99.co's 2014 wedge. Our free-for-agents promise is
structurally sustainable because our revenue is the agent SaaS subscription for tools, never
paid ranking. Guard it: tools-only subscriptions, ranking always from the data.

## Prioritized actions

1. Build the data.gov.sg sync (Datasets 1 + 2) to close the agent and transaction gaps and
   harden provenance. Highest leverage.
2. Tier 3: make development pages surface transacting agents + a compare view.
3. Tier 2: add indexable `/transactions` and `/reviews` sub-pages per agent.
4. Tier 5: ship an "agent-performance-index" original-research page (PR + AI-citation asset).
5. Tier 1: add district x type and explicit specialization hubs where missing.
6. Operational: a PropertyGuru price-hike watch that triggers the 72h agent push.
