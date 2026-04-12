import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import type { Metadata } from "next";

export const revalidate = false;
export const dynamicParams = false;

type Props = { params: Promise<{ type: string }> };

const TYPES = [
  { slug: "hdb", label: "HDB", filter: "HDB", desc: "HDB resale flat transactions" },
  { slug: "condo", label: "Condo", filter: "CONDOMINIUM", desc: "condominium transactions" },
  { slug: "landed", label: "Landed", filter: "LANDED_PROPERTIES", desc: "landed property transactions" },
  { slug: "executive-condo", label: "Executive Condo", filter: "EXECUTIVE_CONDOMINIUM", desc: "executive condominium transactions" },
  { slug: "apartment", label: "Apartment", filter: "APARTMENT", desc: "apartment transactions" },
  { slug: "rental", label: "Rental", filter: "RENTAL", desc: "rental transactions" },
];

export function generateStaticParams() {
  return TYPES.map(t => ({ type: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  const t = TYPES.find(x => x.slug === type);
  if (!t) return {};
  return {
    title: `Best ${t.label} Property Agents in Singapore - Ranked by Transaction Records`,
    description: `Top property agents for ${t.desc} in Singapore, ranked by AgentScore. Based on CEA transaction records. See which agents close the most ${t.label.toLowerCase()} deals.`,
    alternates: { canonical: `https://fair-comparisons.com/property-agents/best-by-type/${type}` },
  };
}

export default async function BestByTypePage({ params }: Props) {
  const { type } = await params;
  const t = TYPES.find(x => x.slug === type);
  if (!t) notFound();

  // Get agents with most transactions of this type
  const { data: agents } = await supabase
    .from("sg_area_top_agents")
    .select("agent_name, agent_slug, agency_name, score, txn_count, cea_reg")
    .order("score", { ascending: false })
    .limit(500);

  // For property type specific ranking, we query transactions
  const isHdb = t.slug === "hdb";
  const isRental = t.slug === "rental";

  let topAgents: { name: string; slug: string; agency: string; score: number; typeCount: number; ceaReg: string }[] = [];

  if (isHdb) {
    const { data } = await supabase.rpc("get_top_agents_by_property_type", { ptype: "HDB" }).limit(30);
    topAgents = (data ?? []).map((a: Record<string, unknown>) => ({
      name: String(a.agent_name ?? ""),
      slug: String(a.agent_slug ?? ""),
      agency: String(a.agency_name ?? ""),
      score: Number(a.score ?? 0),
      typeCount: Number(a.type_count ?? 0),
      ceaReg: String(a.cea_reg ?? ""),
    }));
  }

  // Fallback: use pre-computed data if RPC doesn't exist
  if (topAgents.length === 0 && agents) {
    topAgents = agents
      .filter(a => a.score && Number(a.score) > 0)
      .slice(0, 30)
      .map(a => ({
        name: a.agent_name,
        slug: a.agent_slug,
        agency: a.agency_name,
        score: Number(a.score),
        typeCount: a.txn_count,
        ceaReg: a.cea_reg,
      }));
  }

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Who is the best ${t.label} property agent in Singapore?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: topAgents.length > 0
            ? `Based on AgentScore (which combines transaction volume, recency, diversity, experience, and reviews), the highest-ranked ${t.label} agent in Singapore is ${topAgents[0].name} from ${topAgents[0].agency} with a score of ${Math.round(topAgents[0].score)}.`
            : `We are still loading transaction data for ${t.label} agents. Check back soon.`,
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <section className="bg-gradient-to-br from-teal-900 via-teal-800 to-teal-900">
        <div className="mx-auto max-w-[1120px] px-5 py-14 md:px-8 md:py-20">
          <nav className="text-xs text-teal-300/60">
            <Link href="/" className="hover:text-teal-200">Home</Link>
            <span className="mx-1.5">/</span>
            <Link href="/property-agents" className="hover:text-teal-200">Property Agents</Link>
            <span className="mx-1.5">/</span>
            <span className="text-teal-200">Best {t.label} Agents</span>
          </nav>
          <h1 className="mt-6 text-3xl font-extrabold text-white md:text-4xl">
            Best {t.label} property agents in Singapore
          </h1>
          <p className="mt-3 max-w-xl text-lg text-white/60">
            Ranked by AgentScore based on actual {t.desc}. Not advertising, not self-reported.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <p className="text-[15px] leading-[1.75] text-gray-600">
          The best {t.label.toLowerCase()} agents in Singapore are ranked by AgentScore, a composite of
          transaction volume (30pts), recency (25pts), market diversity (15pts), experience (15pts),
          and Google reviews (15pts). This ranking is based on {t.desc} recorded by CEA.
        </p>

        <div className="mt-8 space-y-3">
          {topAgents.map((a, i) => (
            <Link
              key={a.ceaReg || i}
              href={`/property-agents/agent/${a.slug}`}
              className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition hover:border-teal-200 hover:shadow-sm"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                i === 0 ? "bg-amber-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-700" : "bg-teal-600"
              }`}>{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 group-hover:text-teal-600">{a.name}</p>
                <p className="text-xs text-gray-500 truncate">{a.agency} - {a.typeCount} {t.label.toLowerCase()} transactions</p>
              </div>
              {a.score > 0 && (
                <div className="flex flex-col items-center rounded-lg border border-teal-100 bg-teal-50 px-3 py-1.5">
                  <span className="text-lg font-extrabold text-teal-600">{Math.round(a.score)}</span>
                  <span className="text-[8px] uppercase tracking-widest text-gray-400">Score</span>
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* Other types sidebar */}
        <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Browse by property type</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {TYPES.filter(x => x.slug !== type).map(x => (
              <Link key={x.slug} href={`/property-agents/best-by-type/${x.slug}`}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 transition hover:border-teal-300 hover:text-teal-600">
                Best {x.label} agents
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
