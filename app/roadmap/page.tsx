import type { Metadata } from "next";
import Link from "next/link";
import { ROADMAP, byStatus } from "../lib/roadmap";
import { EntryCard } from "./RoadmapUI";
import ScrollReveal from "../components/ScrollReveal";

export const revalidate = 86400;

const TITLE = "What We Are Building: FairComparisons Product Roadmap";
const DESC =
  "Everything we have shipped for Singapore property agents, sellers and landlords, and what we are working on next. Each entry explains what it is, why we built it and how to use it.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | FairComparisons` },
  description: DESC,
  alternates: { canonical: "https://fair-comparisons.com/roadmap" },
  openGraph: {
    title: "What we are building",
    description: "Shipped, building now, and exploring. The FairComparisons product roadmap in the open.",
    url: "https://fair-comparisons.com/roadmap",
    type: "website",
    locale: "en_SG",
    images: ["https://fair-comparisons.com/og-image.png"],
  },
};

export default function RoadmapPage() {
  const live = byStatus("live");
  const building = byStatus("building");
  const exploring = byStatus("exploring");

  return (
    <main className="fc-page">
      <div className="fc-wrap">
        <div className="eyebrow fc-hero-in fc-hero-in--1">Product</div>
        <h1 className="fc-hero-in fc-hero-in--2" style={{ fontSize: "var(--t-h1)", margin: "10px 0 0", maxWidth: "20ch" }}>
          What we are <span className="italic-serif">building.</span>
        </h1>
        <p className="muted fc-hero-in fc-hero-in--3" style={{ marginTop: 12, fontSize: 17, maxWidth: "64ch", lineHeight: 1.6 }}>
          We build in the open. Below is what is live for agents, sellers and landlords today, what we are working on
          right now, and what we are still weighing up. Every entry links to a short write-up: what it is, why we built
          it, who it helps and how to use it.
        </p>

        <div className="fc-row fc-hero-in fc-hero-in--4" style={{ gap: 28, marginTop: 22, flexWrap: "wrap" }}>
          <Stat n={live.length} label="Live" />
          <Stat n={building.length} label="Building now" />
          {exploring.length > 0 && <Stat n={exploring.length} label="Exploring" />}
        </div>

        <ScrollReveal />

        <Group
          title="Live"
          blurb="Built, tested and in the product today. Dates are when each one went live."
          entries={live}
        />

        {building.length > 0 && (
          <Group
            title="Building now"
            blurb="In active development. These are intentions, not promises: we ship when they are right, and we say so here when they land."
            entries={building}
          />
        )}

        {exploring.length > 0 && (
          <Group
            title="Exploring"
            blurb="Worth doing, not yet committed. Usually waiting on evidence that agents want it, or on something outside our control."
            entries={exploring}
          />
        )}

        <div className="fc-scene fc-scene--ink" style={{ marginTop: 44, padding: "clamp(14px,2.4vw,24px)" }}>
          <div className="fc-scene__card" style={{ padding: "clamp(18px,3vw,28px)" }}>
            <h2 className="serif" style={{ fontSize: "clamp(20px,2.6vw,26px)", margin: 0 }}>
              Something missing? <span className="italic-serif">Tell us.</span>
            </h2>
            <p className="muted" style={{ marginTop: 8, fontSize: 15.5, maxWidth: "56ch", lineHeight: 1.6 }}>
              Most of what is on this page came from an agent or a seller telling us what was slow, unclear or
              missing. If you are working around something today, we would rather hear it than guess.
            </p>
            <div className="fc-row" style={{ gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <Link href="/contact" className="fc-btn fc-btn--primary fc-btn--hairline" style={{ textDecoration: "none" }}>
                Send us a note
              </Link>
              <Link href="/for-agents" className="fc-btn fc-btn--quiet" style={{ textDecoration: "none" }}>
                See the agent product
              </Link>
            </div>
          </div>
        </div>

        <p className="muted small" style={{ marginTop: 28 }}>
          {ROADMAP.length} entries. We list product changes that agents, sellers and landlords can actually see or use.
          Bug fixes, data refreshes and internal work do not appear here.
        </p>
      </div>
    </main>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <p className="serif tnum" style={{ fontSize: 28, fontWeight: 600, margin: 0, color: "var(--blue)" }}>{n}</p>
      <p className="kicker" style={{ margin: "2px 0 0" }}>{label}</p>
    </div>
  );
}

function Group({ title, blurb, entries }: { title: string; blurb: string; entries: ReturnType<typeof byStatus> }) {
  if (!entries.length) return null;
  return (
    <section style={{ marginTop: 40 }}>
      <h2 style={{ fontSize: "var(--t-h2)", margin: 0 }}>{title}</h2>
      <p className="muted" style={{ marginTop: 6, fontSize: 15, maxWidth: "62ch", lineHeight: 1.6 }}>{blurb}</p>
      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        {entries.map((e, i) => (
          <EntryCard key={e.slug} entry={e} index={i} />
        ))}
      </div>
    </section>
  );
}
