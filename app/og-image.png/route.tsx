import { ImageResponse } from "next/og";

export const runtime = "edge";

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
          backgroundColor: "#0A6B5E",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              backgroundColor: "white",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: "800",
              color: "#0A6B5E",
            }}
          >
            FC
          </div>
          <div style={{ fontSize: "42px", fontWeight: "800", color: "white" }}>
            FairComparisons
          </div>
        </div>
        <div
          style={{
            fontSize: "28px",
            color: "rgba(255,255,255,0.8)",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.4,
          }}
        >
          Compare Singapore property agents
        </div>
        <div
          style={{
            fontSize: "20px",
            color: "rgba(255,255,255,0.5)",
            marginTop: "16px",
          }}
        >
          Ranked on 730,000+ CEA transactions · No paid placement
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
