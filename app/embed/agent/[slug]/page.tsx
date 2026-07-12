import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { titleName, cleanAgency } from "../../../lib/names";

export const revalidate = 86400;
export const metadata: Metadata = { title: "Agent widget", robots: { index: false, follow: false } };

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// Chrome-free, iframe-embeddable lead-generation widget an agent puts on their
// own website. Shows their independent AgentScore and a "free valuation" CTA
// that routes the visitor into /sell?agent=<slug> (the agent is pinned, so they
// receive the lead). Every embed also carries a Powered-by backlink.
export default async function AgentWidget({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: agent } = await supabase
    .from("sg_agents")
    .select("name, agency_name, slug, cea_registration, score, photo_url, photo_status, primary_area")
    .eq("slug", slug)
    .maybeSingle();
  if (!agent) notFound();

  const name = titleName(agent.name);
  const agency = cleanAgency(agent.agency_name);
  const score = agent.score != null ? Math.round(Number(agent.score)) : null;
  const showPhoto = agent.photo_url && agent.photo_status === "approved";

  return (
    <div style={{ background: "transparent", padding: 12 }}>
      <div className="fc-card fc-card--pad" style={{ background: "#fff", maxWidth: 380, margin: "0 auto" }}>
        <div className="fc-row" style={{ gap: 14, alignItems: "center" }}>
          {showPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={agent.photo_url as string} alt={name} width={56} height={56}
              style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--blue-wash, #eef2ff)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20, flexShrink: 0 }}>
              {initials(name)}
            </div>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="serif" style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>{name}</div>
            <div className="muted small" style={{ marginTop: 1 }}>{agency}</div>
          </div>
          {score != null && (
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: "var(--blue-deep)" }}>{score}</div>
              <div className="mono" style={{ fontSize: 9, color: "var(--slate)", letterSpacing: "0.05em" }}>AGENTSCORE</div>
            </div>
          )}
        </div>

        <p className="muted small" style={{ margin: "14px 0 0", lineHeight: 1.5 }}>
          Independently scored on real CEA, URA and HDB transaction records{agent.primary_area ? `, active in ${cleanAgency(String(agent.primary_area))}` : ""}.
        </p>

        <Link href={`/sell?agent=${agent.slug}&utm_source=agent_widget`} target="_blank" rel="noopener"
          className="fc-btn fc-btn--primary fc-btn--block" style={{ marginTop: 14 }}>
          Get a free valuation
        </Link>

        <div style={{ marginTop: 10, textAlign: "center" }}>
          <Link href={`https://fair-comparisons.com/property-agents/agent/${agent.slug}?utm_source=agent_widget`} target="_blank" rel="noopener"
            className="mono" style={{ fontSize: 10.5, color: "var(--slate)", textDecoration: "none" }}>
            Verified by FairComparisons
          </Link>
        </div>
      </div>
    </div>
  );
}
