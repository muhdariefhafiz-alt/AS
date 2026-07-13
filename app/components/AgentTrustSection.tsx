import Link from "next/link";

// Data + integrity trust block: the honest Singapore equivalent of housapp's
// "data security" section. We do NOT claim certifications we do not hold (no
// SOC 2, no formal DPA product). We lead with what is true and is actually our
// moat: PDPA-aligned handling, TLS encryption, and the integrity guarantee that
// no payment can move a ranking, on data sourced from official registers.

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

const ITEMS: { title: string; body: string }[] = [
  {
    title: "PDPA-aligned handling",
    body: "Seller and agent data is handled under Singapore's Personal Data Protection Act. We never sell your data.",
  },
  {
    title: "TLS-encrypted connection",
    body: "Every connection to FairComparisons is encrypted end to end over HTTPS.",
  },
  {
    title: "Rankings cannot be bought",
    body: "AgentScore is computed only from official records. No tier and no payment changes your rank or who receives leads.",
  },
  {
    title: "Sourced from official records",
    body: "Every score and figure traces to CEA, URA and HDB data, sourced and dated. Nothing is invented.",
  },
];

export default function AgentTrustSection() {
  return (
    <section className="lp-hero" style={{ marginTop: 0 }}>
      <div className="fc-wrap fc-reveal" style={{ textAlign: "center", padding: "64px 40px" }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
          }}
        >
          <ShieldIcon />
        </div>
        <h2 style={{ color: "#fff", maxWidth: "20ch", margin: "20px auto 0", fontSize: "clamp(26px,3vw,34px)" }}>
          Your data and your ranking, both protected.
        </h2>
        <p className="lp-hero__sub" style={{ margin: "14px auto 0", maxWidth: "52ch" }}>
          The two things agents worry about most: what happens to their data, and whether the game is rigged. Neither is for sale here.
        </p>
        <div style={{ marginTop: 22 }}>
          <Link href="/trust" className="fc-btn fc-btn--ghost-light">Read our trust and data page</Link>
        </div>

        <div
          style={{
            marginTop: 34,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            textAlign: "left",
          }}
        >
          {ITEMS.map((it) => (
            <div
              key={it.title}
              style={{
                borderRadius: 14,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                padding: "18px 18px 20px",
              }}
            >
              <div style={{ display: "flex", gap: 9, alignItems: "center", color: "#8fb7ff" }}>
                <ShieldIcon />
                <span style={{ fontWeight: 700, fontSize: 14.5, color: "#fff" }}>{it.title}</span>
              </div>
              <p style={{ margin: "9px 0 0", fontSize: 13.5, lineHeight: 1.6, color: "rgba(255,255,255,0.72)" }}>{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
