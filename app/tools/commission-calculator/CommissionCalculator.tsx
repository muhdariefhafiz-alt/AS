"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Mode = "sale" | "rental";
type SaleType = "HDB" | "CONDO" | "LANDED" | "NEW_LAUNCH";

// Market-norm rates (NOT fixed by law; CEA states commission is negotiable).
// Mirrors /guides/property-agent-commission.
const SALE_DEFAULT_PCT: Record<SaleType, number> = {
  HDB: 1,
  CONDO: 2,
  LANDED: 2,
  NEW_LAUNCH: 0,
};

const SALE_LABEL: Record<SaleType, string> = {
  HDB: "HDB resale",
  CONDO: "Condo / apartment resale",
  LANDED: "Landed resale",
  NEW_LAUNCH: "New launch (developer sale)",
};

const GST_PCT = 9;

function sgd(n: number): string {
  return new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD", maximumFractionDigits: 0 }).format(Math.round(n));
}

export default function CommissionCalculator() {
  const [mode, setMode] = useState<Mode>("sale");

  // Sale state
  const [saleType, setSaleType] = useState<SaleType>("HDB");
  const [price, setPrice] = useState<string>("600000");
  const [ratePct, setRatePct] = useState<string>("1");

  // Rental state
  const [rent, setRent] = useState<string>("3500");
  const [months, setMonths] = useState<string>("1");

  const [gst, setGst] = useState<boolean>(false);

  function onPickSaleType(t: SaleType) {
    setSaleType(t);
    setRatePct(String(SALE_DEFAULT_PCT[t]));
  }

  const result = useMemo(() => {
    if (mode === "sale") {
      const p = Number(price) || 0;
      const r = Number(ratePct) || 0;
      const commission = p * (r / 100);
      const gstAmt = gst ? commission * (GST_PCT / 100) : 0;
      return { commission, gstAmt, total: commission + gstAmt };
    }
    const m = Number(rent) || 0;
    const mo = Number(months) || 0;
    const commission = m * mo;
    const gstAmt = gst ? commission * (GST_PCT / 100) : 0;
    return { commission, gstAmt, total: commission + gstAmt };
  }, [mode, price, ratePct, rent, months, gst]);

  const isNewLaunch = mode === "sale" && saleType === "NEW_LAUNCH";

  return (
    <div className="lp-panel" style={{ maxWidth: 640, margin: "-32px auto 0", padding: "26px 28px" }}>
      <div className="seg" style={{ marginBottom: 4 }}>
        <button type="button" className={"seg__btn" + (mode === "sale" ? " seg__btn--active" : "")} onClick={() => setMode("sale")}>
          Sale
        </button>
        <button type="button" className={"seg__btn" + (mode === "rental" ? " seg__btn--active" : "")} onClick={() => setMode("rental")}>
          Rental
        </button>
      </div>

      {mode === "sale" ? (
        <>
          <div className="fld">
            <label className="fc-label">Property type</label>
            <select className="fc-select" value={saleType} onChange={(e) => onPickSaleType(e.target.value as SaleType)}>
              {(Object.keys(SALE_LABEL) as SaleType[]).map((t) => (
                <option key={t} value={t}>{SALE_LABEL[t]}</option>
              ))}
            </select>
          </div>

          {isNewLaunch ? (
            <div className="fc-alert fc-alert--info" style={{ marginTop: 18 }}>
              For new launches, the developer pays the agent commission (typically 2 to 5%). Buyers usually pay no agent fee.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 4 }}>
              <div className="fld">
                <label className="fc-label">Sale price (S$)</label>
                <input className="fc-input" inputMode="numeric" value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="e.g. 600000" />
              </div>
              <div className="fld">
                <label className="fc-label">Commission rate (%)</label>
                <input className="fc-input" inputMode="decimal" value={ratePct}
                  onChange={(e) => setRatePct(e.target.value.replace(/[^\d.]/g, "").slice(0, 5))} />
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 4 }}>
          <div className="fld">
            <label className="fc-label">Monthly rent (S$)</label>
            <input className="fc-input" inputMode="numeric" value={rent}
              onChange={(e) => setRent(e.target.value.replace(/\D/g, "").slice(0, 7))} placeholder="e.g. 3500" />
          </div>
          <div className="fld">
            <label className="fc-label">Commission (months of rent)</label>
            <select className="fc-select" value={months} onChange={(e) => setMonths(e.target.value)}>
              <option value="0.5">0.5 month</option>
              <option value="1">1 month</option>
              <option value="2">2 months</option>
            </select>
          </div>
        </div>
      )}

      {!isNewLaunch && (
        <label className="fc-row" style={{ gap: 8, marginTop: 16, fontSize: 13.5 }}>
          <input type="checkbox" checked={gst} onChange={(e) => setGst(e.target.checked)} />
          <span className="muted">Add 9% GST (if the agency is GST-registered)</span>
        </label>
      )}

      {!isNewLaunch && (
        <div className="fc-card fc-card--fill" style={{ marginTop: 20, padding: "20px 22px" }}>
          <div className="kicker">Estimated agent commission</div>
          <div className="serif tnum" style={{ fontSize: 38, fontWeight: 600, marginTop: 4 }}>{sgd(result.total)}</div>
          <div className="muted small" style={{ marginTop: 6 }}>
            {sgd(result.commission)} commission{gst ? ` + ${sgd(result.gstAmt)} GST` : ""}
            {mode === "rental" ? " (months of rent)" : ` (${ratePct || 0}% of ${sgd(Number(price) || 0)})`}
          </div>
          <Link href={`/sell?utm_source=commission_calculator${mode === "sale" && saleType !== "NEW_LAUNCH" ? `&type=${saleType}` : ""}`}
            className="fc-btn fc-btn--primary fc-btn--block" style={{ marginTop: 18 }}>
            Compare agents who quote their own fee
          </Link>
          <p className="muted small" style={{ marginTop: 10, textAlign: "center" }}>
            Free for sellers. Each invited agent quotes their commission, so you compare real numbers.
          </p>
        </div>
      )}

      <p className="muted small" style={{ marginTop: 16 }}>
        Rates shown are Singapore market norms, not fixed by law. The Council for Estate Agencies states commission is negotiable. Always agree the rate in writing before signing an agency agreement. See the{" "}
        <Link href="/guides/property-agent-commission" style={{ color: "var(--blue)" }}>full commission guide</Link>.
      </p>
    </div>
  );
}
