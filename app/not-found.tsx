import Link from "next/link";
import { SkylineStrip } from "./components/LineArt";

// Custom 404: broken inbound links (old portals, mistyped agent slugs) land
// here, so it routes the visitor back into the register instead of dead-ending.
// Staggered load-in, skyline signature, no JS needed.
export default function NotFound() {
  return (
    <section style={{ background: "var(--ink)", color: "#fff", position: "relative", overflow: "hidden" }}>
      <SkylineStrip
        className="fc-lineart"
        width={720}
        style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: -8, color: "var(--line-dk)", maxWidth: "96%" }}
      />
      <div className="fc-wrap" style={{ textAlign: "center", padding: "88px 40px 130px", position: "relative" }}>
        <div className="eyebrow fc-hero-in fc-hero-in--1" style={{ color: "var(--slate-2)", marginBottom: 14 }}>
          Page not found
        </div>
        <h1 className="fc-hero-in fc-hero-in--2" style={{ color: "#fff", fontSize: "clamp(30px,4vw,44px)", lineHeight: 1.1, margin: "0 auto", maxWidth: "22ch" }}>
          This page is not <span className="italic-serif">on the record.</span>
        </h1>
        <p className="fc-hero-in fc-hero-in--3" style={{ color: "rgba(255,255,255,0.72)", margin: "14px auto 0", maxWidth: "48ch", fontSize: 16 }}>
          The link may be old or mistyped. The register itself is very much alive:
          every CEA-registered agent, ranked on real transactions.
        </p>
        <div className="fc-hero-in fc-hero-in--4" style={{ marginTop: 26, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/search" className="fc-btn fc-btn--primary fc-btn--hairline">Search the register</Link>
          <Link href="/sell" className="fc-btn fc-btn--ghost-light">Compare agents to sell</Link>
        </div>
        <p className="fc-hero-in fc-hero-in--5 mono" style={{ color: "rgba(255,255,255,0.55)", fontSize: 12.5, marginTop: 20 }}>
          Or start from the <Link href="/" style={{ color: "rgba(255,255,255,0.8)" }}>homepage</Link>
        </p>
      </div>
    </section>
  );
}
