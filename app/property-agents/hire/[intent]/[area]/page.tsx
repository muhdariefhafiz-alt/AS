import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import HeroBand from "../../../../components/HeroBand";
import SkylinePreFooter from "../../../../components/SkylinePreFooter";
import EmailCapture from "../../../../components/EmailCapture";
import { seoTitle } from "../../../../lib/seoTitle";
import {
  HIRE_INTENTS,
  getQualifyingHirePages,
  getHirePageData,
  intentUrlParts,
} from "../../../../lib/hireData";

// Static, pre-rendered, dynamicParams=false: any non-qualifying combo 404s cheaply
// instead of triggering an on-demand DB render (the exact pattern that caused the
// crawl cost incident). Every generated page is density-gated to >= 8 active agents.
export const revalidate = 43200; // 12h; the daily cron also force-revalidates
export const dynamicParams = false;

type Props = { params: Promise<{ intent: string; area: string }> };

export async function generateStaticParams() {
  const pages = await getQualifyingHirePages(8);
  return pages.map((p) => ({ intent: p.intent, area: p.area }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { intent: intentSlug, area } = await params;
  const data = await getHirePageData(intentSlug, area);
  if (!data) return {};
  const { intent, areaShort, summary } = data;
  const title = `Best Agents to ${cap(intent.action)} a ${intent.typeLabel} in ${areaShort} (2026)`;
  return {
    title: seoTitle(title),
    description: `The ${data.agents.length} most active agents for ${intent.actionNoun} a ${intent.typeLabel} in ${areaShort}, ranked on real CEA transaction records. ${summary.active_agents} agents closed ${sideDeals(intent.represented)} here recently. Not advertising, not self-reported.`,
    alternates: { canonical: `https://fair-comparisons.com/property-agents/hire/${intentSlug}/${area}` },
  };
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function sideDeals(rep: string) { return rep === "SELLER" ? "sales" : "rentals"; }
function sideDeal(rep: string) { return rep === "SELLER" ? "sale" : "rental"; }

export default async function HireAgentPage({ params }: Props) {
  const { intent: intentSlug, area } = await params;
  const data = await getHirePageData(intentSlug, area);
  if (!data) notFound();

  const { intent, areaShort, areaName, agents, summary } = data;
  const parts = intentUrlParts(intent);
  const matcherHref = `/property-agents/shortlist?type=${parts.type}&side=${parts.side}&area=${area}`;
  const top = agents[0];
  const dealsWord = sideDeals(intent.represented);
  const dealWord = sideDeal(intent.represented);

  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
        { "@type": "ListItem", position: 2, name: "Property Agents", item: "https://fair-comparisons.com/property-agents" },
        { "@type": "ListItem", position: 3, name: `${cap(intent.action)} a ${intent.typeLabel} in ${areaShort}`, item: `https://fair-comparisons.com/property-agents/hire/${intentSlug}/${area}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Best agents to ${intent.action} a ${intent.typeLabel} in ${areaShort}`,
      itemListElement: agents.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://fair-comparisons.com/property-agents/agent/${a.slug}`,
        name: a.display_name,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `Who is the best agent to ${intent.action} a ${intent.typeLabel} in ${areaShort}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Ranked purely on official CEA transaction records, ${top.display_name} (${top.agency_name}) has closed the most recent ${intent.typeLabel} ${dealsWord} in ${areaShort}, with ${top.recent_txns} in the last three years. This is a factual transaction count, not advertising or a self-reported claim.`,
          },
        },
        {
          "@type": "Question",
          name: `How are these ${intent.typeLabel} agents ranked?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `By the number of ${intent.typeLabel} ${dealWord} transactions each agent actually closed in ${areaShort} over the last three years, matched to the agent's CEA registration number and sourced from official transaction data. It is not based on advertising spend or listing placement.`,
          },
        },
        {
          "@type": "Question",
          name: `How many agents ${intent.action} ${intent.typeLabelPlural} in ${areaShort}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `${summary.active_agents} agents have closed at least one ${intent.typeLabel} ${dealWord} in ${areaShort} in the last three years. This page shows the ${agents.length} most active.`,
          },
        },
      ],
    },
  ];

  // Cross-link ONLY sibling combos that actually qualify (density gate). The
  // unfiltered list linked non-existent combos, spraying internal 404s across
  // the family (caught by a site audit: 30 broken links / 9 dead URLs).
  const qualifying = await getQualifyingHirePages();
  const validIntentsHere = new Set(qualifying.filter((p) => p.area === area).map((p) => p.intent));
  const otherIntentsSameArea = HIRE_INTENTS.filter(
    (i) => i.slug !== intent.slug && i.areaType === intent.areaType && validIntentsHere.has(i.slug)
  ).slice(0, 4);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas).replace(/</g, "\\u003c") }} />

      <div className="mx-auto max-w-[1120px] px-5 pt-5 md:px-8">
        <nav className="text-xs text-[var(--slate-2)]">
          <Link href="/" className="hover:text-[var(--blue-wash)]">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/property-agents" className="hover:text-[var(--blue-wash)]">Property Agents</Link>
          <span className="mx-1.5">/</span>
          <span className="text-[var(--slate-2)]">{cap(intent.action)} a {intent.typeLabel} in {areaShort}</span>
        </nav>
      </div>

      <HeroBand
        eyebrow="Who actually sells here"
        title={<>Best agents to {intent.action} a {intent.typeLabel}</>}
        accent={<>in {areaShort}</>}
        sub={<>Ranked by the agents who have actually closed the most {intent.typeLabel} {dealsWord} in {areaShort}, straight from CEA transaction records. Not advertising, not self-reported.</>}
        art={intent.propertyType === "HDB" ? "hdb" : intent.propertyType === "LANDED" ? "terrace" : "condo"}
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
        <p className="text-[15px] leading-[1.75] text-gray-600">
          Over the last three years, <strong>{summary.active_agents.toLocaleString()} agents</strong> closed a total of{" "}
          <strong>{summary.recent_txns.toLocaleString()} {intent.typeLabel} {dealsWord}</strong> in {areaName}. Portals show you whoever paid for placement. This ranks the {agents.length} agents who have genuinely {intent.represented === "SELLER" ? "sold" : "rented out"} the most {intent.typeLabelPlural} here, on their real record.
        </p>

        <div className="mt-8 space-y-3 fc-pop-in">
          {agents.map((a, i) => (
            <Link
              key={a.slug || i}
              href={`/property-agents/agent/${a.slug}`}
              className="fc-reveal group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition hover:border-[var(--line-2)] hover:shadow-sm"
              style={{ ["--reveal-delay" as string]: `${Math.min(i * 0.05, 0.5)}s` }}
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
                <p className="text-sm font-bold text-gray-900">{a.recent_txns}</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-400">recent {dealWord}s here</p>
              </div>
              {a.score > 0 && (
                <div className="flex shrink-0 flex-col items-center rounded-lg border border-[var(--line)] bg-[var(--blue-wash)] px-3 py-1.5">
                  <span className="text-lg font-extrabold text-[var(--blue)]">{a.score}</span>
                  <span className="text-[8px] uppercase tracking-widest text-gray-400">Score</span>
                </div>
              )}
            </Link>
          ))}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-gray-400">
          &quot;Recent {dealWord}s here&quot; counts the {intent.typeLabel} {dealWord} transactions each agent closed in {areaShort} in the last three years, matched to their CEA registration number. Last transaction on record shown on each agent&apos;s profile. Figures reflect transactions we can source and exclude deal types not in the public record.
        </p>

        {/* Demand-led CTA: the shortlist funnel */}
        <div className="mt-10 fc-scene fc-scene--grow fc-reveal" style={{ padding: "clamp(16px,2.5vw,28px)" }}>
          <div className="fc-scene__card" style={{ padding: 26 }}>
            <h2 className="text-lg font-bold text-gray-900">Not sure which of these to call?</h2>
            <p className="mt-2 text-[15px] leading-[1.7] text-gray-600">
              Tell us about your {intent.typeLabel} and we will put together a free, no-obligation shortlist of the agents best matched to your exact home and street, each ranked on their real record. You choose who to contact.
            </p>
            <Link href={matcherHref} className="mt-4 inline-flex items-center rounded-lg bg-[var(--blue)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--blue-deep)]">
              Get my free shortlist
            </Link>
          </div>
        </div>

        {/* Email capture */}
        <div className="mt-10 fc-scene fc-scene--grow fc-reveal" style={{ padding: "clamp(16px,2.5vw,28px)" }}>
          <div className="fc-scene__card" style={{ padding: 26 }}>
            <EmailCapture
              variant="inline"
              source="hire_page"
              pagePath={`/property-agents/hire/${intentSlug}/${area}`}
              heading={`Track ${areaShort} ${intent.typeLabel} agents`}
              description={`We will let you know when the ranking of top ${intent.typeLabel} agents in ${areaShort} changes or new transaction data is published.`}
            />
          </div>
        </div>

        {/* Internal link silo */}
        {otherIntentsSameArea.length > 0 && (
          <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-5 fc-reveal">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Other agents in {areaShort}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {otherIntentsSameArea.map((oi) => (
                <Link key={oi.slug} href={`/property-agents/hire/${oi.slug}/${area}`}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 transition hover:border-[var(--line-2)] hover:text-[var(--blue)]">
                  {cap(oi.action)} a {oi.typeLabel}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <SkylinePreFooter />
    </>
  );
}
