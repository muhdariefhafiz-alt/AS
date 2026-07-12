import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { titleName, cleanAgency } from "../../lib/names";
import BookingForm from "./BookingForm";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Book a viewing", robots: { index: false, follow: false } };

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default async function BookPage({ params }: { params: Promise<{ agentSlug: string }> }) {
  const { agentSlug } = await params;
  const { data: agent } = await supabase
    .from("sg_agents")
    .select("name, agency_name, slug, cea_registration, score, photo_url, photo_status")
    .eq("slug", agentSlug)
    .maybeSingle();
  if (!agent) notFound();

  const name = titleName(agent.name);
  const agency = cleanAgency(agent.agency_name);
  const score = agent.score != null ? Math.round(Number(agent.score)) : null;
  const showPhoto = agent.photo_url && agent.photo_status === "approved";

  return (
    <div style={{ background: "var(--paper, #f7f8fb)", minHeight: "100vh" }}>
      <div className="fc-wrap" style={{ maxWidth: 640, padding: "36px 24px 64px" }}>
        <div className="fc-card fc-card--pad" style={{ background: "#fff" }}>
          <div className="fc-row" style={{ gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            {showPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agent.photo_url as string} alt={name} width={60} height={60} style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--blue-wash, #eef2ff)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 22, flexShrink: 0 }}>
                {initials(name)}
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="serif" style={{ fontSize: 19, fontWeight: 600, color: "var(--ink)" }}>{name}</div>
              <div className="muted small" style={{ marginTop: 1 }}>{agency} · CEA {agent.cea_registration}</div>
            </div>
            {score != null && (
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: "var(--blue-deep)" }}>{score}</div>
                <div className="mono" style={{ fontSize: 9, color: "var(--slate)", letterSpacing: "0.05em" }}>AGENTSCORE</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 24, marginBottom: 14 }}>
          <p className="kicker" style={{ color: "var(--blue-deep)" }}>Book a viewing</p>
          <h1 className="serif" style={{ fontSize: "clamp(24px,4vw,32px)", fontWeight: 600, margin: "6px 0 0", color: "var(--ink)" }}>
            Arrange a viewing with {name}
          </h1>
          <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>
            Pick a property, a date and a time. {name} will confirm the final details with you.
          </p>
        </div>

        <BookingForm agentSlug={agent.slug as string} agentName={name} />
      </div>
    </div>
  );
}
