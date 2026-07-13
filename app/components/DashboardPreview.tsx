// Product-forward hero visual (the housapp move): a miniature, non-interactive
// render of the REAL agent dashboard Home tab, built from the same design
// tokens. Pure JSX/CSS (crisp at any DPI, no screenshot asset, no fake person —
// values are clearly illustrative UI states). aria-hidden: decorative.
export default function DashboardPreview() {
  return (
    <div
      aria-hidden="true"
      style={{
        maxWidth: 660,
        margin: "0 auto",
        pointerEvents: "none",
        userSelect: "none",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "#fff",
        boxShadow: "0 30px 80px -20px rgba(10,16,38,0.55)",
        overflow: "hidden",
        textAlign: "left",
      }}
    >
      {/* Browser chrome */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--cloud)", borderBottom: "1px solid var(--line)" }}>
        <span style={{ display: "flex", gap: 5 }}>
          {["#f87171", "#fbbf24", "#34d399"].map((c) => (
            <span key={c} style={{ width: 9, height: 9, borderRadius: 999, background: c, display: "inline-block" }} />
          ))}
        </span>
        <span style={{ flex: 1, textAlign: "center", fontSize: 11, color: "var(--slate)", background: "#fff", borderRadius: 999, padding: "3px 12px", border: "1px solid var(--line)" }}>
          fair-comparisons.com/dashboard
        </span>
      </div>

      <div style={{ padding: "14px 16px 18px" }}>
        {/* Mini header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ width: 22, height: 22, borderRadius: 999, background: "var(--ok)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>✓</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, color: "var(--ink)" }}>Your dashboard</div>
              <div style={{ fontSize: 10, color: "var(--slate)" }}>CEA-registered agent</div>
            </div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, background: "var(--cloud)", borderRadius: 999, padding: "3px 10px", color: "var(--ink)" }}>Free plan</span>
        </div>

        {/* Mini tabs */}
        <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--line)", marginTop: 12 }}>
          {["Home", "Leads", "Grow", "Profile"].map((t, i) => (
            <span key={t} style={{ padding: "6px 11px", fontSize: 11, fontWeight: 600, color: i === 0 ? "var(--ink)" : "var(--slate)", borderBottom: i === 0 ? "2px solid var(--blue)" : "2px solid transparent", marginBottom: -1 }}>
              {t}
            </span>
          ))}
        </div>

        {/* Mini standing */}
        <div style={{ marginTop: 12, borderRadius: 10, background: "var(--blue-wash)", padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 9, letterSpacing: 1.2, fontWeight: 700, color: "var(--slate)" }}>YOUR STANDING</span>
            <span style={{ fontSize: 10, fontWeight: 700, background: "#fff", borderRadius: 999, padding: "3px 9px", color: "var(--ink)" }}>AgentScore 89</span>
          </div>
          <div className="serif" style={{ fontSize: 17, fontWeight: 600, color: "var(--blue-deep)", marginTop: 5 }}>Top 25% of agents in Yishun</div>
          <div style={{ fontSize: 10.5, color: "var(--slate)", marginTop: 3 }}>Computed from official CEA transaction records.</div>
        </div>

        {/* Mini worklist */}
        <div style={{ marginTop: 10, borderRadius: 10, border: "1px solid var(--line)", borderLeft: "3px solid var(--ok)", padding: "10px 13px" }}>
          <span style={{ fontSize: 9, letterSpacing: 1.2, fontWeight: 700, color: "var(--ok)" }}>WHAT NEEDS YOU TODAY</span>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontSize: 11.5, color: "var(--ink)" }}>
            <span><strong>1</strong> seller enquiry is awaiting your quote</span>
            <span style={{ color: "var(--blue)", fontWeight: 700 }}>Reply →</span>
          </div>
        </div>

        {/* Mini completeness */}
        <div style={{ marginTop: 10, borderRadius: 10, border: "1px solid var(--line)", borderLeft: "3px solid var(--blue)", padding: "10px 13px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink)" }}>Finish your profile — 80% done</span>
            <span style={{ fontSize: 10, color: "var(--slate)" }}>4 of 5 steps</span>
          </div>
          <div style={{ marginTop: 7, height: 6, borderRadius: 999, background: "var(--cloud)", overflow: "hidden" }}>
            <div style={{ width: "80%", height: "100%", background: "var(--blue)" }} />
          </div>
          <span style={{ display: "inline-block", marginTop: 8, fontSize: 10.5, fontWeight: 700, color: "#fff", background: "var(--blue)", borderRadius: 7, padding: "5px 10px" }}>
            Add your WhatsApp →
          </span>
        </div>
      </div>
    </div>
  );
}
