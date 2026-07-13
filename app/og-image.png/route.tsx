import { ImageResponse } from "next/og";

export const runtime = "edge";

// Social share card. Brand: "The Record" — ink navy + electric blue, checkmark
// mark (matches components/Brand Lockup), NOT the old teal/FC-box card. The
// transaction count is a durable round figure ("1.3M+"), true well past the
// current 1,341,539 CEA records; the value-prop line leads with the actual
// positioning (evidence over advertising), not a generic "compare agents".
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a1733",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "40px" }}>
          <svg width="66" height="66" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="29.5" stroke="#ffffff" strokeWidth="3" />
            <path
              d="M21.5 33 l7.2 7.6 L44 23.5"
              stroke="#1f44ff"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div style={{ fontSize: "46px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
            FairComparisons
          </div>
        </div>
        <div
          style={{
            fontSize: "40px",
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            maxWidth: "860px",
            lineHeight: 1.25,
          }}
        >
          Choose a property agent on evidence, not ads
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "26px",
            fontSize: "22px",
            color: "#aeb9e6",
          }}
        >
          Ranked on 1.3M+ CEA transactions &middot; No paid placement
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
