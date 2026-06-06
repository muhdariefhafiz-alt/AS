import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "../../../lib/supabase";
import SellForm from "../../SellForm";
import {
  privateAreaStats,
  buildNarrative,
  fmtSgd,
} from "../../../lib/sellAreaContent";

export const revalidate = 86400;

type DistrictRow = { code: string; slug: string; name: string };

// Hardcoded so route resolution never depends on a DB read (the 28 SG postal
// districts are fixed). Names mirror sg_districts.
const SG_DISTRICTS: DistrictRow[] = [
  { code: "D01", slug: "d01-raffles-place", name: "Raffles Place, Cecil, Marina, People's Park" },
  { code: "D02", slug: "d02-anson", name: "Anson, Tanjong Pagar" },
  { code: "D03", slug: "d03-queenstown", name: "Queenstown, Tiong Bahru" },
  { code: "D04", slug: "d04-telok-blangah", name: "Telok Blangah, Harbourfront" },
  { code: "D05", slug: "d05-pasir-panjang", name: "Pasir Panjang, Hong Leong Garden, Clementi New Town" },
  { code: "D06", slug: "d06-high-street", name: "High Street, Beach Road" },
  { code: "D07", slug: "d07-middle-road", name: "Middle Road, Golden Mile" },
  { code: "D08", slug: "d08-little-india", name: "Little India" },
  { code: "D09", slug: "d09-orchard", name: "Orchard, Cairnhill, River Valley" },
  { code: "D10", slug: "d10-ardmore", name: "Ardmore, Bukit Timah, Holland Road, Tanglin" },
  { code: "D11", slug: "d11-watten-estate", name: "Watten Estate, Novena, Thomson" },
  { code: "D12", slug: "d12-balestier", name: "Balestier, Toa Payoh, Serangoon" },
  { code: "D13", slug: "d13-macpherson", name: "Macpherson, Braddell" },
  { code: "D14", slug: "d14-geylang", name: "Geylang, Eunos" },
  { code: "D15", slug: "d15-katong", name: "Katong, Joo Chiat, Amber Road" },
  { code: "D16", slug: "d16-bedok", name: "Bedok, Upper East Coast, Eastwood, Kew Drive" },
  { code: "D17", slug: "d17-loyang", name: "Loyang, Changi" },
  { code: "D18", slug: "d18-tampines", name: "Tampines, Pasir Ris" },
  { code: "D19", slug: "d19-serangoon-garden", name: "Serangoon Garden, Hougang, Punggol" },
  { code: "D20", slug: "d20-bishan", name: "Bishan, Ang Mo Kio" },
  { code: "D21", slug: "d21-upper-bukit-timah", name: "Upper Bukit Timah, Clementi Park, Ulu Pandan" },
  { code: "D22", slug: "d22-jurong", name: "Jurong" },
  { code: "D23", slug: "d23-hillview", name: "Hillview, Dairy Farm, Bukit Panjang, Choa Chu Kang" },
  { code: "D24", slug: "d24-lim-chu-kang", name: "Lim Chu Kang, Tengah" },
  { code: "D25", slug: "d25-kranji", name: "Kranji, Woodgrove" },
  { code: "D26", slug: "d26-upper-thomson", name: "Upper Thomson, Springleaf" },
  { code: "D27", slug: "d27-yishun", name: "Yishun, Sembawang" },
  { code: "D28", slug: "d28-seletar", name: "Seletar" },
];

export function generateStaticParams() {
  return SG_DISTRICTS.map((d) => ({ district: d.slug }));
}

type Props = { params: Promise<{ district: string }> };

function districtNum(code: string): string {
  return code.replace(/[^0-9]/g, "").replace(/^0+/, "");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { district: slug } = await params;
  const districts = SG_DISTRICTS;
  const d = districts.find((x) => x.slug === slug);
  if (!d) return {};
  const shortName = d.name.split(",")[0];
  const stats = await privateAreaStats(districtNum(d.code));
  const priceBit = stats.median ? ` Median ${fmtSgd(stats.median)}.` : "";
  return {
    title: `Sell your condo in ${shortName} (${d.code}): compare top agents`,
    description: `Selling a private property in ${shortName}, ${d.code}?${priceBit} Compare the top CEA-licensed agents ranked on real URA transaction records, then contact the ones you choose. Always free for sellers.`,
    alternates: {
      canonical: `https://fair-comparisons.com/sell/condo/${slug}`,
    },
  };
}

export default async function SellCondoDistrictPage({ params }: Props) {
  const { district: slug } = await params;
  const districts = SG_DISTRICTS;
  const d = districts.find((x) => x.slug === slug);
  if (!d) notFound();

  const shortName = d.name.split(",")[0];
  const dnum = districtNum(d.code);
  const label = `${shortName} (${d.code})`;

  const [stats, agentsRes] = await Promise.all([
    privateAreaStats(dnum),
    supabase
      .from("sg_area_top_agents")
      .select("agent_id, agent_name, agent_slug, agency_name, score, area_txns, area_property_types")
      .eq("area_type", "district")
      .eq("area_name", d.code)
      .order("rank", { ascending: true })
      .limit(6),
  ]);

  const narrative = buildNarrative(shortName, "private homes", stats);
  const topAgents = (agentsRes.data ?? []).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How much is a condo in ${shortName} worth?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: stats.median
            ? `Recent URA private transactions in ${d.code} (${shortName}) centre on a median around ${fmtSgd(stats.median)}, across ${stats.count12mo} sales.`
            : `Recent private transaction volume in ${shortName} is limited; compare the area's ranked agents for a current estimate.`,
        },
      },
      {
        "@type": "Question",
        name: `Who are the best agents to sell a condo in ${shortName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `FairComparisons ranks CEA-licensed agents on their actual transaction record in ${d.code}. The top performers are shown here; compare them and contact the ones you choose.`,
        },
      },
      {
        "@type": "Question",
        name: `What does it cost to use FairComparisons?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Always free for sellers. FairComparisons is paid by agent subscriptions for tools, not by sales, so its rankings are never for sale.`,
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
            Sell your condo · {label}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-white md:text-4xl">
            Sell your private property in {shortName} with the agents who close
            here
          </h1>
          {stats.median && (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
              <span className="rounded-full border border-white/15 px-3 py-1 text-white/70">
                Median {fmtSgd(stats.median)}
              </span>
              <span className="rounded-full border border-white/15 px-3 py-1 text-white/70">
                {stats.count12mo} recent sales
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
          <div className="space-y-4 text-[15px] leading-relaxed text-gray-700">
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
              Top agents in {label}
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
                      {a.area_txns} deals in {d.code}
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
              Recent private sales in {label}
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
            Compare the ranked agents for {shortName}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We&apos;ve pre-filled your district. Tell us a little more and see
            your ranked agents, then contact the ones you choose.
          </p>
          <div className="mt-6">
            <SellForm
              hdbTowns={[]}
              districts={districts.map((x) => ({ code: x.code, name: x.name }))}
              initialPropertyType="CONDO"
              initialDistrictCode={d.code}
            />
          </div>
        </div>
      </section>
    </>
  );
}
