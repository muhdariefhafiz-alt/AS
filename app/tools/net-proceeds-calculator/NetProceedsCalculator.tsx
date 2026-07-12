"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  computeNetProceeds,
  COMMISSION_DEFAULT_PCT,
  sgd,
  type SaleType,
} from "../../lib/net-proceeds";
import { RATES_VERIFIED_ON, IRAS_SSD_URL } from "../../lib/stamp-duty";

const TYPE_LABEL: Record<SaleType, string> = {
  HDB: "HDB flat",
  CONDO: "Condo / apartment",
  LANDED: "Landed",
  EC: "Executive condo",
};

export default function NetProceedsCalculator() {
  const [saleType, setSaleType] = useState<SaleType>("HDB");
  const [salePrice, setSalePrice] = useState("600000");
  const [commissionPct, setCommissionPct] = useState("1");
  const [gst, setGst] = useState(false);
  const [outstandingLoan, setOutstandingLoan] = useState("200000");
  const [cpfRefund, setCpfRefund] = useState("");
  const [legalFees, setLegalFees] = useState("2500");
  const [ssdOpen, setSsdOpen] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [saleDate, setSaleDate] = useState("");

  function onPickType(t: SaleType) {
    setSaleType(t);
    setCommissionPct(String(COMMISSION_DEFAULT_PCT[t]));
  }

  const r = useMemo(
    () =>
      computeNetProceeds({
        salePrice: Number(salePrice) || 0,
        commissionPct: Number(commissionPct) || 0,
        gst,
        outstandingLoan: Number(outstandingLoan) || 0,
        cpfRefund: Number(cpfRefund) || 0,
        legalFees: Number(legalFees) || 0,
        purchaseDate,
        saleDate,
      }),
    [salePrice, commissionPct, gst, outstandingLoan, cpfRefund, legalFees, purchaseDate, saleDate]
  );

  const num = (v: string, set: (s: string) => void, max = 12) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(e.target.value.replace(/\D/g, "").slice(0, max));

  return (
    <div className="lp-panel" style={{ maxWidth: 660, margin: "-32px auto 0", padding: "26px 28px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 4 }}>
        <div className="fld">
          <label className="fc-label">Property type</label>
          <select className="fc-select" value={saleType} onChange={(e) => onPickType(e.target.value as SaleType)}>
            {(Object.keys(TYPE_LABEL) as SaleType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABEL[t]}</option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label className="fc-label">Expected sale price (S$)</label>
          <input className="fc-input" inputMode="numeric" value={salePrice} onChange={num(salePrice, setSalePrice)} placeholder="e.g. 600000" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 4 }}>
        <div className="fld">
          <label className="fc-label">Agent commission (%)</label>
          <input className="fc-input" inputMode="decimal" value={commissionPct}
            onChange={(e) => setCommissionPct(e.target.value.replace(/[^\d.]/g, "").slice(0, 5))} />
        </div>
        <div className="fld">
          <label className="fc-label">Outstanding home loan (S$)</label>
          <input className="fc-input" inputMode="numeric" value={outstandingLoan} onChange={num(outstandingLoan, setOutstandingLoan)} placeholder="0" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 4 }}>
        <div className="fld">
          <label className="fc-label">CPF to refund (optional)</label>
          <input className="fc-input" inputMode="numeric" value={cpfRefund} onChange={num(cpfRefund, setCpfRefund)} placeholder="principal + accrued interest" />
        </div>
        <div className="fld">
          <label className="fc-label">Legal / conveyancing fees (S$)</label>
          <input className="fc-input" inputMode="numeric" value={legalFees} onChange={num(legalFees, setLegalFees, 7)} placeholder="e.g. 2500" />
        </div>
      </div>

      <label className="fc-row" style={{ gap: 8, marginTop: 14, fontSize: 13.5 }}>
        <input type="checkbox" checked={gst} onChange={(e) => setGst(e.target.checked)} />
        <span className="muted">Add 9% GST on commission (if the agency is GST-registered)</span>
      </label>

      <div style={{ marginTop: 12 }}>
        <button type="button" className="fc-btn fc-btn--ghost fc-btn--sm" onClick={() => setSsdOpen((v) => !v)}>
          {ssdOpen ? "Hide Seller's Stamp Duty" : "Add Seller's Stamp Duty (sold within holding period?)"}
        </button>
        {ssdOpen && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 10 }}>
            <div className="fld">
              <label className="fc-label">Date you bought it</label>
              <input className="fc-input" type="date" value={purchaseDate} max="2035-12-31" onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>
            <div className="fld">
              <label className="fc-label">Date you plan to sell</label>
              <input className="fc-input" type="date" value={saleDate} max="2035-12-31" onChange={(e) => setSaleDate(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      <div className="fc-card fc-card--fill" style={{ marginTop: 20, padding: "20px 22px" }}>
        <div className="kicker">Estimated cash in hand</div>
        <div className="serif tnum" style={{ fontSize: 38, fontWeight: 600, marginTop: 4, color: r.netProceeds < 0 ? "#b42318" : "var(--ink)" }}>
          {sgd(r.netProceeds)}
        </div>
        <div className="muted small" style={{ marginTop: 6 }}>
          {sgd(r.salePrice)} sale price minus {sgd(r.totalDeductions)} in costs and redemptions
        </div>

        <table style={{ width: "100%", marginTop: 14, fontSize: 13.5, borderCollapse: "collapse" }}>
          <tbody>
            {r.rows.map((row) => (
              <tr key={row.label} style={{ borderTop: "1px solid var(--line, #e6e9f2)" }}>
                <td style={{ padding: "7px 0", color: "var(--slate)" }}>
                  {row.label}{row.note ? <span className="muted small" style={{ display: "block" }}>{row.note}</span> : null}
                </td>
                <td className="tnum" style={{ padding: "7px 0", textAlign: "right", fontWeight: 600 }}>- {sgd(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <Link href={`/sell?utm_source=net_proceeds_calculator&type=${saleType === "EC" ? "EC" : saleType}`}
          className="fc-btn fc-btn--primary fc-btn--block" style={{ marginTop: 18 }}>
          Compare the agents who sell in your area
        </Link>
        <p className="muted small" style={{ marginTop: 10, textAlign: "center" }}>
          Free for sellers. Each shortlisted agent quotes their own commission, so your net could be higher.
        </p>
      </div>

      <p className="muted small" style={{ marginTop: 16 }}>
        Estimate only. Commission is a market norm, negotiable, not fixed by law. SSD is verified against{" "}
        <a href={IRAS_SSD_URL} target="_blank" rel="noopener" style={{ color: "var(--blue)" }}>IRAS</a> ({RATES_VERIFIED_ON}). CPF refund
        returns to your CPF Ordinary Account (it is not lost), but it reduces the cash you receive. Confirm exact figures with your conveyancing lawyer and CPF Board.
      </p>
    </div>
  );
}
