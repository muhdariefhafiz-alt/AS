import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../lib/supabase";
import type { Metadata } from "next";

export const revalidate = 3600;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: agent } = await supabase
    .from("sg_agents")
    .select("name, agency_name, cea_registration, google_rating, google_review_count")
    .eq("slug", slug)
    .single();

  if (!agent) return {};

  // Noindex agents without reviews (thin content)
  const isThin = !agent.google_rating || (agent.google_review_count || 0) < 1;

  return {
    title: `${agent.name} - Property Agent at ${agent.agency_name}`,
    description: `${agent.name} (CEA ${agent.cea_registration}) is a property agent at ${agent.agency_name} in Singapore.${agent.google_rating ? ` Rated ${agent.google_rating}/5.` : ""} View profile on AgentScan.`,
    ...(isThin && { robots: { index: false, follow: true } }),
  };
}

export async function generateStaticParams() {
  // Pre-render top agents by agency size
  const { data } = await supabase
    .from("sg_agents")
    .select("slug")
    .not("google_rating", "is", null)
    .order("google_review_count", { ascending: false })
    .limit(200);
  return (data ?? []).map((a) => ({ slug: a.slug }));
}

export default async function AgentPage({ params }: Props) {
  const { slug } = await params;

  const { data: agent } = await supabase
    .from("sg_agents")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!agent) notFound();

  // Get agency
  const { data: agency } = agent.agency_id
    ? await supabase.from("sg_agencies").select("name, slug, agent_count, google_rating").eq("id", agent.agency_id).single()
    : { data: null };

  // Get colleagues (same agency, limit 10)
  const { data: colleagues } = agent.agency_id
    ? await supabase
        .from("sg_agents")
        .select("name, slug, cea_registration")
        .eq("agency_id", agent.agency_id)
        .neq("slug", slug)
        .limit(10)
    : { data: [] };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: agent.name,
    ...(agency && {
      worksFor: {
        "@type": "RealEstateAgent",
        name: agency.name,
      },
    }),
    address: { "@type": "PostalAddress", addressLocality: "Singapore", addressCountry: "SG" },
    ...(agent.google_rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: agent.google_rating,
        reviewCount: agent.google_review_count,
      },
    }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="border-b border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-[1280px] px-5 py-2.5 text-xs text-gray-400 md:px-10">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/agencies" className="hover:text-gray-600">Agencies</Link>
          {agency && (
            <>
              <span className="mx-1.5">/</span>
              <Link href={`/agency/${agency.slug}`} className="hover:text-gray-600">{agency.name}</Link>
            </>
          )}
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">{agent.name}</span>
        </div>
      </nav>

      <div className="mx-auto max-w-[1280px] px-5 py-10 md:px-10">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">
                  {agent.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    CEA Registration: {agent.cea_registration}
                  </p>
                  {agency && (
                    <p className="mt-1 text-sm text-gray-500">
                      Agent at{" "}
                      <Link href={`/agency/${agency.slug}`} className="text-emerald-600 hover:underline">
                        {agency.name}
                      </Link>
                    </p>
                  )}
                </div>
              </div>

              {agent.google_rating && (
                <div className="mt-4 flex items-center gap-3 rounded-lg bg-amber-50 p-3">
                  <span className="text-2xl font-bold text-amber-600">{Number(agent.google_rating).toFixed(1)}</span>
                  <div>
                    <span className="text-amber-400">
                      {"\u2605".repeat(Math.round(Number(agent.google_rating)))}
                      {"\u2606".repeat(5 - Math.round(Number(agent.google_rating)))}
                    </span>
                    <div className="text-xs text-amber-600/70">{agent.google_review_count} Google reviews</div>
                  </div>
                </div>
              )}
            </div>

            {/* Assessment */}
            <article className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-bold text-gray-900">{agent.name} - agent profile</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {agent.name} (CEA {agent.cea_registration}) is a registered property agent
                in Singapore{agency ? `, working at ${agency.name}` : ""}.
                {agent.google_rating && ` Clients rate this agent ${Number(agent.google_rating).toFixed(1)}/5 based on ${agent.google_review_count} Google reviews.`}
                {agency && agency.agent_count > 1 && ` ${agency.name} has ${agency.agent_count.toLocaleString()} registered agents in total.`}
              </p>
              <p className="mt-3 text-[10px] text-gray-400">
                CEA registration verifiable at{" "}
                <a href="https://www.cea.gov.sg/aceas/public-register" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                  cea.gov.sg
                </a>.
              </p>
            </article>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Agent Details</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">CEA Reg</dt>
                  <dd className="font-medium text-gray-900">{agent.cea_registration}</dd>
                </div>
                {agency && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Agency</dt>
                    <dd><Link href={`/agency/${agency.slug}`} className="font-medium text-emerald-600">{agency.name}</Link></dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Colleagues */}
            {(colleagues ?? []).length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Colleagues at {agency?.name}
                </h3>
                <div className="mt-3 space-y-2">
                  {(colleagues ?? []).map((c) => (
                    <Link key={c.slug} href={`/agent/${c.slug}`}
                      className="group flex items-center gap-2 rounded bg-gray-50 p-2 transition hover:bg-emerald-50">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                        {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="text-sm text-gray-900 group-hover:text-emerald-600">{c.name}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
