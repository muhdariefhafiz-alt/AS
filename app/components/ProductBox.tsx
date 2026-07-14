import Link from "next/link";

// Reusable "product box": the gradient panel + product-mockup creative + benefit
// led header/subheader/CTA, in our own "The Record" brand (ink + electric blue,
// blue-wash gradient), NOT green. Layout is adapted from the housapp for-agent
// page. Use it on any user- or agent-facing marketing surface so the pattern
// stays identical everywhere.
//
//   <ProductBox layout="hero" eyebrow="Deal Radar" title="..." body="..."
//     mockup={<MyMock/>} cta={{label:"Claim", href:"/search", variant:"ink"}}
//     secondary={{label:"See Deal Radar", href:"/for-agents/deal-radar"}} />
//
// Mockups are pure-JSX, clearly illustrative UI states (same standard as
// DashboardPreview), never claims about a real person. Build them with the
// exported MOCKUP_STYLE + <MockChrome/> so every creative matches.

export const BLUE_BOX: React.CSSProperties = {
  borderRadius: 24,
  background: "linear-gradient(120deg, #e4e9ff 0%, #b9c6ff 42%, #6b86ff 100%)",
  overflow: "hidden",
};

export const MOCKUP_STYLE: React.CSSProperties = {
  borderRadius: 14,
  background: "#0a1733",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 26px 60px -22px rgba(10,16,38,0.6)",
  color: "#e6ecff",
  overflow: "hidden",
};

// Shared accent colours for building mockups on the dark navy surface.
export const MOCK = {
  label: "#9db4ff",
  faint: "#93a6d8",
  body: "#d3ddff",
  pillBg: "#9db4ff",
  pillText: "#0a1733",
  panel: "rgba(255,255,255,0.05)",
};

export function MockChrome() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "10px 13px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 8, height: 8, borderRadius: 999, background: "#3a4a7a", display: "inline-block" }} />
      ))}
    </div>
  );
}

type CTA = { label: string; href: string };

type Props = {
  layout?: "hero" | "stacked";
  eyebrow?: string;
  title: string;
  body: string;
  mockup: React.ReactNode;
  cta?: CTA & { variant?: "ink" | "primary" };
  secondary?: CTA;
  /** stacked layout only: link shown under the copy */
  link?: CTA;
};

export default function ProductBox({ layout = "hero", eyebrow, title, body, mockup, cta, secondary, link }: Props) {
  if (layout === "stacked") {
    return (
      <div className="fc-card" style={{ overflow: "hidden", padding: 0 }}>
        <div style={{ ...BLUE_BOX, borderRadius: 0, padding: "26px 26px 4px" }}>{mockup}</div>
        <div style={{ padding: "22px 24px 24px" }}>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h3 className="serif" style={{ fontSize: 21, fontWeight: 600, color: "var(--ink)", margin: "8px 0 0", lineHeight: 1.2 }}>
            {title}
          </h3>
          <p className="muted small" style={{ margin: "10px 0 0", lineHeight: 1.6 }}>{body}</p>
          {link && (
            <div style={{ marginTop: 16 }}>
              <Link href={link.href} style={{ color: "var(--blue)", fontWeight: 700, fontSize: 14.5 }}>{link.label} →</Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // hero layout: gradient box, text + mockup side by side (stacks on mobile).
  return (
    <div style={{ ...BLUE_BOX, padding: "clamp(24px,3vw,36px)" }}>
      <div className="fc-grid-2" style={{ alignItems: "center", gap: "clamp(20px,3vw,36px)" }}>
        <div>
          {eyebrow && (
            <div style={{ fontSize: 12, letterSpacing: 1.4, fontWeight: 700, color: "var(--ink)", opacity: 0.68 }}>
              {eyebrow.toUpperCase()}
            </div>
          )}
          <h3 className="serif" style={{ fontSize: "clamp(22px,2.4vw,30px)", fontWeight: 600, color: "var(--ink)", margin: "10px 0 0", lineHeight: 1.15 }}>
            {title}
          </h3>
          <p style={{ color: "var(--ink-2)", fontSize: 15, lineHeight: 1.6, margin: "12px 0 0", maxWidth: "42ch" }}>{body}</p>
          {(cta || secondary) && (
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginTop: 22 }}>
              {cta && (
                <Link href={cta.href} className={`fc-btn fc-btn--${cta.variant ?? "ink"}`}>
                  {cta.label}
                </Link>
              )}
              {secondary && (
                <Link href={secondary.href} style={{ color: "var(--ink)", fontWeight: 700, fontSize: 14.5 }}>
                  {secondary.label} →
                </Link>
              )}
            </div>
          )}
        </div>
        {mockup}
      </div>
    </div>
  );
}
