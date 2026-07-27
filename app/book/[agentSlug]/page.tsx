import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { titleName, cleanAgency } from "../../lib/names";
import { CalendarLine } from "../../components/LineArt";
import FunnelTracker from "../../components/FunnelTracker";
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
    .select("id, name, agency_name, slug, cea_registration, score, photo_url, photo_status, claimed")
    .eq("slug", agentSlug)
    .maybeSingle();
  if (!agent) notFound();
  const isClaimed = Boolean(agent.claimed);

  const name = titleName(agent.name);
  const agency = cleanAgency(agent.agency_name);
  const score = agent.score != null ? Math.round(Number(agent.score)) : null;
  const showPhoto = agent.photo_url && agent.photo_status === "approved";

  return (
    <div style={{ background: "var(--paper, #f7f8fb)", minHeight: "100vh" }}>
      <FunnelTracker event="booking_view" agentId={Number(agent.id)} agentSlug={agent.slug as string} pagePath={`/book/${agent.slug}`} metadata={{ claimed: isClaimed }} />
      <div className="fc-wrap" style={{ maxWidth: 640, padding: "36px 24px 64px" }}>
        {/* The agent's shared link: their identity card gets the scene-world
            framing so the page feels prepared for them, not generic. */}
        <div className="fc-scene fc-scene--inbox fc-hero-in fc-hero-in--1" style={{ position: "relative", overflow: "hidden", padding: "clamp(14px,2.5vw,22px)" }}>
          <CalendarLine className="fc-lineart fc-float" width={64} style={{ position: "absolute", right: 16, top: 8, color: "var(--line-2)", opacity: 0.7 }} />
          <div className="fc-card fc-card--pad" style={{ background: "#fff", position: "relative" }}>
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
        </div>

        {isClaimed ? (
          <>
            <div className="fc-hero-in fc-hero-in--2" style={{ marginTop: 24, marginBottom: 14 }}>
              <p className="kicker" style={{ color: "var(--blue-deep)" }}>Book a viewing</p>
              <h1 className="serif" style={{ fontSize: "clamp(24px,4vw,32px)", fontWeight: 600, margin: "6px 0 0", color: "var(--ink)" }}>
                Arrange a viewing with {name}
              </h1>
              <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>
                Pick a property, a date and a time. {name} will confirm the final details with you.
              </p>
            </div>

            <div className="fc-hero-in fc-hero-in--3">
              <BookingForm agentSlug={agent.slug as string} agentName={name} />
            </div>
          </>
        ) : (
          // Unclaimed agent: no booking form. We have no channel to deliver a
          // request to this agent, so accepting one would ghost the visitor
          // (same honesty rule as the seller-lead flow). The visitor gets a
          // truthful state + a working path; the agent gets the claim trigger.
          <>
            <div className="fc-hero-in fc-hero-in--2" style={{ marginTop: 24, marginBottom: 14 }}>
              <p className="kicker" style={{ color: "var(--blue-deep)" }}>Book a viewing</p>
              <h1 className="serif" style={{ fontSize: "clamp(24px,4vw,32px)", fontWeight: 600, margin: "6px 0 0", color: "var(--ink)" }}>
                {name} does not take bookings here yet
              </h1>
              <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>
                This profile has not been claimed, so a viewing request sent here would
                not reach {name}. We never take a request we cannot deliver.
              </p>
            </div>

            <div className="fc-card fc-card--pad fc-hero-in fc-hero-in--3" style={{ background: "#fff" }}>
              <p style={{ fontWeight: 700, fontSize: 15.5, margin: 0, color: "var(--ink)" }}>
                Looking to view or sell a property?
              </p>
              <p className="muted" style={{ margin: "6px 0 0", fontSize: 14.5 }}>
                Compare the ranked agents in your area and invite the ones who do respond,
                free and with no obligation.
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                <Link href="/sell?utm_source=book_unclaimed" className="fc-btn fc-btn--primary fc-btn--hairline">
                  Compare agents free
                </Link>
                <Link href={`/property-agents/agent/${agent.slug}`} className="fc-btn fc-btn--quiet">
                  View {name}&apos;s record
                </Link>
              </div>
            </div>

            <div className="fc-scene fc-scene--grow fc-hero-in fc-hero-in--4" style={{ marginTop: 16, padding: "clamp(12px,2vw,18px)" }}>
              <div className="fc-card fc-card--pad" style={{ background: "#fff" }}>
                <p style={{ fontWeight: 700, fontSize: 15.5, margin: 0, color: "var(--ink)" }}>
                  Are you {name}?
                </p>
                <p className="muted" style={{ margin: "6px 0 0", fontSize: 14.5 }}>
                  Someone just tried to book a viewing with you. Claim your free profile to
                  turn on bookings: buyers pick a time, requests land in your Planner, and
                  confirmed viewings sync to your Google Calendar.
                </p>
                <Link href={`/property-agents/agent/${agent.slug}#claim`} className="fc-btn fc-btn--ink fc-btn--sm" style={{ marginTop: 12 }}>
                  Claim your profile
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
