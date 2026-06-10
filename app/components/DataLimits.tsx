import Link from "next/link";

// The consolidated "what this data can and cannot see" panel. The sophisticated
// reader already knows the CEA record is imperfect (team-parking, manual private
// uploads, commercial agents, new-launch quirks, the publishing lag). Stating
// those limits plainly is the strongest trust move a data platform can make: it
// converts the obvious objection into evidence of honesty. Reused on /trust, the
// agent-statistics study, and anywhere we present the data at scale.

type Limit = { head: string; body: string };

const LIMITS: Limit[] = [
  {
    head: "Team deals can be logged under one name",
    body: "Agents often work in teams, and a transaction can be recorded under a team leader rather than the colleague who handled it. We cap implausible single-month volumes so parked team deals cannot inflate one person's AgentScore, and we flag any agent whose record shows it.",
  },
  {
    head: "Some private sales are entered by hand",
    body: "Private property transactions are partly self-submitted to the CEA register, so a small share can be missing or delayed. HDB resale and URA caveat data, which we cross-reference, are more complete.",
  },
  {
    head: "Commercial activity is not always separated",
    body: "The register centres on residential property but can include some non-home deals. Our scoring weights residential home sales, so raw transaction counts may run slightly higher than home-selling activity alone.",
  },
  {
    head: "New-launch volume is recorded differently",
    body: "A project-marketing agent can be credited with many units in a single launch month. We do not cap genuine new-launch sales, but we never treat them as equivalent to selling your specific resale home.",
  },
  {
    head: "Government data is published with a lag",
    body: "The most recent month or two of activity takes time to appear, so a very active agent can briefly look quieter than they are. Recency is measured against the freshest month in the dataset, not today, so nobody is penalised for the lag.",
  },
  {
    head: "Off-market deals never appear",
    body: "Private, unrecorded transactions are not in any public register, so they are not counted for anyone. We show what the record holds and never invent a number to fill a gap.",
  },
];

export default function DataLimits({
  heading = "What this data can and cannot see",
  intro = "Every number on FairComparisons traces to a public government source. No record is perfect, so here is exactly where the data has limits and how we handle each one.",
  background,
}: {
  heading?: string;
  intro?: string;
  background?: string;
}) {
  return (
    <section style={background ? { background } : undefined}>
      <div className="fc-wrap" style={{ padding: "56px 40px", maxWidth: 880 }}>
        <div className="eyebrow">Honest limits</div>
        <h2 style={{ marginTop: 12 }}>{heading}</h2>
        <p className="muted" style={{ marginTop: 10, maxWidth: "70ch", fontSize: 15 }}>{intro}</p>

        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          {LIMITS.map((l) => (
            <div key={l.head} className="fc-card fc-card--pad" style={{ background: "#fff" }}>
              <div className="serif" style={{ fontWeight: 600, fontSize: 17 }}>{l.head}</div>
              <p className="muted" style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.6 }}>{l.body}</p>
            </div>
          ))}
        </div>

        <p className="muted small" style={{ marginTop: 18 }}>
          Spotted something wrong in our data?{" "}
          <Link href="/contact" style={{ color: "var(--blue)", fontWeight: 600 }}>Tell us</Link> and we will check it
          against the source.
        </p>
      </div>
    </section>
  );
}
