import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import EmailCapture from "../../../components/EmailCapture";
import HeroBand from "../../../components/HeroBand";
import SkylinePreFooter from "../../../components/SkylinePreFooter";
import { seoTitle } from "../../../lib/seoTitle";
import { getTypeMarketStats, type TypeMarketStats } from "../../../lib/typeMarketStats";
import { HIRE_INTENTS, getQualifyingHirePages, intentUrlParts, type HirePageParam } from "../../../lib/hireData";

export const revalidate = 43200; // 12h; daily cron also force-revalidates
export const dynamicParams = false;

type Props = { params: Promise<{ type: string }> };

// Copy + wiring per page. Slugs are indexed URLs: do not change them.
// DB property types (sg_agent_transactions): HDB, CONDOMINIUM_APARTMENTS,
// EXECUTIVE_CONDOMINIUM, LANDED, STRATA_LANDED. CEA groups condominiums and
// apartments into ONE category, so /condo and /apartment share figures and
// both say so on-page.
type TypeConfig = {
  slug: string;
  label: string;            // "Landed"
  typeLabel: string;        // "landed property"
  typeLabelPlural: string;  // "landed properties"
  titleLead: string;
  art: "hdb" | "condo" | "terrace" | "mrt";
  sellIntent: string | null;  // hireData intent slugs
  rentIntent: string | null;
  matcherType: string | null; // shortlist ?type= param (null = leave unset)
  matcherSide: "sell" | "rent-out";
  categoryNote: string | null; // honest note on what the CEA category covers
  angle: string;            // qualitative editorial angle (no numbers)
};

const TYPES: TypeConfig[] = [
  {
    slug: "hdb", label: "HDB", typeLabel: "HDB flat", typeLabelPlural: "HDB flats",
    titleLead: "Best HDB Property Agents in Singapore (2026)", art: "hdb",
    sellIntent: "sell-hdb", rentIntent: "rent-out-hdb", matcherType: "hdb", matcherSide: "sell",
    categoryNote: null,
    angle: "HDB resale is the busiest and most standardised segment of the market, and it is organised by town rather than district. An agent who closes flats every month knows current cash-over-valuation dynamics, HDB timelines, and ethnic-quota checks cold.",
  },
  {
    slug: "condo", label: "Condo", typeLabel: "condo", typeLabelPlural: "condos",
    titleLead: "Best Condo Property Agents in Singapore (2026)", art: "condo",
    sellIntent: "sell-condo", rentIntent: "rent-out-condo", matcherType: "condo", matcherSide: "sell",
    categoryNote: "CEA transaction records group condominiums and apartments into a single private non-landed category, so the figures on this page cover that combined category.",
    angle: "Private non-landed is where marketing quality and district knowledge diverge the most between agents. The volume is deep enough that a genuine specialist shows up clearly in the transaction record, district by district.",
  },
  {
    slug: "landed", label: "Landed", typeLabel: "landed property", typeLabelPlural: "landed properties",
    titleLead: "Best Landed Property Agents in Singapore (2026)", art: "terrace",
    sellIntent: "sell-landed", rentIntent: "rent-out-landed", matcherType: "landed", matcherSide: "sell",
    categoryNote: "Figures cover CEA's landed category (terrace, semi-detached, detached). Strata landed homes sit in a separate CEA category and are not counted here.",
    angle: "Landed deals are fewer, slower, and more negotiation-heavy than HDB or condo transactions, and a small pool of agents works them regularly. The closed-deal record is the fastest way to separate genuine landed specialists from generalists with one landed listing.",
  },
  {
    slug: "executive-condo", label: "Executive Condo", typeLabel: "executive condo", typeLabelPlural: "executive condos",
    titleLead: "Best Executive Condo Agents in Singapore (2026)", art: "condo",
    sellIntent: "sell-ec", rentIntent: "rent-out-ec", matcherType: "ec", matcherSide: "sell",
    categoryNote: null,
    angle: "Executive condos are a niche with their own rules: minimum occupation periods, privatisation timelines, and eligibility conditions on resale. Agents who transact ECs regularly navigate these constraints far faster than generalists.",
  },
  {
    slug: "apartment", label: "Apartment", typeLabel: "apartment", typeLabelPlural: "apartments",
    titleLead: "Best Apartment Property Agents in Singapore (2026)", art: "condo",
    sellIntent: "sell-condo", rentIntent: "rent-out-condo", matcherType: "condo", matcherSide: "sell",
    categoryNote: "CEA transaction records group apartments and condominiums into a single private non-landed category, so the figures on this page cover that combined category. The same agents appear on our condo page for that reason.",
    angle: "Apartments (typically smaller private developments without full condo facilities) trade in the same CEA category as condominiums. What matters when hiring is the same: who actually closes private non-landed deals, and how recently.",
  },
  {
    slug: "rental", label: "Rental", typeLabel: "rental", typeLabelPlural: "rentals",
    titleLead: "Best Rental Property Agents in Singapore (2026)", art: "mrt",
    sellIntent: null, rentIntent: null, matcherType: null, matcherSide: "rent-out",
    categoryNote: "Figures count whole-unit and room rental transactions across every CEA property category: HDB, condo and apartment, executive condo, landed, and strata landed.",
    angle: "Rental is a volume game: fast-moving, fee-sensitive, and dominated by agents who close leases every single month. A landlord wants an agent whose record shows constant rental throughput, not an occasional lease between sales.",
  },
];

