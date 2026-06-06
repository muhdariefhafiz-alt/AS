import Link from "next/link";
import { supabaseAdmin } from "../lib/supabase";
import { titleName, cleanAgency } from "../lib/names";

// Tier-3 spoke-to-spoke internal linking. Each agent profile links OUT to the
// other top agents in its strongest area, so deep profile pages pass crawl
// equity to their siblings (instead of being link sinks) and every page gains
// a contextually-unique block. This is the highest-leverage on-page indexation
// signal for a large programmatic profile set, and drives orphan risk to ~zero.
type Peer = {
  agent_id: number;
  agent_slug: string | null;
  agent_name: string;
  agency_name: string | null;
  score: number | null;
  area_txns: number | null;
};

export default async function RelatedAgents({ agentId }: { agentId: number }) {
  const sb = supabaseAdmin();

  // The agent's strongest area (most recorded deals).
  const { data: mine } = await sb
    .from("sg_area_top_agents")
    .select("area_type, area_name")
    .eq("agent_id", agentId)
    .order("area_txns", { ascending: false })
    .limit(1);
  const area = mine?.[0];
  if (!area?.area_name) return null;

  // Other top agents in that same area, ranked.
  const { data: peers } = await sb
    .from("sg_area_top_agents")
    .select("agent_id, agent_slug, agent_name, agency_name, score, area_txns")
    .eq("area_type", area.area_type)
    .eq("area_name", area.area_name)
    .neq("agent_id", agentId)
    .order("rank", { ascending: true })
    .limit(6);

  const list = ((peers ?? []) as Peer[]).filter((p) => p.agent_slug);
  if (list.length === 0) return null;

  const areaLabel = titleName(area.area_name.split("/")[0].split(",")[0].trim());

  return (
    <section style={{ marginTop: 40, borderTop: "1px solid var(--line)", paddingTop: 28 }}>
      <h2 style={{ fontSize: "clamp(20px,2.4vw,26px)" }}>Other top agents in {areaLabel}</h2>
      <p className="muted small" style={{ margin: "6px 0 18px", maxWidth: "62ch" }}>
        Ranked by recorded CEA transactions in {areaLabel}. Compare their track record before you decide who to invite.
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
