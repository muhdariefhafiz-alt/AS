import Link from "next/link";
import { supabaseAdmin } from "../lib/supabase";
import { titleName, cleanAgency } from "../lib/names";

// Tier-3 spoke-to-spoke internal linking. Each agent profile links OUT to
// sibling agents so deep profile pages pass crawl equity to their neighbours
// (instead of being link sinks) and every page gains a contextually-unique
// block. Highest-leverage on-page indexation signal for a large programmatic
// profile set.
//
// Source chain, so NO agent page is ever an orphan dead-end:
//   1. Ranked peers in the agent's strongest area (sg_area_top_agents) - best.
//   2. Fallback: agents in the same primary_area (sg_agents) - covers the long
//      tail not present in the ranked table (the old code returned null here).
//   3. Fallback: agents at the same agency (sg_agents).
// Only returns null if the agent genuinely has no area and no agency.
type Peer = {
  agent_id: number;
  agent_slug: string | null;
  agent_name: string;
  agency_name: string | null;
  score: number | null;
  area_txns: number | null;
};

const shortArea = (s: string) => titleName(s.split("/")[0].split(",")[0].trim());

const toPeers = (
  rows: { id: number; slug: string | null; name: string; agency_name: string | null; score: number | null }[]
): Peer[] =>
  rows
    .filter((a) => a.slug)
    .map((a) => ({
      agent_id: a.id,
      agent_slug: a.slug,
      agent_name: a.name,
      agency_name: a.agency_name,
      score: a.score,
      area_txns: null,
    }));

export default async function RelatedAgents({
  agentId,
  primaryArea,
  agencyId,
  agencyName,
}: {
  agentId: number;
  primaryArea?: string | null;
  agencyId?: number | null;
  agencyName?: string | null;
}) {
  const sb = supabaseAdmin();

  let list: Peer[] = [];
  let heading = "";
  let subtitle = "";

  // 1. Ranked peers in the agent's strongest area.
  const { data: mine } = await sb
    .from("sg_area_top_agents")
    .select("area_type, area_name")
    .eq("agent_id", agentId)
    .order("area_txns", { ascending: false })
    .limit(1);
  const area = mine?.[0];
  if (area?.area_name) {
    const { data: peers } = await sb
      .from("sg_area_top_agents")
      .select("agent_id, agent_slug, agent_name, agency_name, score, area_txns")
      .eq("area_type", area.area_type)
      .eq("area_name", area.area_name)
      .neq("agent_id", agentId)
      .order("rank", { ascending: true })
      .limit(6);
    list = ((peers ?? []) as Peer[]).filter((p) => p.agent_slug);
    if (list.length) {
      const label = shortArea(area.area_name);
      heading = `Other top agents in ${label}`;
      subtitle = `Ranked by recorded CEA transactions in ${label}. Compare their track record before you decide who to invite.`;
    }
  }

  // 2. Fallback: same primary area (the long tail not in the ranked table).
  if (list.length === 0 && primaryArea) {
    const { data } = await sb
      .from("sg_agents")
      .select("id, slug, name, agency_name, score")
      .eq("primary_area", primaryArea)
      .neq("id", agentId)
      .not("slug", "is", null)
      .not("score", "is", null)
      .order("score", { ascending: false, nullsFirst: false })
      .limit(6);
    list = toPeers(data ?? []);
    if (list.length) {
      const label = shortArea(primaryArea);
      heading = `Other agents active in ${label}`;
      subtitle = `Scored on their CEA transaction record in ${label}. Compare before you decide who to invite.`;
    }
  }

  // 3. Fallback: same agency.
  if (list.length === 0 && agencyId) {
    const { data } = await sb
      .from("sg_agents")
      .select("id, slug, name, agency_name, score")
      .eq("agency_id", agencyId)
      .neq("id", agentId)
      .not("slug", "is", null)
      .not("score", "is", null)
      .order("score", { ascending: false, nullsFirst: false })
      .limit(6);
    list = toPeers(data ?? []);
    if (list.length) {
      const label = cleanAgency(agencyName ?? "") || "the same agency";
      heading = `Other agents at ${label}`;
      subtitle = `Colleagues at ${label}, scored on their CEA transaction record. Compare before you decide.`;
    }
  }

  if (list.length === 0) return null;

  const areaLabel = area?.area_name ? shortArea(area.area_name) : primaryArea ? shortArea(primaryArea) : "";

  return (
    <section style={{ marginTop: 40, borderTop: "1px solid var(--line)", paddingTop: 28 }}>
      <h2 style={{ fontSize: "clamp(20px,2.4vw,26px)" }}>{heading}</h2>
      <p className="muted small" style={{ margin: "6px 0 18px", maxWidth: "62ch" }}>
        {subtitle}
      </p>
      <div className="fc-grid-2" style={{ gap: 12 }}>
        {list.map((p) => (
          <Link
            key={p.agent_id}
            href={`/property-agents/agent/${p.agent_slug}`}
            className="fc-card fc-card--pad"
            style={{ display: "block" }}
          >
            <div style={{ fontWeight: 700, fontSize: 15 }}>{titleName(p.agent_name)}</div>
            <div className="muted small" style={{ marginTop: 2 }}>
              {cleanAgency(p.agency_name ?? "")}
              {p.score ? ` · ${Math.round(Number(p.score))} AgentScore` : ""}
              {p.area_txns ? ` · ${p.area_txns} deals in ${areaLabel}` : ""}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