export function generateStaticParams() {
  return TYPES.map((t) => ({ type: t.slug }));
}

const fmt = (n: number) => n.toLocaleString();

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  const t = TYPES.find((x) => x.slug === type);
  if (!t) return {};
  const stats = await getTypeMarketStats(t.slug);
  const isRental = t.slug === "rental";
  const description = stats
    ? isRental
      ? `${fmt(stats.active_rental_agents_12mo)} agents closed ${fmt(stats.rentals_12mo)} rental transactions in the last 12 months (${stats.windowLabel}). See the most active rental agents in Singapore, ranked on CEA transaction records.`
      : `${fmt(stats.active_sale_agents_12mo)} agents closed ${fmt(stats.sales_12mo)} ${t.typeLabel} sales in the last 12 months (${stats.windowLabel}). See the most active ${t.label.toLowerCase()} agents, ranked on CEA transaction records, sales and rentals split.`
    : `The most active ${t.label.toLowerCase()} agents in Singapore, ranked on CEA transaction records. Not advertising, not self-reported.`;
  return {
    title: seoTitle(t.titleLead),
    description,
    alternates: { canonical: `https://fair-comparisons.com/property-agents/best-by-type/${type}` },
  };
}

function buildFaq(t: TypeConfig, stats: TypeMarketStats) {
  const isRental = t.slug === "rental";
  const w = stats.windowLabel;
  const top = stats.top_agents[0];
  const faq: { q: string; a: string }[] = [];

  if (isRental) {
    faq.push({
      q: "How many agents actively close rentals in Singapore?",
      a: `${fmt(stats.active_rental_agents_12mo)} agents closed at least one rental in the last 12 months (${w}), for a total of ${fmt(stats.rentals_12mo)} rental transactions in CEA records: whole-unit and room rentals across HDB, condo and apartment, executive condo, landed, and strata landed.`,
    });
    if (top) {
      faq.push({
        q: "Who closed the most rentals in the last 12 months?",
        a: `${top.display_name} of ${top.agency_name} closed ${fmt(top.rentals_12mo)} rental transactions from ${w}, the highest count in CEA transaction records for that window among agents listed on FairComparisons.`,
      });
    }
    faq.push({
      q: "What does a rental agent cost in Singapore?",
      a: "Typically 0.5 to 1 month's rent per side. For a 2-year lease, landlords usually pay 1 month's rent and tenants 0.5 to 1 month; for a 1-year lease, both sides typically pay about half a month. Rates are negotiable, not fixed by regulation. See the FairComparisons agent commission guide for worked examples.",
    });
  } else {
    faq.push({
      q: `How many agents actively sell ${t.typeLabelPlural} in Singapore?`,
      a: `${fmt(stats.active_sale_agents_12mo)} agents closed at least one ${t.typeLabel} sale in the last 12 months (${w}). Counting rentals too, ${fmt(stats.active_agents_12mo)} agents had at least one ${t.typeLabel} transaction in CEA records over that window.`,
    });
    if (top) {
      faq.push({
        q: `Who closed the most ${t.typeLabel} sales in the last 12 months?`,
        a: `${top.display_name} of ${top.agency_name} closed ${fmt(top.sales_12mo)} ${t.typeLabel} sales from ${w}, the highest count in CEA transaction records for that window among agents listed on FairComparisons.`,
      });
    }
    faq.push({
      q: `What does a ${t.typeLabel} agent cost in Singapore?`,
      a: t.slug === "hdb"
        ? "For HDB resale, sellers typically pay about 1% of the sale price and buyers who engage their own agent pay about 1%. On a S$600,000 flat that is about S$6,000 per side. Rates are negotiable, not fixed by regulation. See the FairComparisons agent commission guide for worked examples."
        : `For private resale, sellers typically pay 1% to 2% of the sale price and buyers who engage their own agent pay about 1%. Rates are negotiable, not fixed by regulation. See the FairComparisons agent commission guide for worked examples.`,
    });
  }
  faq.push({
    q: "Can agents pay to rank higher on this page?",
    a: `No. The ranking is the count of ${isRental ? "rental transactions" : `${t.typeLabel} sales`} each agent closed in the 12 months from ${w}, matched to their CEA registration number in official transaction records. Payment never changes rankings anywhere on FairComparisons.`,
  });
  return faq;
}

