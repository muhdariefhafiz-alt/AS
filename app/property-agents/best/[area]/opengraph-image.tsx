import { ImageResponse } from "next/og";

// Exp 2: share-optimised Open Graph card for the per-area leaderboard, so when
// an agent shares "I'm ranked in {area}", the link renders a strong card.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Top property agents in Singapore, ranked on CEA transaction data";

type Props = { params: Promise<{ area: string }> };

function areaLabel(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function OpengraphImage({ params }: Props) {
  const { area } = await params;
  const label = areaLabel(area);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a1733",
          padding: "72px 80px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 22,
              letterSpacing: 4,
              color: "#7e8cc4",
              textTransform: "uppercase",
            }}
          >
            FairComparisons
          </div>
          <div style={{ display: "flex", marginTop: 28 }}>
            <div style={{ width: 6, background: "#1f44ff", borderRadius: 4, marginRight: 28 }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 76, fontWeight: 700, color: "#ffffff", lineHeight: 1.05 }}>
                {"Top 10 agents"}
              </div>
              <div style={{ fontSize: 76, fontWeight: 700, color: "#ffffff", lineHeight: 1.05 }}>
                {`in ${label}`}
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontFamily: "monospace",
            fontSize: 24,
            color: "#a9b4dd",
          }}
        >
          <div>Ranked on CEA transaction data, not advertising.</div>
          <div style={{ color: "#1f44ff", fontWeight: 700 }}>fair-comparisons.com</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
