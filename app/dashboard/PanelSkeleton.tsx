"use client";

/**
 * Placeholder shown while a tab's panel chunk is fetched.
 *
 * The panels load with the tab that shows them rather than with the page, which
 * means there is a beat between tapping a tab and its content arriving. Without
 * something here that beat reads as "nothing happened" and invites a second tap.
 *
 * Deliberately shaped like a panel (a title bar and three rows) rather than a
 * spinner, so the layout does not jump when the real content replaces it. It
 * carries no numbers and no invented copy: a skeleton that implies content it
 * has not loaded is the same lie as a metric that reads zero when nothing was
 * measured.
 */
export default function PanelSkeleton() {
  return (
    <div
      className="fc-card"
      role="status"
      aria-busy="true"
      aria-live="polite"
      style={{ padding: 20, marginTop: 16 }}
    >
      <span className="fc-sr-only">Loading</span>
      <div className="fc-skel" style={{ width: 140, height: 13, borderRadius: 4 }} aria-hidden="true" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }} aria-hidden="true">
        <div className="fc-skel" style={{ width: "100%", height: 44, borderRadius: 8 }} />
        <div className="fc-skel" style={{ width: "100%", height: 44, borderRadius: 8 }} />
        <div className="fc-skel" style={{ width: "62%", height: 44, borderRadius: 8 }} />
      </div>
    </div>
  );
}
