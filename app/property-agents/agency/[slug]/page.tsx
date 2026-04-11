import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import type { Metadata } from "next";

export const revalidate = false;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data: agency } = await supabase
    .from("sg_agencies")
    .select("name, agent_count, google_rating, google_review_count, score")
    .eq("slug", slug)
    .single();

  if (!agency) return {};

  const scoreText = agency.score ? `AgentScore: ${Math.round(Number(agency.score))}/100. ` : "";
  const ratingText = agency.google_rating ? `${agency.google_rating}/5 (${agency.google_review_count} reviews). ` : "";

  const isThin = agency.agent_count < 50 && !agency.google_rating && !agency.score;

  return {
    title: `${agency.name} - Property Agency in Singapore`,
    description: `${agency.name} has ${agency.agent_count.toLocaleString()} registered agents in Singapore. ${scoreText}${ratingText}Compare with other agencies on FairComparisons.`,
    alternates: { canonical: `https://fair-comparisons.com/property-agents/agency/${slug}` },
    ...(isThin && { robots: { index: false, follow: true } }),
  };
}

export async function generateStaticParams() {
  // Pre-render all agencies (dynamicParams = false).
  const all: { slug: string }[] = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("sg_agencies")
      .select("slug")
      .order("agent_count", { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all.map((a) => ({ slug: a.slug }));
}

export default async function AgencyPage({ params }: Props) {
  const { slug } = await params;

  const { data: agency } = await supabase
    .from("sg_agencies")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!agency) notFound();

  // Get agents for this agency
  const { data: agents } = await supabase
    .from("sg_agents")
    .select("name, slug, cea_registration, google_rating, google_review_count")
    .eq("agency_id", agency.id)
    .order("name")
    .limit(50);

  const agentList = agents ?? [];

  // Total agents in SG for context
  const { count: totalAgencies } = await supabase
    .from("sg_agencies")
    .select("id", { count: "exact", head: true });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: agency.name,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Singapore",
      addressCountry: "SG",
      ...(agency.address && { streetAddress: agency.address }),
      ...(agency.postal_code && { postalCode: agency.postal_code }),
    },
    ...(agency.phone && { telephone: agency.phone }),
    ...(agency.website && { url: agency.website }),
    ...(agency.google_rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: agency.google_rating,
        reviewCount: agency.google_review_count,
      },
    }),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: "Property Agents", item: "https://fair-comparisons.com/property-agents" },
      { "@type": "ListItem", position: 3, name: agency.name },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <nav className="border-b border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-[1280px] px-5 py-2.5 text-xs text-gray-400 md:px-10">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/property-agents" className="hover:text-gray-600">Agencies</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">{agency.name}</span>
        </div>
      </nav>

      <div className="mx-auto max-w-[1280px] px-5 py-10 md:px-10">
        <div className="grid gap-10 lg:grid-cols-3">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{agency.name}</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    CEA License: {agency.license_number}
                  </p>
                </div>
                {agency.score && (
                  <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-center">
                    <div className="text-xl font-bold text-teal-700">{Math.round(Number(agency.score))}</div>
                    <div className="text-[8px] uppercase text-teal-600">Score</div>
                  </div>
                )}
              </div>

              {agency.google_rating && (
                <div className="mt-4 flex items-center gap-3 rounded-lg bg-amber-50 p-3">
                  <span className="text-2xl font-bold text-amber-600">{Number(agency.google_rating).toFixed(1)}</span>
                  <div>
                    <span className="text-amber-400">
                      {"\u2605".repeat(Math.round(Number(agency.google_rating)))}
                      {"\u2606".repeat(5 - Math.round(Number(agency.google_rating)))}
                    </span>
                    <div className="text-xs text-amber-600/70">{agency.google_review_count} Google reviews</div>
                  </div>
                </div>
              )}
            </div>

            {/* Assessment - AI citable */}
            <article className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-bold text-gray-900">{agency.name} - overview and data</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {agency.name} (CEA {agency.license_number}) is a property agency in Singapore
                with {agency.agent_count.toLocaleString()} registered agents.
                {agency.google_rating && ` Clients rate this agency ${Number(agency.google_rating).toFixed(1)}/5 based on ${agency.google_review_count} Google reviews.`}
                {agency.agent_count > 1000
                  ? ` It is one of the largest agencies in Singapore by number of agents.`
                  : agency.agent_count > 100
                    ? ` It is a mid-sized agency in the Singapore market.`
                    : ` It is a boutique agency in the Singapore market.`
                }
              </p>
              {totalAgencies && (
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  There are {totalAgencies.toLocaleString()} CEA-licensed agencies in Singapore.
                </p>
              )}
            </article>

            {/* Agents */}
            {agentList.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Agents ({agency.agent_count.toLocaleString()})
                </h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {agentList.map((agent) => (
                    <Link
                      key={agent.slug}
                      href={`/property-agents/agent/${agent.slug}`}
                      className="group flex items-center gap-3 rounded-lg bg-gray-50 p-3 transition hover:bg-teal-50"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                        {agent.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 group-hover:text-teal-600">{agent.name}</div>
                        <div className="text-[10px] text-gray-400">{agent.cea_registration}</div>
                      </div>
                    </Link>
                  ))}
                </div>
                {agency.agent_count > 50 && (
                  <p className="mt-3 text-xs text-gray-400">
                    Showing 50 of {agency.agent_count.toLocaleString()} agents.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Agency Details</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">CEA License</dt>
                  <dd className="font-medium text-gray-900">{agency.license_number}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Agents</dt>
                  <dd className="font-medium text-gray-900">{agency.agent_count.toLocaleString()}</dd>
                </div>
                {agency.phone && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Phone</dt>
                    <dd><a href={`tel:${agency.phone}`} className="font-medium text-teal-600">{agency.phone}</a></dd>
                  </div>
                )}
                {agency.website && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Website</dt>
                    <dd><a href={agency.website} target="_blank" rel="noopener noreferrer" className="font-medium text-teal-600 truncate block max-w-[150px]">{agency.website.replace(/^https?:\/\/(www\.)?/, "")}</a></dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="rounded-lg border border-teal-200 bg-teal-50 p-5">
              <h3 className="text-sm font-bold text-gray-900">Looking for an agent at {agency.name}?</h3>
              <p className="mt-1 text-xs text-gray-600">
                Browse {agency.agent_count.toLocaleString()} registered agents.
                Compare on reviews, experience, and district expertise.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
