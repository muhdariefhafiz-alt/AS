import type { Metadata } from "next";
import { Lockup } from "../../components/Brand";
import AgreementForm from "./AgreementForm";
import {
  AGENT_TERMS_TITLE,
  AGENT_TERMS_VERSION,
  AGENT_TERMS_INTRO,
  AGENT_TERMS_CLAUSES,
  AGENT_TERMS_FOOTNOTE,
} from "../../lib/agent-terms";

export const metadata: Metadata = {
  title: "Agent Agreement",
  description:
    "The FairComparisons Agent Agreement: a single blanket agreement covering every seller introduced through FairComparisons. 0.25% success fee on completed sales, the 2026 launch rate.",
  alternates: { canonical: "https://fair-comparisons.com/for-agents/agreement" },
};

type Props = { searchParams: Promise<{ cea?: string }> };

export default async function AgreementPage({ searchParams }: Props) {
  const { cea } = await searchParams;

  return (
    <div className="fc-wrap" style={{ padding: "32px 40px 72px", maxWidth: 820 }}>
      <div className="eyebrow">For agents</div>
      <h1 style={{ margin: "10px 0 0" }}>{AGENT_TERMS_TITLE}</h1>
      <p className="lede" style={{ maxWidth: "62ch", marginTop: 12 }}>{AGENT_TERMS_INTRO}</p>
      <div className="fc-row" style={{ gap: 10, marginTop: 14 }}>
        <span className="fc-badge fc-badge--ranked"><span className="dot" /> 0.25% · 2026 launch rate</span>
        <span className="fc-badge fc-badge--source">Version {AGENT_TERMS_VERSION}</span>
      </div>

      <div className="fc-card fc-card--pad" style={{ marginTop: 24 }}>
        {AGENT_TERMS_CLAUSES.map((c) => (
          <div key={c.h} style={{ padding: "14px 0", borderTop: "1px solid var(--line)" }}>
            <div className="serif" style={{ fontWeight: 600, fontSize: 18 }}>{c.h}</div>
            <p className="muted" style={{ margin: "6px 0 0", fontSize: 15, lineHeight: 1.6 }}>{c.body}</p>
          </div>
        ))}
        <p className="mono small muted" style={{ marginTop: 16 }}>{AGENT_TERMS_FOOTNOTE}</p>
      </div>

      <h2 style={{ fontSize: 24, marginTop: 36 }}>Sign the agreement</h2>
      <p className="muted small" style={{ margin: "6px 0 16px" }}>
        We confirm your identity against your CEA record. Your typed name is your e-signature; the signed copy is
        stored with a timestamp.
      </p>
      <AgreementForm presetCea={cea} />

      <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
        <Lockup size={18} />
      </div>
    </div>
  );
}
