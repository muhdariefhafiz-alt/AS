# SEO audit: fair-comparisons.com (July 2026)

Sources: Google Search Console export (Apr 10 to Jul 1 2026), live page + code inspection
(robots.ts, sitemap.ts, key page metadata), and PropertyGuru/99.co competitor research.
Combines two skills: `/seo-audit` (strategic framework) and `/seo-auditor` (meta / heading /
link / sitemap checks). Note: `/seo-auditor` is built for MkDocs markdown-doc sites and its
Python scripts are not installed here, so its checks were applied manually to the live Next.js
pages. Pairs with `seo-page-architecture.md` and `../press/ai-citation-plan.md`.

## Executive summary

Technical foundation is strong: best-in-class AI-crawler access, FAQ/Breadcrumb schema, clean
canonicals, metadataBase + OpenGraph, and deep unique-data pages the incumbents do not have.
The binding constraint is domain authority (near-zero backlinks), so well-built pages sit on
page 2-3 and the clicks leak. The 1.06% CTR is a ranking symptom, not primarily a title
problem. There is zero branded search yet, we are squarely in the pure-SEO acquisition phase.

Top three priorities: (1) push the commission cluster from page 2 to page 1, on-page is already
good, so this is internal-link equity plus earned links; (2) fix the stale / undercounted
sitemap so the full 38k-agent and development surface indexes; (3) expand the two proven
formats, agency "X vs Y" and "best agent in [area]". Overall: strong foundation, authority-limited.

## Keyword opportunity table (real GSC positions)

| Keyword | Impr (3mo) | Current pos | Intent | Difficulty | Opportunity | Action |
|---|---|---|---|---|---|---|
| property agent commission | 205 | 23.5 | Info | Moderate | HIGH | Strengthen the commission guide + link equity |
| singapore property agent commission | 161 | 24.7 | Info | Moderate | HIGH | Same cluster |
| property agent commission singapore | 145 | 24.2 | Info | Moderate | HIGH | Same cluster |
| 99 co agent fee | 144 | 13.5 | Commercial | Easy | HIGH | Add a "portal fees vs agent commission" section |
| property agent checker | 124 | 18.8 | Transactional | Easy | HIGH | Optimise /property-agents/check + link to it |
| top landed agent | 148 | 8.75 | Commercial | Easy | HIGH | Already page 1, tighten title + internal links |
| era vs propnex which agency is better | 118 | 4.0 | Commercial | Easy | MED | Page 1 already, small-sample, keep expanding pairs |
| propnex vs era / era vs propnex | ~95 | 6.1 | Commercial | Easy | HIGH | Proven format, expand to all agency pairs |
| best hdb agent | 24 | 15.6 | Commercial | Moderate | HIGH | best-by-type/hdb + best/hdb/[town] link equity |
| singapore property agent | 1 | 4.0 | Commercial | Hard | MED | Head term, long game |
| compare real estate | 2 | 2.0 | Commercial | Easy | MED | Reinforce /property-agents/compare |
| mop tracker | 2 | 5.0 | Tool | Easy | MED | Tool page, expand MOP content |
| what is agent commission | 1 | 1.0 | Info | Easy | LOW | Already winning |
| best property agent singapore | n/a | not ranking | Commercial | Hard | HIGH (gap) | Build a strong pillar ranking page |
| how to check property agent record | low | thin | Info | Easy | HIGH (gap) | Guide exists, needs link equity |
| propnex commission / era commission | n/a | gap | Commercial | Easy | MED (gap) | Agency-level commission pages |

## On-page issues

| Page | Issue | Severity | Fix |
|---|---|---|---|
| /guides/property-agent-commission | Meta description ~225 chars (truncates at ~160) | Medium | Trim to ~155 chars, keep the head keyword first |
| /guides/property-agent-commission | Title + "\| FairComparisons" ~74 chars (truncates) | Low | Drop "(2026 Guide)" or the brand suffix on this page |
| /property-agents/agent/[slug] | Title "Name - AgentScore X/100 \| Agency \| FairComparisons" is pipe-heavy and long | Low | Drop the agency segment or the brand suffix |
| Commission cluster | Strong page stuck page 2-3 = off-page authority gap, not on-page | High (strategic) | Internal-link equity + earned links (PR plan) |
| Homepage / hubs | Few internal links point TO the commission guide and best-agent pages | Medium | Add contextual links from high-traffic pages to priority targets |

