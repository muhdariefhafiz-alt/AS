// "Works with your stack" hub, the SG equivalent of housapp's "Werkt met al jouw
// tools". Per the brief, the not-yet-built integrations are greyed out with a
// small "Coming soon" label so the copy never overpromises. Google Calendar is
// the one genuinely live integration (Planner syncs confirmed viewings to it),
// so it carries a "Live" badge instead. No external logo assets are loaded (keeps
// the static page self-contained); each tool is a neutral monogram chip.

type Tool = { name: string; live?: boolean };

const TOOLS: Tool[] = [
  { name: "Google Calendar", live: true },
  { name: "PropertyGuru" },
  { name: "99.co" },
  { name: "SRX" },
  { name: "EdgeProp" },
  { name: "WhatsApp" },
  { name: "Outlook" },
  { name: "Stripe" },
];

function monogram(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9]/g, "");
  return cleaned.slice(0, 2).toUpperCase();
}

export default function AgentIntegrationHub() {
  return (
    <section className="lp-section">
      <div className="fc-wrap fc-reveal" style={{ padding: "64px 40px", textAlign: "center" }}>
        <div className="lp-hero__eyebrow" style={{ justifyContent: "center" }}>Works with your stack</div>
        <h2 style={{ maxWidth: "22ch", margin: "12px auto 0", fontSize: "clamp(24px,3vw,32px)" }}>
          Built to plug into the tools you already use.
        </h2>
        <p className="muted" style={{ maxWidth: "56ch", margin: "14px auto 0", fontSize: 15.5, lineHeight: 1.7 }}>
          Your calendar sync is live today. The portals and channels below are on the roadmap, so your FairComparisons record stays the hub, whatever else you run.
        </p>

        {/* Centre node */}
        <div style={{ margin: "34px auto 0", display: "inline-flex", alignItems: "center", gap: 10, background: "var(--ink)", color: "#fff", borderRadius: 14, padding: "12px 20px" }}>
          <span style={{ width: 24, height: 24, borderRadius: 999, background: "var(--blue)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✓</span>
          <span className="serif" style={{ fontWeight: 600, fontSize: 18 }}>FairComparisons</span>
        </div>

        <div
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
          }}
        >
          {TOOLS.map((t) => {
            const live = Boolean(t.live);
            return (
              <div
                key={t.name}
                className="fc-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "13px 15px",
                  opacity: live ? 1 : 0.55,
                  filter: live ? "none" : "grayscale(1)",
                }}
              >
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: live ? "var(--blue-wash)" : "var(--cloud)",
                    color: live ? "var(--blue-deep)" : "var(--slate)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 11.5,
                    flexShrink: 0,
                  }}
                >
                  {monogram(t.name)}
                </span>
                <span style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 13.5, color: "var(--ink)", lineHeight: 1.2 }}>
                    {t.name}
                  </span>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 2,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      color: live ? "var(--blue-deep)" : "var(--slate)",
                    }}
                  >
                    {live ? "LIVE" : "COMING SOON"}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
