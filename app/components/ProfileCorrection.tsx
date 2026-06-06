import Link from "next/link";

// PDPA Accuracy Obligation + suppression mitigation. Every agent profile is
// built from public CEA / URA / HDB records, so each one must carry a clear,
// always-visible way to (a) flag a factual error for correction and (b) request
// removal. Shown on EVERY profile, including thin ones with no transactions.
// Intentionally no value-laden language and no hard SLA we cannot guarantee.
export default function ProfileCorrection({
  given,
  cea,
}: {
  given: string;
  cea?: string | null;
}) {
  const ref = cea ? `?ref=profile_correction&cea=${encodeURIComponent(cea)}` : "?ref=profile_correction";
  return (
    <section style={{ marginTop: 36 }}>
      <div className="fc-card fc-card--pad" style={{ background: "var(--cloud)" }}>
        <div className="kicker">Is this {given}?</div>
        <p className="small muted" style={{ margin: "8px 0 0", lineHeight: 1.7, maxWidth: "70ch" }}>
          This profile is compiled from public CEA, URA and HDB transaction records. If a figure
          looks wrong, we will check it against the source and correct verified errors. You can also{" "}
          <Link href="#claim" style={{ color: "var(--blue)", fontWeight: 600 }}>claim the profile</Link>{" "}
          to add context, or ask us to remove it.
        </p>
        <Link
          href={`/contact${ref}`}
          className="fc-btn fc-btn--ghost fc-btn--sm"
          style={{ marginTop: 12 }}
        >
          Request a correction or removal
        </Link>
      </div>
    </section>
  );
}
