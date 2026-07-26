import ScrollReveal from "./ScrollReveal";
import { HdbBlock, CondoTower, Shophouse, TerraceRow, MrtTrain } from "./LineArt";

// Compact programmatic hero for the SEO backbone (agent, district, town,
// agency, development templates - ~39k URLs). One component so the standard
// (staggered load-in, line-art float, ink world) propagates everywhere from a
// single cached chunk. CSS-only motion; zero per-page JS beyond the tiny
// shared ScrollReveal engine (mounted here so every backbone page gets
// section reveals for free).
const ART = {
  hdb: HdbBlock,
  condo: CondoTower,
  shophouse: Shophouse,
  terrace: TerraceRow,
  mrt: MrtTrain,
} as const;

export default function HeroBand({
  eyebrow,
  title,
  accent,
  sub,
  chips,
  art = "hdb",
  children,
}: {
  eyebrow: string;
  /** Serif headline; `accent` renders after it in italic serif. */
  title: React.ReactNode;
  accent?: React.ReactNode;
  sub?: React.ReactNode;
  /** Small mono stat chips under the sub (already-verified values only). */
  chips?: string[];
  art?: keyof typeof ART;
  /** Extra hero content (search forms, CTAs) staggered in last. */
  children?: React.ReactNode;
}) {
  const Art = ART[art];
  return (
    <>
      <ScrollReveal />
      <section style={{ background: "var(--ink)", color: "#fff", position: "relative", overflow: "hidden" }}>
        <Art
          className="fc-lineart fc-float"
          width={art === "terrace" ? 160 : art === "mrt" ? 130 : 104}
          style={{ position: "absolute", right: "4%", bottom: 14, color: "var(--line-dk)" }}
        />
        <div className="fc-wrap" style={{ padding: "52px 40px 44px", position: "relative" }}>
          <div className="eyebrow fc-hero-in fc-hero-in--1" style={{ color: "var(--slate-2)", marginBottom: 14 }}>
            {eyebrow}
          </div>
          <h1 className="fc-hero-in fc-hero-in--2" style={{ color: "#fff", fontSize: "clamp(30px,4vw,46px)", lineHeight: 1.08, margin: 0, maxWidth: "24ch" }}>
            {title}
            {accent && <> <span className="italic-serif">{accent}</span></>}
          </h1>
          {sub && (
            <p className="lede fc-hero-in fc-hero-in--3" style={{ color: "rgba(255,255,255,0.74)", marginTop: 14, maxWidth: "62ch" }}>
              {sub}
            </p>
          )}
          {chips && chips.length > 0 && (
            <div className="fc-row fc-hero-in fc-hero-in--4" style={{ marginTop: 16, gap: 14, flexWrap: "wrap" }}>
              {chips.map((c) => (
                <span
                  key={c}
                  className="mono"
                  style={{
                    color: "rgba(255,255,255,0.82)", fontSize: 12.5, border: "1px solid rgba(255,255,255,0.24)",
                    borderRadius: 999, padding: "5px 12px",
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          )}
          {children && <div className="fc-hero-in fc-hero-in--5" style={{ marginTop: 20 }}>{children}</div>}
        </div>
      </section>
    </>
  );
}
