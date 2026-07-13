// Product-forward visual for the Planner highlight (the housapp "works with
// your tools" move): a miniature, non-interactive render of the booking ->
// confirm -> calendar flow, built from the same design tokens. Pure JSX/CSS,
// crisp at any DPI, no screenshot asset, no fabricated person (illustrative UI
// state). aria-hidden: decorative.
export default function PlannerPreview() {
  return (
    <div
      aria-hidden="true"
      style={{
        maxWidth: 420,
        margin: "0 auto",
        pointerEvents: "none",
        userSelect: "none",
        borderRadius: 16,
        border: "1px solid var(--line)",
        background: "#fff",
        boxShadow: "0 24px 60px -24px rgba(10,16,38,0.35)",
        overflow: "hidden",
        textAlign: "left",
      }}
    >
      {/* Booking link header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", background: "var(--cloud)", borderBottom: "1px solid var(--line)" }}>
        <span style={{ fontSize: 9, letterSpacing: 1.2, fontWeight: 700, color: "var(--slate)" }}>YOUR BOOKING LINK</span>
        <span style={{ flex: 1, textAlign: "right", fontSize: 10.5, color: "var(--slate)", fontFamily: "var(--mono, ui-monospace, monospace)" }}>
          /book/your-name
        </span>
      </div>

      <div style={{ padding: "14px 15px 16px" }}>
        {/* Step 1 — a buyer's request lands */}
        <div style={{ borderRadius: 10, border: "1px solid var(--line)", borderLeft: "3px solid #f0a730", padding: "10px 13px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 8.5, letterSpacing: 1.1, fontWeight: 700, color: "#93500b" }}>NEW REQUEST</span>
            <span style={{ fontSize: 9.5, fontWeight: 700, background: "#fff4e5", color: "#93500b", borderRadius: 999, padding: "2px 8px" }}>Awaiting you</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--ink)", marginTop: 6 }}>Blk 123 Tampines St 11</div>
          <div style={{ fontSize: 11, color: "var(--blue-deep)", fontWeight: 600, marginTop: 2 }}>Sat 15 Nov · 3:00pm</div>
          <div style={{ fontSize: 10.5, color: "var(--slate)", marginTop: 2 }}>Wei Ming · +65 8xxx xxxx</div>
          <span style={{ display: "inline-block", marginTop: 9, fontSize: 10.5, fontWeight: 700, color: "#fff", background: "var(--blue)", borderRadius: 7, padding: "5px 12px" }}>
            Confirm
          </span>
        </div>

        {/* Connector — the sync moment */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "11px 2px", color: "var(--slate)" }}>
          <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
          <span style={{ fontSize: 10, fontWeight: 600 }}>syncs automatically</span>
          <span style={{ fontSize: 12 }}>&#8595;</span>
          <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
        </div>

        {/* Step 2 — it appears in the calendar */}
        <div style={{ borderRadius: 10, border: "1px solid var(--line)", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--blue-wash)", borderBottom: "1px solid var(--line)" }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--blue-deep)" }}>November</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9.5, fontWeight: 700, color: "var(--ok)" }}>
              <span style={{ width: 13, height: 13, borderRadius: 999, background: "var(--ok)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>✓</span>
              Google Calendar
            </span>
          </div>
          <div style={{ padding: "9px 12px 11px" }}>
            {/* a couple of faint existing slots + the new synced event */}
            <div style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 10, color: "var(--slate-2, #9aa3b2)", padding: "3px 0" }}>
              <span style={{ width: 34 }}>1:00</span>
              <span style={{ flex: 1, height: 12, borderRadius: 4, background: "var(--cloud)" }} />
            </div>
            <div style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 10.5, color: "var(--ink)", padding: "3px 0" }}>
              <span style={{ width: 34, fontWeight: 700, color: "var(--blue-deep)" }}>3:00</span>
              <span style={{ flex: 1, borderRadius: 5, background: "var(--blue)", color: "#fff", fontWeight: 700, fontSize: 10, padding: "5px 9px" }}>
                Viewing: Blk 123 Tampines
              </span>
            </div>
            <div style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 10, color: "var(--slate-2, #9aa3b2)", padding: "3px 0" }}>
              <span style={{ width: 34 }}>4:30</span>
              <span style={{ flex: 1, height: 12, borderRadius: 4, background: "var(--cloud)" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
