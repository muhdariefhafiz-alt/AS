import { SkylineStrip } from "./LineArt";

// The skyline signature as a quiet pre-footer divider for programmatic pages:
// one centered line-art strip above the closing CTA/footer. Pure SVG, zero JS.
export default function SkylinePreFooter() {
  return (
    <div aria-hidden="true" style={{ textAlign: "center", padding: "34px 16px 0", color: "var(--line-2)", overflow: "hidden" }}>
      <SkylineStrip width={560} style={{ maxWidth: "100%" }} />
    </div>
  );
}
