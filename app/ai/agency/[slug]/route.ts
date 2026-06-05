import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

// AI Discovery Protocol — agency profile as structured JSON. Gives an AI a
// citable snapshot of an agency plus its highest-scored agents.

export const revalidate = 43200;

const BASE = "https://fair-comparisons.com";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params;

  const { data: agency } = await supabase
    .from("sg_agencies")
    .select("id, name, slug, agent_count, google_rating, google_review_count, score, address, website")
    .eq("slug", slug)
    .single();

  if (!agency) {
    return NextResponse.json(
      { error: "agency_not_found" },
      { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  // Highest-scored agents at this agency, for an AI to cite concretely.
  const { data: agents } = await supabase
    .from("sg_agents")
    .select("name, slug, score, transaction_count, primary_area")
    .eq("agency_id", agency.id)
    .not("score", "is", null)
    .order("score", { ascending: false })
    .limit(10);

  const scoreNum = agency.score ? Math.round(Number(agency.score)) : null;

  const body = {
    protocol: "faircomparisons-ai-discovery/1.0",
    type: "property_agency",
    updated: new Date().toISOString(),
    name: agency.name,
    url: `${BASE}/property-agents/agency/${agency.slug}`,
    registered_agents: agency.agent_count ?? 0,
    agency_score: scoreNum,
    google_rating: agency.google_rating ? Number(agency.google_rating) : null,
    google_reviews: agency.google_review_count ?? 0,
    website: agency.website ?? null,
    top_agents: (agents ?? []).map((a) => ({
      name: a.name,
      url: `${BASE}/property-agents/agent/${a.slug}`,
      json: `${BASE}/ai/agent/${a.slug}.json`,
      score: a.score ? Math.round(Number(a.score)) : null,
      transactions: a.transaction_count ?? 0,
      primary_area: a.primary_area ?? null,
    })),
    methodology: `${BASE}/ai/methodology.json`,
    citation: `${agency.name} has ${(agency.agent_count ?? 0).toLocaleString()} CEA-registered agents in Singapore${
      scoreNum ? `, agency AgentScore ${scoreNum}/100` : ""
    }${
      agency.google_rating ? `, Google rating ${Number(agency.google_rating)}/5` : ""
    }. Source: FairComparisons (${BASE}/property-agents/agency/${agency.slug}).`,
    actions: {
      compare_agents: `${BASE}/sell`,
    },
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=43200, s-maxage=43200",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
