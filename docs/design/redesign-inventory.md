# Redesign inventory - the full surface map

Generated 2026-07-26 from a marker scan of all 98 `page.tsx` templates
(markers: `lp-hero` = ink-hero era, `fc-scene|DataMarquee|*Demo` = Wave-1
motion system, `fc-reveal|ScrollReveal` = scroll animation). One template can
serve thousands of URLs; effort is per TEMPLATE, impact is per URL SERVED.

Design system state: Wave 1 primitives shipped (scenes, choreographed demos,
TypingDemo/CountUp, DataMarquee, line-art x8, icon family x14, hairline,
float). Wave 2 shipped /for-agents. Everything below is the remaining rollout.

## Era census

| Era | Templates | Meaning |
|---|---|---|
| Motion system (new) | 2 | /for-agents, /design-lab |
| Ink-hero era (static brand, no motion/scenes) | 13 | lp-hero present, no scenes |
| Pre-hero era (fc-cards or bespoke, no brand hero) | 76 | needs the most work |
| Admin (Tailwind, internal) | 7 | excluded from brand redesign |

## Group A - conversion-critical entries (P1, Wave 3a)

| Route | Lines | Era | Treatment |
|---|---|---|---|
| `/` homepage | 342 | pre-hero | Full scene narrative: seller journey demos itself (compare -> shortlist -> quotes arriving), marquee, skyline CTA |
| `/sell` | 258 | ink-hero | Seller-side choreography: QuoteDemo (quotes arriving as cards), trust band, keep form untouched |
| `/search` | 402 | pre-hero | Claim-funnel entry: hero treatment, icon chips, keep search mechanics untouched |
| `/property-agents` hub | 147 | pre-hero | Directory front door: hero + marquee + scene-framed area index |

## Group B - agent funnel completion (P1, Wave 3b)

| Route | Lines | Era | Treatment |
|---|---|---|---|
| `/for-agents/features` | 224 | ink-hero | Scene trilogy + icon chips |
| `/for-agents/grow` | 129 | ink-hero | Grow scene (CountUp cards) - completes the trilogy |
| `/for-agents/planner` | 127 | ink-hero | PlannerDemo hero |
| `/for-agents/lead-generation` | 378 | pre-hero | Scene + honest-funnel narrative |
| `/for-agents/building-pages`, `/deal-radar`, `/demand-dashboard`, `/badge-widget` | 30 ea | pre-hero | Shared feature-page shell upgrade (they template from one component - check AgentFeaturePage) |
| 7x `*-alternative` + `/portal-pricing` | 30-448 | pre-hero | Comparison-page shell: hairline CTAs, icon chips, trust band footer |
| `/invite/[token]` + `/claim/success` | 198+27 | pre-hero | The magic-claim moment: first impression for every outreach click. Small but outsized impact |

## Group C - programmatic SEO backbone (P2, Wave 3c) - THE BIG SURFACE

One template = thousands of URLs. Treatment must be render-cheap (no
build-time cost per page; scenes are static CSS, safe).

| Template | URLs served | Era |
|---|---|---|
| `/property-agents/agent/[slug]` | ~38,000 | pre-hero |
| `/property-agents/best/[area]`, `/district/[code]`, `/hdb/[town]` (+flatType), `best-by-type`, `budget`, `market` | ~hundreds | pre-hero |
| `/property-agents/agency/[slug]`, `/agencies`, compare pairs (agency/district/hdb) | ~hundreds | pre-hero |
| `/property-agents/development/[slug]` | ~hundreds | pre-hero |
| `/sell/hdb/[town]`, `/sell/condo/[district]` | ~50 | pre-hero |
| Treatment | Shared upgrades, not per-page rewrites: hero band component, statchip/icon unification, reveal on section entries, skyline divider before footer CTA, consistent CTA hairline. One component edit propagates everywhere. |

## Group D - transactional trust moments (P2, Wave 3d)

Money-moment pages where a seller/agent decides to trust us. Small, bespoke,
high anxiety: design quality IS conversion here.

| Route | Notes |
|---|---|
| `/sell/shortlist/[token]` (picker) | The core seller decision surface |
| `/sell/quotes/[token]` | Quote comparison - QuoteDemo patterns fit natively |
| `/sell/contact/[token]`, `/sell/review/[token]` | Handoff + review |
| `/book/[agentSlug]` | Public booking page (agents share this link!) |
| `/tools/valuation/result/[token]`, `/tools/mop-tracker/result/[token]` | Report-style results |
| `/report/[agent]/[type]/[key]` | Co-branded seller report |

## Group E - tools + content (P3, Wave 3e)

| Routes | Era | Treatment |
|---|---|---|
| 8x `/tools/*` + `/tools` hub | ink-hero | Light: icon family, hairline, scene accents on results |
| 6x `/guides/*` + hub | pre-hero | Editorial template: serif hierarchy, line-art vignettes, reveal |
| 8x `/insights/*` + hub | pre-hero | Data-editorial template: chart styling + skyline dividers |
| `/about`, `/contact`, `/trust`, `/independent`, `/how-we-score`, `/financial-advisors`, `/telegram-alerts` | mixed | Brand-consistency pass |
| `/privacy`, `/terms`, `/guides` legal | pre-hero | Typography-only pass (do NOT restructure privacy: Google-approved disclosures) |

## Group F - product (logged-in) (P3, Wave 3f)

