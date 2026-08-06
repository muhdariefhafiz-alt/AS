import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ROADMAP, roadmapBySlug, relatedEntries } from "../../lib/roadmap";
import { AUDIENCE_LABEL, EntryCard, StatusPill, shippedLabel } from "../RoadmapUI";
import ScrollReveal from "../../components/ScrollReveal";

// One post per roadmap entry, in a fixed shape: what it is, why we built it,
// who it helps, the use case, and a walkthrough. The shape is deliberate: a
// product update that cannot answer all five is not ready to be announced.

export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  return ROADMAP.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = roadmapBySlug(slug);
  if (!entry) return {};
  const url = `https://fair-comparisons.com/roadmap/${entry.slug}`;
  return {
    title: { absolute: `${entry.title} | FairComparisons` },
    description: entry.summary,
    alternates: { canonical: url },
    openGraph: {
      title: entry.title,
      description: entry.summary,
      url,
      type: "article",
      locale: "en_SG",
      images: ["https://fair-comparisons.com/og-image.png"],
    },
  };
}

export default async function RoadmapPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = roadmapBySlug(slug);
  if (!entry) notFound();

  const related = relatedEntries(entry.slug);
  const isLive = entry.status === "live";

  return (
    <main className="fc-page">
      <div className="fc-wrap" style={{ maxWidth: 820 }}>
        <Link href="/roadmap" className="small" style={{ color: "var(--blue)", fontWeight: 600 }}>
          &larr; What we are building
        </Link>

        <div className="fc-row fc-hero-in fc-hero-in--1" style={{ gap: 10, alignItems: "center", marginTop: 16, flexWrap: "wrap" }}>
          <StatusPill status={entry.status} />
          <span className="kicker" style={{ margin: 0 }}>{AUDIENCE_LABEL[entry.audience]}</span>
          {entry.shipped && (
            <span className="mono" style={{ fontSize: 11.5, color: "var(--slate)" }}>{shippedLabel(entry.shipped)}</span>
          )}
        </div>

        <h1 className="fc-hero-in fc-hero-in--2" style={{ fontSize: "var(--t-h1)", margin: "12px 0 0" }}>
          {entry.title}
        </h1>
        <p className="muted fc-hero-in fc-hero-in--3" style={{ marginTop: 12, fontSize: 17, lineHeight: 1.6 }}>
          {entry.summary}
        </p>

        {entry.tryIt && (
          <div className="fc-row fc-hero-in fc-hero-in--4" style={{ gap: 10, marginTop: 20, flexWrap: "wrap", alignItems: "center" }}>
            <Link href={entry.tryIt.href} className="fc-btn fc-btn--primary fc-btn--hairline" style={{ textDecoration: "none" }}>
              {entry.tryIt.label}
            </Link>
            {entry.tiers && <span className="muted small">{entry.tiers}</span>}
          </div>
        )}

        <ScrollReveal />

        <Section title={isLive ? "What it is" : "What it will be"}>
          {entry.whatItIs.map((p) => (
            <p key={p} style={PARA}>{p}</p>
          ))}
        </Section>

        <Section title={isLive ? "Why we built it" : "Why we are building it"}>
          {entry.whyWeBuiltIt.map((p) => (
            <p key={p} style={PARA}>{p}</p>
          ))}
        </Section>

        <Section title="Who it helps">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {entry.whoItHelps.map((w) => (
              <div key={w.who} className="fc-card fc-card--pad fc-reveal" style={{ background: "#fff" }}>
                <p className="kicker" style={{ margin: 0 }}>{w.who}</p>
                <p style={{ margin: "6px 0 0", fontSize: 15.5, lineHeight: 1.6, color: "var(--ink-2)" }}>{w.how}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="The use case">
          <div className="fc-scene fc-scene--planner" style={{ padding: "clamp(12px,2vw,18px)" }}>
            <div className="fc-scene__card" style={{ padding: "clamp(16px,2.6vw,24px)" }}>
              <h3 className="serif" style={{ fontSize: 19, margin: 0 }}>{entry.useCase.title}</h3>
              <p style={{ margin: "8px 0 0", fontSize: 15.5, lineHeight: 1.65, color: "var(--ink-2)" }}>{entry.useCase.body}</p>
            </div>
          </div>
        </Section>

        {entry.walkthrough.length > 0 && (
          <Section title={isLive ? "Walkthrough" : "How it will work"}>
            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {entry.walkthrough.map((s, i) => (
                <li key={s.step} className="fc-card fc-card--pad fc-reveal" style={{ background: "#fff", ["--reveal-delay" as string]: `${Math.min(i * 0.04, 0.3)}s` }}>
                  <div className="fc-row" style={{ gap: 12, alignItems: "flex-start" }}>
                    <span className="mono" style={{ fontSize: 12, color: "var(--blue)", fontWeight: 700, paddingTop: 2, flexShrink: 0 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{s.step}</p>
                      <p className="muted" style={{ margin: "4px 0 0", fontSize: 14.5, lineHeight: 1.6 }}>{s.detail}</p>
                      {s.shot && (
                        <figure className="fc-shot">
                          {/* width and height are the real pixel size, so the
                              browser reserves the space and the text below does
                              not jump when the image arrives. */}
                          <Image
                            src={s.shot.src}
                            alt={s.shot.alt}
                            width={s.shot.width}
                            height={s.shot.height}
                            sizes="(max-width: 760px) 100vw, 680px"
                            loading="lazy"
                          />
                          <figcaption>{s.shot.caption}</figcaption>
                        </figure>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {entry.limits.length > 0 && (
          <Section title={isLive ? "What it does not do" : "What has to be true first"}>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, fontSize: 15.5, lineHeight: 1.6, color: "var(--ink-2)" }}>
              {entry.limits.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </Section>
        )}

        {entry.tryIt && (
          <div className="fc-card fc-card--fill" style={{ marginTop: 32, padding: "18px 20px", background: "var(--blue-wash)", borderColor: "transparent" }}>
            <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <p style={{ margin: 0, fontSize: 15.5, fontWeight: 600 }}>{entry.tryIt.cta ?? "Try it now"}</p>
              <Link href={entry.tryIt.href} className="fc-btn fc-btn--primary fc-btn--sm fc-btn--hairline" style={{ textDecoration: "none" }}>
                {entry.tryIt.label}
              </Link>
            </div>
          </div>
        )}

        {related.length > 0 && (
          <section style={{ marginTop: 44 }}>
            <h2 style={{ fontSize: "var(--t-h3)", margin: 0 }}>More of what we are building</h2>
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
              {related.map((e, i) => (
                <EntryCard key={e.slug} entry={e} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

const PARA: React.CSSProperties = { margin: "0 0 12px", fontSize: 16, lineHeight: 1.7, color: "var(--ink-2)" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 36 }}>
      <h2 style={{ fontSize: "var(--t-h3)", margin: "0 0 14px" }}>{title}</h2>
      {children}
    </section>
  );
}
