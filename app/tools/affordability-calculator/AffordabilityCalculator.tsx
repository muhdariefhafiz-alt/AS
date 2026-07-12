"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  computeAffordability,
  sgd,
  MAS_RULES_VERIFIED_ON,
  MAS_TDSR_URL,
  MAS_LTV_URL,
  STRESS_RATE_RESIDENTIAL,
  type PropClass,
  type LoanCount,
} from "../../lib/affordability";

const CLASS_LABEL: Record<PropClass, string> = {
  private: "Private (condo / landed)",
  hdb_ec: "HDB flat or EC from developer",
};
const COUNT_LABEL: Record<LoanCount, string> = {
  1: "1st housing loan",
  2: "2nd housing loan",
  3: "3rd or more",
};

export default function AffordabilityCalculator() {
  const [fixedIncome, setFixedIncome] = useState("8000");
  const [variableIncome, setVariableIncome] = useState("");
  const [monthlyDebts, setMonthlyDebts] = useState("");
  const [propClass, setPropClass] = useState<PropClass>("private");
  const [loanCount, setLoanCount] = useState<LoanCount>(1);
  const [tenure, setTenure] = useState("30");
  const [age, setAge] = useState("35");

  const num = (set: (s: string) => void, max = 9) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(e.target.value.replace(/\D/g, "").slice(0, max));

  const r = useMemo(
    () =>
      computeAffordability({
        fixedIncome: Number(fixedIncome) || 0,
        variableIncome: Number(variableIncome) || 0,
        monthlyDebts: Number(monthlyDebts) || 0,
        propClass,
        loanCount,
        tenureYears: Number(tenure) || 0,
        age: Number(age) || 0,
      }),
    [fixedIncome, variableIncome, monthlyDebts, propClass, loanCount, tenure, age]
  );

  const cpfOrCash = Math.max(0, r.downpayment - r.minCashDownpayment);

  return (
    <div className="lp-panel" style={{ maxWidth: 660, margin: "-32px auto 0", padding: "26px 28px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18 }}>
        <div className="fld">
          <label className="fc-label">Fixed monthly income (S$)</label>
          <input className="fc-input" inputMode="numeric" value={fixedIncome} onChange={num(setFixedIncome)} placeholder="e.g. 8000" />
        </div>
        <div className="fld">
          <label className="fc-label">Variable income (S$)</label>
          <input className="fc-input" inputMode="numeric" value={variableIncome} onChange={num(setVariableIncome)} placeholder="commission, bonus, rent" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 4 }}>
        <div className="fld">
          <label className="fc-label">Existing monthly debts (S$)</label>
          <input className="fc-input" inputMode="numeric" value={monthlyDebts} onChange={num(setMonthlyDebts)} placeholder="car, loans, cards" />
        </div>
        <div className="fld">
          <label className="fc-label">Property type</label>
          <select className="fc-select" value={propClass} onChange={(e) => setPropClass(e.target.value as PropClass)}>
            {(Object.keys(CLASS_LABEL) as PropClass[]).map((k) => <option key={k} value={k}>{CLASS_LABEL[k]}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 4 }}>
        <div className="fld">
          <label className="fc-label">This loan is your</label>
          <select className="fc-select" value={loanCount} onChange={(e) => setLoanCount(Number(e.target.value) as LoanCount)}>
            {([1, 2, 3] as LoanCount[]).map((k) => <option key={k} value={k}>{COUNT_LABEL[k]}</option>)}
          </select>
        </div>
        <div className="fld">
          <label className="fc-label">Loan tenure (yrs)</label>
          <input className="fc-input" inputMode="numeric" value={tenure} onChange={num(setTenure, 2)} />
        </div>
        <div className="fld">
          <label className="fc-label">Your age</label>
          <input className="fc-input" inputMode="numeric" value={age} onChange={num(setAge, 2)} />
        </div>
      </div>

      <div className="fc-card fc-card--fill" style={{ marginTop: 20, padding: "20px 22px" }}>
        <div className="kicker">You could afford a property up to</div>
        <div className="serif tnum" style={{ fontSize: 40, fontWeight: 600, marginTop: 4 }}>{sgd(r.maxPropertyPrice)}</div>
        <div className="muted small" style={{ marginTop: 6 }}>
          Max loan {sgd(r.maxLoan)} at {Math.round(r.ltv * 100)}% LTV, {sgd(r.maxMonthlyRepayment)}/mo at the {Math.round(r.stressRate * 100)}% stress rate over {r.tenureYears} years. Limited by {r.bindingConstraint}.
        </div>

        <table style={{ width: "100%", marginTop: 14, fontSize: 13.5, borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderTop: "1px solid var(--line, #e6e9f2)" }}>
              <td style={{ padding: "7px 0", color: "var(--slate)" }}>Downpayment ({Math.round((1 - r.ltv) * 100)}%)</td>
              <td className="tnum" style={{ padding: "7px 0", textAlign: "right", fontWeight: 600 }}>{sgd(r.downpayment)}</td>
            </tr>
            <tr style={{ borderTop: "1px solid var(--line, #e6e9f2)" }}>
              <td style={{ padding: "7px 0", color: "var(--slate)" }}>&nbsp;&nbsp;of which minimum cash ({Math.round(r.minCashPct * 100)}%)</td>
              <td className="tnum" style={{ padding: "7px 0", textAlign: "right", fontWeight: 600 }}>{sgd(r.minCashDownpayment)}</td>
            </tr>
            <tr style={{ borderTop: "1px solid var(--line, #e6e9f2)" }}>
              <td style={{ padding: "7px 0", color: "var(--slate)" }}>&nbsp;&nbsp;balance (CPF OA or cash)</td>
              <td className="tnum" style={{ padding: "7px 0", textAlign: "right", fontWeight: 600 }}>{sgd(cpfOrCash)}</td>
            </tr>
          </tbody>
        </table>

        {r.usedLowerLtv && (
          <div className="fc-alert fc-alert--info" style={{ marginTop: 14, fontSize: 13 }}>
            A lower LTV applies because the loan runs past age 65 or beyond the standard tenure, so your downpayment is higher.
          </div>
        )}

        <Link href="/sell?utm_source=affordability_calculator" className="fc-btn fc-btn--primary fc-btn--block" style={{ marginTop: 18 }}>
          Selling first? Compare the agents who sell in your area
        </Link>
        <p className="muted small" style={{ marginTop: 10, textAlign: "center" }}>Free for sellers. No cut of your sale.</p>
      </div>

      <p className="muted small" style={{ marginTop: 16 }}>
        Estimate only, not a loan approval. Uses MAS rules verified on {MAS_RULES_VERIFIED_ON}: TDSR 55%, MSR 30% (HDB/EC), a {Math.round(STRESS_RATE_RESIDENTIAL * 100)}% medium-term rate floor, a 30% haircut on variable income, and{" "}
        <a href={MAS_LTV_URL} target="_blank" rel="noopener" style={{ color: "var(--blue)" }}>LTV limits</a>. Banks assess your full profile; see{" "}
        <a href={MAS_TDSR_URL} target="_blank" rel="noopener" style={{ color: "var(--blue)" }}>MAS TDSR</a>. Your actual monthly repayment at today&#39;s rate will differ from the stress-test figure.
      </p>
    </div>
  );
}