| Route | Lines | Notes |
|---|---|---|
| `/dashboard` | 762 | Three-pillar product; scene-field section headers, icon family, empty states from the lab |
| `/dashboard/contacts/[id]` | 255 | Contact workspace |
| Sign-in state of `/dashboard` | - | First-touch after magic link: deserves the ink-hero treatment |

## Group G - everything embedded/external (P4)

| Surface | Notes |
|---|---|
| 5x `/embed/*` | Live on third-party sites: keep tiny, brand-consistent (logo, hairline). Byte budget matters |
| Email templates (`emailShell` + all senders) | Same brand language: serif heading weight, hairline accent, skyline footer line-art (test dark-mode email clients) |
| OG/social images | Currently default; skyline + serif OG template would upgrade every share card |
| 404/error pages | Check `not-found.tsx` exists; line-art empty state |

## Explicitly excluded

- 7x `/admin/*`: internal operator surfaces, Tailwind, function over form.
- `/design-lab`: the proving ground itself.

## Sequencing + verification protocol

Each wave: build -> tsc/eslint -> link-inventory diff -> local scroll-through
at 375/860/1280 -> console check -> push (git-integration deploy only) ->
post-deploy marker + anonymity checks -> USER visual gate before next wave.

Wave 3a (Group A) -> 3b (B) -> 3c (C) -> 3d (D) -> 3e (E) -> 3f (F) -> 3g (G).
P1 first because activation outreach lands on A+B; C next because it is 99%
of indexed URLs; D before E because money moments outrank reading moments.

---

# Execution plan (agreed 2026-07-26)

## THE STANDARD (set at Gate 3b round 2, 2026-07-26, binding for all waves)

The owner-approved reference is /for-agents/grow as shipped in 5797dd2:
1. **Multiple choreographed elements per page** - not one demo and done. Radar
   pings + cards arrive + bars grow + cursor clicks + counters tick, each
   section alive.
2. **Multiple colour worlds per page** - scenes ROTATE (mint > blue > amber >
   ink), never one gradient repeated. Colour is structure.
3. **Bespoke visuals per feature** - a feature named on a page gets its own
   performing mockup, never a text card. Text cards are the failure mode.
4. Alternating two-column rhythm (copy | demo, flipped each row).

Programmatic templates (Wave 3c, ~39k URLs) apply the same COLOUR language and
CSS/mount animations (scenes, fc-pop-in, reveals, marquee, line-art, hairline);
choreographed JS demos there come only from SHARED components (one cached
chunk, LCP-safe), never per-page code.

## The quality mechanism (how aesthetics survive scale)

1. **Lab-first rule.** Every NEW primitive or section composition debuts in
   /design-lab and passes the owner's eye BEFORE touching a real page. The lab
   is the contract; real pages only compose approved pieces.
2. **One bespoke moment per page.** Every redesigned page gets exactly one
   thesis moment designed by hand for THAT page (its own demo, hero, or data
   moment). Everything else composes the kit. This is the anti-slop rule:
   composition is shared, the soul is per-page.
3. **Single hand on composition, fan-out on application.** New primitives,
   hero theses and section rhythms are designed centrally. Parallel agents only
   apply locked specs to sibling pages (the 7 alternatives, the 17 SEO
   templates, the 14 guides/insights), and every fanned-out page is browser-
   reviewed centrally afterward. No agent invents design.
4. **Verification is the same every wave** (non-negotiable, live product):
   tsc + eslint -> link-inventory diff per page -> local scroll-through at
   375/860/1280 + console + choreography check -> push (git deploy only) ->
   post-deploy marker + anonymity checks -> owner scrolls -> gate verdict.
5. **Floors.** Performance: no LCP regression, scenes are CSS, zero JS added
   to programmatic templates (3c is static-only treatment). Honesty: live
   counts only, no invented numbers, testimonials or logos, privacy/terms
   structure untouched. Consistency: zero new colors or fonts outside
   globals.css tokens.

## Per-wave specs

| Wave | New primitives to design in lab FIRST | Pages | Fan-out? |
|---|---|---|---|
| 3a | JourneyDemo (seller compare->shortlist->quotes choreography), QuoteCardsDemo (quotes arriving as cards) | /, /sell, /search, /property-agents | No: all four by hand |
| 3b | GrowDemo (CountUp trilogy completion), comparison-shell composition | features, grow, planner, lead-gen, 4 feature shells, 8 comparison pages, invite/claim-success | Yes: shells + alternatives after spec locked |
| 3c | HeroBand (compact programmatic hero), unified statchip/icon row, skyline pre-footer divider | 17 templates / ~39k URLs | Yes: shared components by hand, template application fanned |
| 3d | Decision-surface polish kit (quote card, progress spine, confirmation states) | picker, quotes, contact, review, book, 2 results, report | No: money moments by hand |
| 3e | Editorial template (serif scale, pull-quotes, line-art vignettes), data-editorial chart styling | 8 tools, 14 guides+insights, 7 company pages, privacy/terms typography | Yes: guides/insights after template locked |
| 3f | Product-chrome kit (scene section headers, empty states from lab) | dashboard, contacts workspace, sign-in state | No: product by hand, feature-regression tested |
| 3g | OG image template (skyline + serif), email accent pass, 404 vignette | 5 embeds, emailShell, OG, not-found | Partly |

## Cadence

One wave per working session, gate between each. Order 3a -> 3g as listed.
Estimated 7-9 sessions total. Wave 3a starts only after Gate 2 (live
/for-agents) passes the owner's scroll.
