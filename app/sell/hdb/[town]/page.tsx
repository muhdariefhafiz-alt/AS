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
  const titleTown = town
    .split("/")
    .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
    .join("/");
  const stats = await hdbAreaStats(town);
  const priceBit = stats.median
    ? ` Median ${fmtSgd(stats.median)}.`
    : "";
  return {
    title: `Sell your HDB in ${titleTown} — Compare top agents`,
    description: `Selling an HDB flat in ${titleTown}?${priceBit} Compare the top CEA-licensed agents ranked on real transaction records. Free shortlist, agents pay only on completion.`,
    alternates: {
      canonical: `https://fair-comparisons.com/sell/hdb/${slug}`,
    },
  };
}

export default async function SellHdbTownPage({ params }: Props) {
  const { town: slug } = await params;
  const town = slugToTown(slug);
  if (!town) notFound();

  const titleTown = town
    .split("/")
    .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
    .join("/");

  const [stats, agentsRes, districtsRes] = await Promise.all([
    hdbAreaStats(town),
    supabase
      .from("sg_area_top_agents")
      .select("agent_id, agent_name, agent_slug, agency_name, score, area_txns, area_property_types")
      .eq("area_type", "town")
      .eq("area_name", town)
      .order("rank", { ascending: true })
      .limit(6),
    supabase.from("sg_districts").select("code, name").order("code"),
  ]);

  const narrative = buildNarrative(titleTown, "HDB flats", stats);
  const topAgents = (agentsRes.data ?? [])
    .filter((a) => (a.area_property_types ?? "").toUpperCase().includes("HDB"))
    .slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How much is an HDB flat in ${titleTown} worth?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: stats.median
            ? `Over the last 12 months, the median HDB resale price in ${titleTown} was around ${fmtSgd(stats.median)}, based on ${stats.count12mo} transactions.`
            : `Recent HDB transaction volume in ${titleTown} is limited; request a free agent shortlist for a current estimate.`,
        },
      },
      {
        "@type": "Question",
        name: `Who are the best agents to sell an HDB in ${titleTown}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `FairComparisons ranks every CEA-licensed agent on their actual transaction record in ${titleTown}. The top performers are shown on this page; request a free shortlist to invite them to quote.`,
        },
      },
      {
        "@type": "Question",
        name: `What does it cost to use FairComparisons?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `It is free for sellers. Agents pay a success fee only when a sale completes through the platform.`,
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <section className="bg-gradient-to-br from-[var(--ink)] via-[var(--ink-2)] to-[var(--ink)]">
        <div className="mx-auto max-w-[1120px] px-5 py-12 md:px-8 md:py-16">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--slate-2)]">
            Sell your HDB · {titleTown}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-white md:text-4xl">
            Sell your HDB flat in {titleTown} with the agents who actually close
            here
          </h1>
          {stats.median && (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
              <span className="rounded-full border border-white/15 px-3 py-1 text-white/70">
                Median {fmtSgd(stats.median)}
              </span>
              <span className="rounded-full border border-white/15 px-3 py-1 text-white/70">
                {stats.count12mo} sales in 12 months
              </span>
              {stats.topSegment && (
                <span className="rounded-full border border-white/15 px-3 py-1 text-white/70">
                  Most active: {stats.topSegment}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-10">
        <div className="mx-auto max-w-[860px] px-5 md:px-8">
          <div className="prose-sm space-y-4 text-[15px] leading-relaxed text-gray-700">
            {narrative.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {topAgents.length > 0 && (
        <section className="border-t border-gray-100 bg-gray-50 py-10">
          <div className="mx-auto max-w-[860px] px-5 md:px-8">
            <h2 className="text-xl font-bold text-gray-900">
              Top HDB agents in {titleTown}
            </h2>
            <ul className="mt-4 space-y-2">
              {topAgents.map((a) => (
                <li
                  key={a.agent_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {a.agent_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {a.agency_name} · {Math.round(Number(a.score))} AgentScore ·{" "}
                      {a.area_txns} deals in {titleTown}
                    </p>
                  </div>
                  {a.agent_slug && (
                    <Link
                      href={`/property-agents/agent/${a.agent_slug}`}
                      className="text-xs font-medium text-[var(--blue)] hover:underline"
                    >
                      Profile →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {stats.recent.length > 0 && (
        <section className="border-t border-gray-100 bg-white py-10">
          <div className="mx-auto max-w-[860px] px-5 md:px-8">
            <h2 className="text-xl font-bold text-gray-900">
              Recent HDB sales in {titleTown}
            </h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <tbody>
                  {stats.recent.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2 text-gray-700">{r.label}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {r.detail}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-900">
                        {fmtSgd(r.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-gray-100 bg-gray-50 py-12">
        <div className="mx-auto max-w-[680px] px-5 md:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Get your free shortlist for {titleTown}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We&apos;ve pre-filled your town. Tell us a little more and see your
            ranked agents.
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
