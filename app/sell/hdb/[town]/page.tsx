import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "../../../lib/supabase";
import SellForm from "../../SellForm";
import {
  hdbAreaStats,
  buildNarrative,
  fmtSgd,
} from "../../../lib/sellAreaContent";
import { getShortlist, getQualifyingHirePages } from "../../../lib/hireData";
import { townDisplayName } from "../../../lib/hdbData";
import { seoTitle } from "../../../lib/seoTitle";
import HeroBand from "../../../components/HeroBand";
import SkylinePreFooter from "../../../components/SkylinePreFooter";

export const revalidate = 86400;

const HDB_TOWNS = [
  "ANG MO KIO", "BEDOK", "BISHAN", "BUKIT BATOK", "BUKIT MERAH",
  "BUKIT PANJANG", "BUKIT TIMAH", "CENTRAL AREA", "CHOA CHU KANG", "CLEMENTI",
  "GEYLANG", "HOUGANG", "JURONG EAST", "JURONG WEST", "KALLANG/WHAMPOA",
  "MARINE PARADE", "PASIR RIS", "PUNGGOL", "QUEENSTOWN", "SEMBAWANG",
  "SENGKANG", "SERANGOON", "TAMPINES", "TENGAH", "TOA PAYOH",
  "WOODLANDS", "YISHUN",
];

function slugToTown(slug: string): string | null {
  const target = slug.replace(/-/g, " ").toUpperCase();
  // KALLANG/WHAMPOA slug becomes "kallang-whampoa"
  const normalised = target.replace(" ", "/");
  return (
    HDB_TOWNS.find((t) => t === target || t === normalised) ?? null
  );
}

