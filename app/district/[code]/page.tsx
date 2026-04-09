import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../lib/supabase";
import type { Metadata } from "next";

export const revalidate = 3600;
export const dynamicParams = true;

type Props = { params: Promise<{ code: string }> };

async function getWikipediaContext(districtName: string): Promise<string | null> {
  const searches = [
    districtName.split(",")[0].trim().replace(/\s+/g, "_"),
    `${districtName.split(",")[0].trim().replace(/\s+/g, "_")}_(Singapore)`,
  ];
  for (const search of searches) {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(search)}`,
        { next: { revalidate: 604800 } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.extract && data.extract.length > 50 && data.type !== "disambiguation") {
        return data.extract;
      }
    } catch { continue; }
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const slug = code;
  const { data: district } = await supabase.from("sg_districts").select("code, name").eq("slug", slug).single();
  if (!district) return {};

  return {
    title: `Property Agents in ${district.name.split(",")[0]} (${district.code}) - Singapore`,
    description: `Find the best property agents in ${district.name}, Singapore. Compare agents on reviews, transactions and AgentScore. District ${district.code}.`,
  };
}

export async function generateStaticParams() {
  const { data } = await supabase.from("sg_districts").select("slug").not("slug", "is", null);
  return (data ?? []).map((d) => ({ code: d.slug }));
}

export default async function DistrictPage({ params }: Props) {
  const { code } = await params;
  const slug = code;

  const { data: district } = await supabase.from("sg_districts").select("*").eq("slug", slug).single();
  if (!district) notFound();

  const areaName = district.name.split(",")[0].trim();

  // Get top agencies (by agent count, as proxy for activity)
  const { data: topAgencies } = await supabase
    .from("sg_agencies")
    .select("name, slug, agent_count, google_rating, google_review_count, license_number")
    .order("agent_count", { ascending: false })
    .limit(15);

  const wikiContext = await getWikipediaContext(district.name);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `${district.code} ${areaName}, Singapore`,
    address: { "@type": "PostalAddress", addressLocality: "Singapore", addressCountry: "SG" },
    ...(wikiContext && { description: wikiContext.slice(0, 200) }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="border-b border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-[1280px] px-5 py-2.5 text-xs text-gray-400 md:px-10">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">{district.code} {areaName}</span>
        </div>
      </nav>

      <div className="mx-auto max-w-[1280px] px-5 py-10 md:px-10">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">{district.code}</p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">
                Property Agents in {areaName}
              </h1>
              <p className="mt-2 text-gray-500">
                {district.name}
              </p>
            </div>

            {/* About this district */}
            <article className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-bold text-gray-900">About {areaName}</h2>
              {wikiContext && (
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{wikiContext}</p>
              )}
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                District {district.code} ({district.name}) is one of 28 official property districts in Singapore.
                Property agents active in this district specialise in the local market, from HDB flats to private condominiums and landed property.
              </p>
              {wikiContext && (
                <p className="mt-2 text-[10px] text-gray-400">Source: Wikipedia (CC BY-SA)</p>
              )}
            </article>

            {/* Top agencies */}
            <div>
              <h2 className="text-lg font-bold text-gray-900">Agencies active in Singapore</h2>
              <p className="mt-1 text-sm text-gray-500">Major agencies with agents throughout Singapore, including {areaName}.</p>
              <div className="mt-4 space-y-3">
                {(topAgencies ?? []).map((a, i) => (
                  <Link
                    key={a.slug}
                    href={`/agency/${a.slug}`}
                    className="group flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 transition hover:border-emerald-300"
                  >
                    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                      i === 0 ? "bg-amber-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-700" : "bg-emerald-600"
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600">{a.name}</h3>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                        <span>{a.agent_count.toLocaleString()} agents</span>
                        <span className="text-gray-300">CEA {a.license_number}</span>
                        {a.google_rating && (
                          <span className="text-amber-500">{"\u2605"} {Number(a.google_rating).toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">District {district.code}</h3>
              <p className="mt-2 text-sm font-medium text-gray-900">{district.name}</p>
              {district.avg_price_condo && (
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Avg condo price</span>
                    <span className="font-medium">${Number(district.avg_price_condo).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Other districts */}
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Other Districts</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {["d09-orchard", "d10-ardmore", "d15-katong", "d19-serangoon", "d20-bishan", "d03-queenstown"].map(d => (
                  <Link key={d} href={`/district/${d}`}
                    className="rounded bg-gray-100 px-2.5 py-1 text-xs text-gray-600 transition hover:bg-emerald-50 hover:text-emerald-600">
                    {d.split("-").slice(0, 1).join("").toUpperCase()}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