export default async function BestByTypePage({ params }: Props) {
  const { type } = await params;
  const t = TYPES.find((x) => x.slug === type);
  if (!t) notFound();

  const isRental = t.slug === "rental";
  const stats = await getTypeMarketStats(t.slug);
  const agents = stats?.top_agents ?? [];
  const faq = stats ? buildFaq(t, stats) : [];

  // Cross-links: ONLY qualifying hire combos (density-gated), same guard the
  // hire pages themselves use. Linking a non-qualifying combo 404s.
  const qualifying = await getQualifyingHirePages();
  const areaGroups: { heading: string; intentSlug: string; items: HirePageParam[] }[] = [];
  const pushGroup = (intentSlug: string | null, heading: string, limit: number) => {
    if (!intentSlug) return;
    const intent = HIRE_INTENTS.find((i) => i.slug === intentSlug);
    if (!intent) return;
    const items = qualifying
      .filter((p) => p.intent === intentSlug)
      .sort((a, b) => b.activeAgents - a.activeAgents)
      .slice(0, limit);
    if (items.length > 0) areaGroups.push({ heading, intentSlug, items });
  };
  if (isRental) {
    for (const i of HIRE_INTENTS.filter((x) => x.represented === "LANDLORD")) {
      pushGroup(i.slug, `Rent out ${i.typeLabel === "executive condo" ? "an" : "a"} ${i.typeLabel}`, 4);
    }
  } else {
    const sellIntent = HIRE_INTENTS.find((i) => i.slug === t.sellIntent);
    const rentIntent = HIRE_INTENTS.find((i) => i.slug === t.rentIntent);
    if (sellIntent) pushGroup(sellIntent.slug, `Sell a ${sellIntent.typeLabel}, by area`, 8);
    if (rentIntent) pushGroup(rentIntent.slug, `Rent out a ${rentIntent.typeLabel}, by area`, 8);
  }

  // Shortlist matcher deep link (uses the same params the matcher reads).
  const matcherIntent = HIRE_INTENTS.find((i) => i.slug === (isRental ? "rent-out-hdb" : t.sellIntent));
  const matcherHref = t.matcherType && matcherIntent
    ? `/property-agents/shortlist?type=${intentUrlParts(matcherIntent).type}&side=${t.matcherSide}`
    : `/property-agents/shortlist?side=${t.matcherSide}`;

  const schemas: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
        { "@type": "ListItem", position: 2, name: "Property Agents", item: "https://fair-comparisons.com/property-agents" },
        { "@type": "ListItem", position: 3, name: `Best ${t.label} Agents`, item: `https://fair-comparisons.com/property-agents/best-by-type/${t.slug}` },
      ],
    },
  ];
  if (agents.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Most active ${t.label.toLowerCase()} agents in Singapore`,
      itemListElement: agents.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://fair-comparisons.com/property-agents/agent/${a.slug}`,
        name: a.display_name,
      })),
    });
  }
  if (faq.length > 0) {
    // FAQPage mirrors the visible FAQ section below 1:1.
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  const basisNoun = isRental ? "rentals" : "sales";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas).replace(/</g, "\\u003c") }} />

      <div className="mx-auto max-w-[1120px] px-5 pt-5 md:px-8">
        <nav className="text-xs text-[var(--slate-2)]">
          <Link href="/" className="hover:text-[var(--blue-wash)]">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/property-agents" className="hover:text-[var(--blue-wash)]">Property Agents</Link>
          <span className="mx-1.5">/</span>
          <span className="text-[var(--slate-2)]">Best {t.label} Agents</span>
        </nav>
      </div>

      <HeroBand
        eyebrow="Ranked on CEA records · not ads"
        title={<>Best {isRental ? "rental property" : t.slug === "hdb" ? "HDB" : t.typeLabel} agents</>}
        accent={<>in Singapore</>}
        sub={<>The agents who actually closed the most {isRental ? "rental transactions" : `${t.typeLabel} ${basisNoun}`} in the last 12 months, straight from CEA transaction records. Not advertising, not self-reported.</>}
        art={t.art}
        chips={stats ? [
          isRental
            ? `${fmt(stats.rentals_12mo)} rentals · ${stats.windowLabel}`
            : `${fmt(stats.sales_12mo)} sales · ${stats.windowLabel}`,
          `${fmt(isRental ? stats.active_rental_agents_12mo : stats.active_sale_agents_12mo)} active agents`,
        ] : undefined}
      >
        <div className="flex flex-wrap gap-3">
          <Link href={matcherHref} className="inline-flex items-center rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--blue-deep)]">
            Get a free shortlist for my home
          </Link>
          <Link href="/property-agents/check" className="inline-flex items-center rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10">
            Check an agent
          </Link>
        </div>
      </HeroBand>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <p className="text-[15px] leading-[1.75] text-gray-600" style={{ maxWidth: "72ch" }}>
          {t.angle}
        </p>
        {t.categoryNote && (
          <p className="mt-3 text-[13px] leading-relaxed text-gray-500" style={{ maxWidth: "72ch" }}>
            {t.categoryNote}
            {t.slug === "apartment" && (
              <> Compare with the <Link href="/property-agents/best-by-type/condo" className="underline">condo page</Link>.</>
            )}
          </p>
        )}

        {/* Market context: precomputed 12-month snapshot, windows printed */}
        {stats && (
          <section className="mt-10 fc-scene fc-scene--inbox fc-reveal" style={{ padding: "clamp(16px,2.5vw,28px)" }}>
            <div className="fc-scene__card" style={{ padding: "clamp(20px,3vw,30px)" }}>
              <div className="eyebrow">Market context</div>
              <h2 style={{ fontSize: "var(--t-h3)", margin: "10px 0 0" }}>
                The {isRental ? "rental" : t.label.toLowerCase() === "hdb" ? "HDB" : t.label.toLowerCase()} market, <span className="italic-serif" style={{ color: "var(--blue)" }}>in numbers</span>
              </h2>
              <p className="kicker" style={{ marginTop: 10 }}>
                12 months · {stats.windowLabel} · CEA transaction records
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {!isRental && <span className="statchip tnum">{fmt(stats.sales_12mo)} sales</span>}
                <span className="statchip tnum">{fmt(stats.rentals_12mo)} rentals</span>
                {!isRental && <span className="statchip tnum">{fmt(stats.active_sale_agents_12mo)} agents closed a sale</span>}
                <span className="statchip tnum">{fmt(stats.active_rental_agents_12mo)} agents closed a rental</span>
                {stats.top5_share_pct !== null && (
                  <span className="statchip tnum">top 5 agents = {stats.top5_share_pct}% of {basisNoun}</span>
                )}
              </div>
              <p className="mt-4 text-[14px] leading-[1.7] text-gray-600">
                {isRental ? (
                  <>From {stats.windowLabel}, {fmt(stats.active_rental_agents_12mo)} agents closed {fmt(stats.rentals_12mo)} rental transactions (whole-unit and room, across all property categories). The 5 busiest rental agents accounted for {stats.top5_share_pct ?? 0}% of them, so no handful of agents controls this market, but the gap between an occasional and a full-time rental agent is wide.</>
                ) : (
                  <>From {stats.windowLabel}, {fmt(stats.active_sale_agents_12mo)} agents closed {fmt(stats.sales_12mo)} {t.typeLabel} sales, and {fmt(stats.active_rental_agents_12mo)} agents closed {fmt(stats.rentals_12mo)} {t.typeLabel} rentals. The 5 busiest sellers accounted for {stats.top5_share_pct ?? 0}% of all {t.typeLabel} sales. Sales and rentals are counted separately throughout this page: they are different jobs.</>
                )}
              </p>
            </div>
          </section>
        )}

        {/* The ranking */}
        <section className="mt-12">
          <div className="kicker">The ranking</div>
          <h2 style={{ fontSize: "var(--t-h3)", margin: "8px 0 0" }}>
            Most active {isRental ? "rental" : t.label.toLowerCase() === "hdb" ? "HDB" : t.label.toLowerCase()} agents, <span className="italic-serif" style={{ color: "var(--blue)" }}>last 12 months</span>
          </h2>
          {stats && (
            <p className="mt-2 text-[13px] text-gray-500">
              Ranked by {isRental ? "rental transactions" : `${t.typeLabel} sales`} closed from {stats.windowLabel}, matched to each agent&rsquo;s CEA registration number. Sales and rentals shown separately.
            </p>
          )}

          <div className="mt-6 space-y-3 fc-pop-in">
            {agents.map((a, i) => (
              <Link
                key={a.slug || i}
                href={`/property-agents/agent/${a.slug}`}
                className="fc-reveal group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition hover:border-[var(--line-2)] hover:shadow-sm"
                style={{ ["--reveal-delay" as string]: `${Math.min(i * 0.04, 0.4)}s` }}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                  i === 0 ? "bg-amber-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-700" : "bg-[var(--blue)]"
                }`}>{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 group-hover:text-[var(--blue)]">{a.display_name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {a.agency_name}
                    {a.claimed && <span className="ml-1.5 rounded bg-[var(--blue-wash)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--blue)]">Claimed</span>}
                  </p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-sm font-bold text-gray-900 tnum">
                    {isRental ? <>{fmt(a.rentals_12mo)} rentals</> : <>{fmt(a.sales_12mo)} sales &middot; {fmt(a.rentals_12mo)} rentals</>}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">last 12 mo &middot; last deal {a.last_txn}</p>
                </div>
                {a.score !== null && a.score > 0 && (
                  <div className="flex shrink-0 flex-col items-center rounded-lg border border-[var(--line)] bg-[var(--blue-wash)] px-3 py-1.5">
                    <span className="text-lg font-extrabold text-[var(--blue)]">{a.score}</span>
                    <span className="text-[8px] uppercase tracking-widest text-gray-400">Score</span>
                  </div>
                )}
              </Link>
            ))}
            {agents.length === 0 && (
              <p className="rounded-xl border border-gray-100 bg-gray-50 p-5 text-sm text-gray-500">
                We could not load the ranking for this category right now. The underlying CEA transaction data is unaffected; please check back shortly.
              </p>
            )}
          </div>

          {stats && agents.length > 0 && (
            <p className="mt-4 text-xs leading-relaxed text-gray-400">
              {`Counts cover ${stats.windowLabel} and come from official CEA transaction records matched to each agent’s registration number.`}
              {isRental
                ? " Rentals include whole-unit and room leases across HDB, condo and apartment, executive condo, landed, and strata landed."
                : " Sales include resale, new sale, and sub-sale; rentals include whole-unit and room leases."}{" "}
              Figures reflect transactions we can source and exclude deal types not in the public record.
            </p>
          )}
        </section>

        {/* How we rank */}
        <section className="mt-12 fc-scene fc-scene--ink fc-reveal" style={{ padding: "clamp(16px,2.5vw,28px)" }}>
          <div className="fc-scene__card" style={{ padding: "clamp(20px,3vw,30px)" }}>
            <div className="eyebrow">How we rank these agents</div>
            <h2 style={{ fontSize: "var(--t-h3)", margin: "10px 0 0" }}>
              Counted from records, <span className="italic-serif" style={{ color: "var(--blue)" }}>never sold</span>
            </h2>
            <ul className="mt-4 space-y-2 text-[14.5px] leading-[1.7] text-gray-600" style={{ paddingLeft: 18 }}>
              <li>The order above is a pure count of {isRental ? "rental transactions" : `${t.typeLabel} sales`} each agent closed in the window shown, from official CEA transaction records, matched on CEA registration number rather than name.</li>
              <li>The blue AgentScore chip is separate context: a 0-100 score computed from each agent&rsquo;s full CEA record (volume, recency, diversity, experience). It does not decide the order on this page.</li>
              <li>No agent can pay to appear here or to move up. Subscriptions buy tools, never position, on every ranking we publish.</li>
            </ul>
            <Link href="/how-we-score" className="mt-4 inline-block text-sm font-semibold text-[var(--blue)] underline">
              Read the full AgentScore methodology
            </Link>
          </div>
        </section>

        {/* FAQ: visible Q&As, mirrored 1:1 in the FAQPage JSON-LD above */}
        {faq.length > 0 && (
          <section className="mt-12">
            <div className="kicker">Questions people ask</div>
            <h2 style={{ fontSize: "var(--t-h3)", margin: "8px 0 0" }}>
              {t.label} agents, <span className="italic-serif" style={{ color: "var(--blue)" }}>straight answers</span>
            </h2>
            <div className="mt-6 space-y-3">
              {faq.map((f) => (
                <div key={f.q} className="fc-reveal rounded-xl border border-gray-200 bg-white p-5">
                  <h3 className="text-[16px] font-bold text-gray-900" style={{ fontFamily: "var(--font-sans)" }}>{f.q}</h3>
                  <p className="mt-2 text-[14.5px] leading-[1.7] text-gray-600">
                    {f.a.includes("FairComparisons agent commission guide") ? (
                      <>
                        {f.a.split("See the FairComparisons agent commission guide")[0]}
                        See the <Link href="/guides/property-agent-commission" className="underline">FairComparisons agent commission guide</Link>
                        {f.a.split("See the FairComparisons agent commission guide")[1]}
                      </>
                    ) : (
                      f.a
                    )}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Area deep links: only density-gated hire combos, never a 404 */}
        {areaGroups.length > 0 && (
          <section className="mt-12 fc-scene fc-scene--planner fc-reveal" style={{ padding: "clamp(16px,2.5vw,28px)" }}>
            <div className="fc-scene__card" style={{ padding: "clamp(20px,3vw,30px)" }}>
              <div className="eyebrow">Go local</div>
              <h2 style={{ fontSize: "var(--t-h3)", margin: "10px 0 0" }}>
                The same ranking, <span className="italic-serif" style={{ color: "var(--blue)" }}>for your area</span>
              </h2>
              <p className="mt-2 text-[14px] leading-[1.7] text-gray-600">
                Every page below ranks agents on {isRental ? "rental" : t.typeLabel} deals actually closed in that specific area.
              </p>
              {areaGroups.map((g) => (
                <div key={g.intentSlug + g.heading} className="mt-5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400" style={{ fontFamily: "var(--font-mono)" }}>{g.heading}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {g.items.map((p) => (
                      <Link key={g.intentSlug + p.area} href={`/property-agents/hire/${p.intent}/${p.area}`}
                        className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 transition hover:border-[var(--line-2)] hover:text-[var(--blue)]">
                        {p.areaName}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Conversion: shortlist matcher, the single hairline primary CTA */}
        <section className="mt-12 fc-scene fc-scene--grow fc-reveal" style={{ padding: "clamp(16px,2.5vw,28px)" }}>
          <div className="fc-scene__card" style={{ padding: "clamp(20px,3vw,30px)" }}>
            <h2 style={{ fontSize: "var(--t-h3)", margin: 0 }}>
              Not sure which of these to call?
            </h2>
            <p className="mt-2 text-[15px] leading-[1.7] text-gray-600">
              Tell us about your {isRental ? "property" : t.typeLabel} and area, and see the agents best matched to your exact home, each ranked on their real record. Free, no sign-up, and you choose who to contact.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Link href={matcherHref} className="fc-btn fc-btn--primary fc-btn--hairline">
                Get my free shortlist
              </Link>
              {!isRental && (
                <Link href="/sell" className="text-sm font-semibold text-[var(--blue)] underline">
                  Selling? Compare agent proposals
                </Link>
              )}
            </div>
          </div>
          <div className="fc-scene__card" style={{ padding: 26, marginTop: 16 }}>
            <EmailCapture
              variant="inline"
              source="best-by-type"
              pagePath={`/property-agents/best-by-type/${type}`}
              heading={`Get ${t.label} market updates`}
              description={`We'll notify you when ${t.label.toLowerCase()} agent rankings change or new transaction data is published.`}
            />
          </div>
        </section>

        {/* Other types */}
        <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-5 fc-reveal">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Browse by property type</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {TYPES.filter((x) => x.slug !== type).map((x) => (
              <Link key={x.slug} href={`/property-agents/best-by-type/${x.slug}`}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 transition hover:border-[var(--line-2)] hover:text-[var(--blue)]">
                Best {x.label} agents
              </Link>
            ))}
          </div>
        </div>
      </div>

      <SkylinePreFooter />
    </>
  );
}