function townToSlug(town: string): string {
  return town.toLowerCase().replace(/\//g, "-").replace(/\s+/g, "-");
}

export function generateStaticParams() {
  return HDB_TOWNS.map((t) => ({ town: townToSlug(t) }));
}

type Props = { params: Promise<{ town: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { town: slug } = await params;
  const town = slugToTown(slug);
  if (!town) return {};
  const titleTown = townDisplayName(town);
  const stats = await hdbAreaStats(town);
  const priceBit = stats.median
    ? ` Median ${fmtSgd(stats.median)} across ${stats.count12mo.toLocaleString("en-SG")} sales in 12 months.`
    : "";
  return {
    title: seoTitle(`Sell Your HDB in ${titleTown}`),
    description: `Selling an HDB flat in ${titleTown}?${priceBit} Compare the top CEA-licensed agents ranked on real transaction records, then contact the ones you choose. Always free for sellers.`,
    alternates: {
      canonical: `https://fair-comparisons.com/sell/hdb/${slug}`,
    },
  };
}

export default async function SellHdbTownPage({ params }: Props) {
  const { town: slug } = await params;
  const town = slugToTown(slug);
  if (!town) notFound();

  const titleTown = townDisplayName(town);

  const [stats, shortlist, hirePages, districtsRes] = await Promise.all([
    hdbAreaStats(town),
    // Seller-side evidence: HDB sale transactions only (never summed with
    // rentals), matched on CEA registration, 36-month window.
    getShortlist("sell-hdb", slug, 5),
    // Snapshot-table read (sg_hire_page_combos): cheap, build-safe.
    getQualifyingHirePages(),
    supabase.from("sg_districts").select("code, name").order("code"),
  ]);

  const narrative = buildNarrative(titleTown, "HDB flats", stats);
  const sellerAgents = shortlist?.agents ?? [];
  const sellerSummary = shortlist?.summary ?? null;
  const hireQualifies = hirePages.some(
    (p) => p.intent === "sell-hdb" && p.area === slug
  );
  const windowStr = stats.window
    ? `${stats.window.from} to ${stats.window.thru}`
    : "the last 12 months";

  // Single source for the FAQ: rendered on the page below AND emitted as
  // FAQPage JSON-LD, so schema always matches visible content.
  const faqs = [
    {
      q: `How much is an HDB flat in ${titleTown} worth?`,
      a: stats.median
        ? `From ${windowStr}, ${stats.count12mo.toLocaleString("en-SG")} HDB flats were resold in ${titleTown} at a median price of ${fmtSgd(stats.median)}. ${
            stats.byType && stats.byType.length > 0
              ? `The busiest segment was ${stats.byType[0].label} flats: ${stats.byType[0].txns.toLocaleString("en-SG")} sales at a ${fmtSgd(stats.byType[0].median)} median.`
              : ""
          }`.trim()
        : `Recent HDB transaction volume in ${titleTown} is limited, so there is no reliable 12-month median to quote. Compare the area's ranked agents for a current estimate.`,
    },
    {
      q: `Who are the best agents to sell an HDB flat in ${titleTown}?`,
      a:
        sellerSummary && sellerSummary.active_agents > 0
          ? `${sellerSummary.active_agents.toLocaleString("en-SG")} CEA-licensed agents closed ${sellerSummary.recent_txns.toLocaleString("en-SG")} HDB sale transactions in ${titleTown} in the last 36 months. This page lists the most active by closed HDB sales, counted from CEA transaction records. Compare them and contact the ones you choose.`
          : `FairComparisons ranks every CEA-licensed agent on their actual transaction record in ${titleTown}. Compare them and contact the ones you choose.`,
    },
    {
      q: `What does it cost to use FairComparisons?`,
      a: `It is always free for sellers. FairComparisons is paid by agent subscriptions for tools, not by sales, so its rankings are never for sale.`,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <HeroBand
        eyebrow={`Sell your HDB · ${titleTown}`}
        title={<>Sell your HDB flat in {titleTown} with the agents who</>}
        accent={<>actually close here</>}
        chips={
          stats.median
            ? [
                `Median ${fmtSgd(stats.median)}`,
                `${stats.count12mo.toLocaleString("en-SG")} sales · ${windowStr}`,
                ...(stats.topSegment
                  ? [`Most active: ${stats.topSegment}`]
                  : []),
              ]
            : []
        }
        art="terrace"
      />

      <section className="bg-white py-10">
        <div className="mx-auto max-w-[860px] px-5 md:px-8">
          <div className="fc-reveal prose-sm space-y-4 text-[15px] leading-relaxed text-gray-700">
            {narrative.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {stats.byType && stats.byType.length > 0 && (
        <section className="border-t border-gray-100 bg-white pb-10">
          <div className="fc-reveal mx-auto max-w-[860px] px-5 pt-10 md:px-8">
            <div className="eyebrow eyebrow--muted">Market evidence</div>
            <h2 className="mt-2 text-xl font-bold text-gray-900">
              What sold in {titleTown}, {windowStr}
            </h2>
            <div
              className="fc-scene fc-scene--inbox mt-4"
              style={{ padding: "clamp(16px,2.5vw,28px)" }}
            >
              <div className="fc-pop-in overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-400">
                      <th className="px-4 py-2 font-semibold">Flat type</th>
                      <th className="px-4 py-2 text-right font-semibold">Sales</th>
                      <th className="px-4 py-2 text-right font-semibold">Median price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byType.map((r) => (
                      <tr key={r.label} className="border-b border-gray-100 last:border-0">
                        <td className="px-4 py-2 font-medium text-gray-800">{r.label}</td>
                        <td className="px-4 py-2 text-right text-gray-600">
                          {r.txns.toLocaleString("en-SG")}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-900">
                          {fmtSgd(r.median)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
              {stats.count12mo.toLocaleString("en-SG")} HDB resale transactions in {titleTown}, {windowStr}.
              {stats.priorCount && stats.priorCount >= 30
                ? ` Prior 12 months: ${stats.priorCount.toLocaleString("en-SG")} transactions.`
                : ""}{" "}
              Source: HDB resale data via data.gov.sg.
            </p>
          </div>
        </section>
      )}

      {sellerAgents.length > 0 && sellerSummary && (
        <section className="border-t border-gray-100 bg-gray-50 py-10">
          <div className="fc-reveal mx-auto max-w-[860px] px-5 md:px-8">
            <div className="eyebrow eyebrow--muted">Who actually sells here</div>
            <h2 className="mt-2 text-xl font-bold text-gray-900">
              Agents with the most HDB sales in {titleTown}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {sellerSummary.active_agents.toLocaleString("en-SG")} agents closed{" "}
              {sellerSummary.recent_txns.toLocaleString("en-SG")} HDB sales in{" "}
              {titleTown} in the last 36 months. These are the most active, counted
              on the seller side only, never mixed with rentals.
            </p>
            <div
              className="fc-scene fc-scene--grow mt-4"
              style={{ padding: "clamp(16px,2.5vw,28px)" }}
            >
            <ul className="fc-pop-in space-y-2">
              {sellerAgents.map((a) => (
                <li
                  key={a.slug}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {a.display_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {a.agency_name} · {a.recent_txns} HDB sales here in 36 months
                      {a.last_txn ? ` · last sale ${a.last_txn}` : ""}
                    </p>
                  </div>
                  {a.slug && (
                    <Link
                      href={`/property-agents/agent/${a.slug}`}
                      className="shrink-0 text-xs font-medium text-[var(--blue)] hover:underline"
                    >
                      Profile &rsaquo;
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
              Sale counts are HDB transactions where the agent represented the
              seller, closed in {titleTown}{" "}in the last 36 months, matched to the
              agent&apos;s CEA registration number. Source: CEA transaction records.
            </p>
            {hireQualifies && (
              <p className="mt-3 text-sm">
                <Link
                  href={`/property-agents/hire/sell-hdb/${slug}`}
                  className="font-medium text-[var(--blue)] hover:underline"
                >
                  See the full ranking of agents to sell an HDB flat in {titleTown}{" "}&rsaquo;
                </Link>
              </p>
            )}
          </div>
        </section>
      )}

      {stats.recent.length > 0 && (
        <section className="border-t border-gray-100 bg-white py-10">
          <div className="fc-reveal mx-auto max-w-[860px] px-5 md:px-8">
            <div className="eyebrow eyebrow--muted">Recent transactions</div>
            <h2 className="mt-2 text-xl font-bold text-gray-900">
              Recent HDB sales in {titleTown}
            </h2>
            <div
              className="fc-scene fc-scene--planner mt-4"
              style={{ padding: "clamp(16px,2.5vw,28px)" }}
            >
            <div className="fc-pop-in overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <tbody>
                  {stats.recent.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2 text-gray-700">{r.label}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {r.detail}
                      </td>
                      {r.when && (
                        <td className="px-4 py-2 text-right text-xs text-gray-500">
                          {r.when}
                        </td>
                      )}
                      <td className="px-4 py-2 text-right font-semibold text-gray-900">
                        {fmtSgd(r.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
              The {stats.recent.length} most recent resale transactions on record
              in {titleTown}. Source: HDB resale data via data.gov.sg.
            </p>
          </div>
        </section>
      )}

      <section className="border-t border-gray-100 bg-gray-50 py-10">
        <div className="fc-reveal mx-auto max-w-[860px] px-5 md:px-8">
          <div className="eyebrow eyebrow--muted">Questions sellers ask</div>
          <h2 className="mt-2 text-xl font-bold text-gray-900">
            Selling an HDB flat in {titleTown}: FAQ
          </h2>
          <div className="mt-4 space-y-5">
            {faqs.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-gray-900">{f.q}</h3>
                <p className="mt-1 text-[15px] leading-[1.75] text-gray-600">
                  {f.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SkylinePreFooter />

      <section className="border-t border-gray-100 bg-gray-50 py-12">
        <div className="fc-reveal mx-auto max-w-[680px] px-5 md:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Compare the ranked agents for {titleTown}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We&apos;ve pre-filled your town. Tell us a little more and see your
            ranked agents, then contact the ones you choose.
          </p>
          <div className="mt-6">
            <SellForm
              hdbTowns={HDB_TOWNS}
              districts={districtsRes.data ?? []}
              initialPropertyType="HDB"
              initialTown={town}
            />
          </div>
        </div>
      </section>
    </>
  );
}