## Technical SEO checklist

| Check | Status | Detail |
|---|---|---|
| robots.txt / AI crawlers | PASS | All major AI bots explicitly allowed; deliberate crawl-but-noindex for off-mission sections |
| HTTPS | PASS | Secure, no mixed content observed |
| Structured data | PASS | BreadcrumbList + FAQPage on guides; agent/development/agency schema present |
| Canonicals | PASS | Canonical set on guide, agent, development pages |
| Mobile | PASS | Responsive; mobile is the majority of live traffic |
| metadataBase / OG / Twitter | PASS | Root layout sets template, description, OG, Twitter |
| Thin-content handling | PASS | Thin developments/agents noindexed rather than inflated |
| XML sitemap coverage | WARNING | Live sitemap has ~788 property-agents URLs; sitemap.ts can generate up to ~10,000 agents + agencies + developments. Sitemap looks stale / undercounted, and the +7,370 agents synced today plus recomputed scores are not in it yet |
| Sitemap agent cap | NOTE | Agents capped at top 10,000 scored (of 38,110) by design; after the 600k-transaction backfill many more agents earn a real score and should enter the sitemap on the next build |
| Core Web Vitals | NOT ASSESSED | Measure LCP/INP/CLS on key templates (agent, development, guide) |

## Competitor comparison (vs the incumbents)

| Dimension | fair-comparisons | PropertyGuru | 99.co | Winner |
|---|---|---|---|---|
| Domain authority | very low (new, ~0 backlinks) | DR ~77 | DA ~61 | Incumbents |
| SG organic traffic | 244 clicks / 3mo | ~1.5M/mo | ~640k/mo | Incumbents |
| Direct-traffic moat | 0% branded | ~61.5% direct | high | Incumbents |
| Agent-performance queries | unique CEA data | not surfaced | not surfaced | fair-comparisons |
| "X vs Y" agency compare | ranking pos 5-6 | none | none | fair-comparisons |
| Commission / fee content | strong page, page 2 | present | present | Contested |
| Winnable SERPs | agent-name, X-vs-Y, commission, best-agent-[area], check-record | listings | listings | fair-comparisons on the wedge |

Read: do not fight the incumbents on head listing terms. Win the agent-performance, comparison,
and commission clusters they structurally do not target, exactly the wedge in `incumbent-playbook.md`.

## Content gaps

1. A strong "best property agent in Singapore" pillar page (high demand, not ranking well yet). High priority, half day.
2. Agency-level commission pages ("PropNex commission", "ERA commission"). Medium, quick.
3. "Portal fees vs agent commission" angle to capture "99 co agent fee" (144 impr, pos 13.5). High, quick.
4. Expand agency-compare beyond 8 agencies / 28 pairs (proven format). Medium, moderate.
5. Tier-5 "agent-performance-index" original-research page (also the PR + AI-citation asset). High, moderate.

## Prioritized action plan

Quick wins (this week, under ~2h each):
- Trim the commission guide meta description to ~155 chars and tighten the title.
- Add contextual internal links to the commission guide and best-agent pages from the homepage, /property-agents, and high-traffic agency pages (push link equity to the page-2 targets).
- Add a "portal fees vs agent commission" section to the commission guide to capture "99 co agent fee".
- Rebuild + redeploy so the sitemap reflects current data (new agents + recomputed scores), then confirm the new URL count.
- Tighten agent-profile titles (drop the redundant brand/agency pipe).

Strategic investments (this quarter):
- Push the commission cluster to page 1 via earned links (PR plan) + the internal-link equity above.
- Build the "best property agent in Singapore" pillar + supporting cluster.
- Expand agency-compare pairs and add agency-level commission pages.
- Ship the tier-5 agent-performance-index page.
- After the 600k-transaction backfill + score recompute, rebuild so thousands more scored agents enter the sitemap and the indexable surface.

## Skill-application note

`/seo-audit` (strategic) drove the structure above. `/seo-auditor` (meta / heading / link /
sitemap / duplicate checks) was applied manually to the live pages because its MkDocs markdown
pipeline and `marketing-skill/*` Python scorers are not present in this repo. Its checks
surfaced the meta-length, title, duplicate-title, and sitemap-coverage findings above.
