"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  computeBSD,
  computeABSD,
  bsdBreakdown,
  absdRate,
  computeSSD,
  ssdScheduleFor,
  ssdTable,
  sgd,
  RATES_VERIFIED_ON,
  IRAS_BSD_URL,
  IRAS_ABSD_URL,
  IRAS_SSD_URL,
  type PropertyNature,
  type BuyerProfile,
  type PropertyOrder,
} from "../../lib/stamp-duty";

type Mode = "buy" | "sell";

const PROFILE_LABEL: Record<BuyerProfile, string> = {
  SC: "Singapore Citizen",
  SPR: "Singapore PR",
  FOREIGNER: "Foreigner",
  ENTITY: "Entity / company",
};
const ORDER_LABEL: Record<PropertyOrder, string> = {
  1: "1st residential property",
  2: "2nd residential property",
  3: "3rd or subsequent",
};

export default function StampDutyCalculator() {
  const [mode, setMode] = useState<Mode>("buy");

  // Buy state
  const [price, setPrice] = useState("1500000");
  const [nature, setNature] = useState<PropertyNature>("residential");
  const [profile, setProfile] = useState<BuyerProfile>("SC");
  const [order, setOrder] = useState<PropertyOrder>(1);

  // Sell state
  const [salePrice, setSalePrice] = useState("1500000");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [saleDate, setSaleDate] = useState("");

  const isResidential = nature === "residential";

  const buy = useMemo(() => {
    const p = Number(price) || 0;
    const bsd = computeBSD(p, nature);
    const absd = isResidential ? computeABSD(p, profile, order) : 0;
    return { p, bsd, absd, total: bsd + absd, rows: bsdBreakdown(p, nature) };
  }, [price, nature, profile, order, isResidential]);

  const sell = useMemo(() => {
    const p = Number(salePrice) || 0;
    const res = computeSSD(p, purchaseDate, saleDate);
    const schedule = ssdScheduleFor(purchaseDate);
    return { p, res, schedule, table: ssdTable(schedule) };
  }, [salePrice, purchaseDate, saleDate]);

  return (
    <div className="lp-panel" style={{ maxWidth: 660, margin: "-32px auto 0", padding: "26px 28px" }}>
      <div className="seg" style={{ marginBottom: 4 }}>
        <button type="button" className={"seg__btn" + (mode === "buy" ? " seg__btn--active" : "")} onClick={() => setMode("buy")}>
          Buying (BSD + ABSD)
        </button>
        <button type="button" className={"seg__btn" + (mode === "sell" ? " seg__btn--active" : "")} onClick={() => setMode("sell")}>
          Selling (SSD)
        </button>
      </div>

      {mode === "buy" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 4 }}>
            <div className="fld">
              <label className="fc-label">Purchase price (S$)</label>
              <input className="fc-input" inputMode="numeric" value={price}
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="e.g. 1500000" />
            </div>
            <div className="fld">
              <label className="fc-label">Property type</label>
              <select className="fc-select" value={nature} onChange={(e) => setNature(e.target.value as PropertyNature)}>
                <option value="residential">Residential (HDB, condo, landed)</option>
                <option value="non_residential">Non-residential (commercial)</option>
              </select>
            </div>
          </div>

          {isResidential && (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 4 }}>
              <div className="fld">
                <label className="fc-label">Buyer profile</label>
                <select className="fc-select" value={profile} onChange={(e) => setProfile(e.target.value as BuyerProfile)}>
                  {(Object.keys(PROFILE_LABEL) as BuyerProfile[]).map((k) => (
                    <option key={k} value={k}>{PROFILE_LABEL[k]}</option>
                  ))}
                </select>
              </div>
              <div className="fld">
                <label className="fc-label">Which property is this?</label>
                <select className="fc-select" value={order}
                  onChange={(e) => setOrder(Number(e.target.value) as PropertyOrder)}
                  disabled={profile === "FOREIGNER" || profile === "ENTITY"}>
                  {([1, 2, 3] as PropertyOrder[]).map((k) => (
                    <option key={k} value={k}>{ORDER_LABEL[k]}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {!isResidential && (
            <div className="fc-alert fc-alert--info" style={{ marginTop: 16 }}>
              ABSD applies to residential property only, so non-residential purchases pay BSD alone.
            </div>
          )}

          <div className="fc-card fc-card--fill" style={{ marginTop: 20, padding: "20px 22px" }}>
            <div className="kicker">Total stamp duty on purchase</div>
            <div className="serif tnum" style={{ fontSize: 38, fontWeight: 600, marginTop: 4 }}>{sgd(buy.total)}</div>
            <div className="muted small" style={{ marginTop: 6 }}>
              {sgd(buy.bsd)} BSD{isResidential ? ` + ${sgd(buy.absd)} ABSD` : ""}
              {isResidential && buy.absd > 0 ? ` (${Math.round(absdRate(profile, order) * 100)}% ABSD)` : ""}
            </div>

            <details style={{ marginTop: 14 }}>
              <summary className="mono" style={{ cursor: "pointer", fontSize: 12.5, color: "var(--slate)" }}>
                Show the BSD working
              </summary>
              <table style={{ width: "100%", marginTop: 10, fontSize: 13, borderCollapse: "collapse" }}>
                <tbody>
                  {buy.rows.map((r) => (
                    <tr key={r.band} style={{ borderTop: "1px solid var(--line, #e6e9f2)" }}>
                      <td style={{ padding: "6px 0", color: "var(--slate)" }}>{r.band}</td>
                      <td style={{ padding: "6px 0", textAlign: "center", color: "var(--slate)" }}>{Math.round(r.rate * 100)}%</td>
                      <td className="tnum" style={{ padding: "6px 0", textAlign: "right", fontWeight: 600 }}>{sgd(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>

            <Link href="/sell?utm_source=stamp_duty_calculator"
              className="fc-btn fc-btn--primary fc-btn--block" style={{ marginTop: 18 }}>
              Compare the agents who sell in your area
            </Link>
            <p className="muted small" style={{ marginTop: 10, textAlign: "center" }}>
              Free for sellers. No cut of your sale, no paid placement.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="fld" style={{ marginTop: 4 }}>
            <label className="fc-label">Sale price (S$)</label>
            <input className="fc-input" inputMode="numeric" value={salePrice}
              onChange={(e) => setSalePrice(e.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="e.g. 1500000" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 4 }}>
            <div className="fld">
              <label className="fc-label">Date you bought it</label>
              <input className="fc-input" type="date" value={purchaseDate} max="2035-12-31"
                onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>
            <div className="fld">
              <label className="fc-label">Date you plan to sell</label>
              <input className="fc-input" type="date" value={saleDate} max="2035-12-31"
                onChange={(e) => setSaleDate(e.target.value)} />
            </div>
          </div>

          <div className="fc-card fc-card--fill" style={{ marginTop: 20, padding: "20px 22px" }}>
            <div className="kicker">Seller&#39;s Stamp Duty (SSD)</div>
            {!purchaseDate || !saleDate ? (
              <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>
                Enter the date you bought and the date you plan to sell to see whether SSD applies.
              </p>
            ) : sell.schedule === "none" ? (
              <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>
                A property bought before 11 Mar 2017 is past every SSD holding window, so no SSD is payable.
              </p>
            ) : (
              <>
                <div className="serif tnum" style={{ fontSize: 38, fontWeight: 600, marginTop: 4 }}>
                  {sell.res.liable ? sgd(sell.res.duty) : "No SSD"}
                </div>
                <div className="muted small" style={{ marginTop: 6 }}>
                  {sell.res.tierLabel}
                  {sell.res.liable ? ` · ${Math.round(sell.res.rate * 100)}% of ${sgd(sell.p)}` : " · held beyond the SSD window"}
                </div>
              </>
            )}

            {purchaseDate && sell.schedule !== "none" && (
              <details style={{ marginTop: 14 }}>
                <summary className="mono" style={{ cursor: "pointer", fontSize: 12.5, color: "var(--slate)" }}>
                  Show the full SSD schedule ({sell.schedule === "current" ? "bought on/after 4 Jul 2025" : "bought 11 Mar 2017 to 3 Jul 2025"})
                </summary>
                <table style={{ width: "100%", marginTop: 10, fontSize: 13, borderCollapse: "collapse" }}>
                  <tbody>
                    {sell.table.map((r) => (
                      <tr key={r.label} style={{ borderTop: "1px solid var(--line, #e6e9f2)" }}>
                        <td style={{ padding: "6px 0", color: "var(--slate)" }}>{r.label}</td>
                        <td className="tnum" style={{ padding: "6px 0", textAlign: "right", fontWeight: 600 }}>
                          {r.rate > 0 ? `${Math.round(r.rate * 100)}%` : "No SSD"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}

            <Link href="/sell?utm_source=stamp_duty_calculator_ssd"
              className="fc-btn fc-btn--primary fc-btn--block" style={{ marginTop: 18 }}>
              Compare the agents who sell in your area
            </Link>
            <p className="muted small" style={{ marginTop: 10, textAlign: "center" }}>
              Free for sellers. Each shortlisted agent quotes their own fee.
            </p>
          </div>
        </>
      )}

      <p className="muted small" style={{ marginTop: 16 }}>
        Estimates only, for the higher of price or market value. Rates verified against IRAS on {RATES_VERIFIED_ON}. Always confirm with{" "}
        <a href={mode === "buy" ? IRAS_BSD_URL : IRAS_SSD_URL} target="_blank" rel="noopener" style={{ color: "var(--blue)" }}>IRAS</a>
        {mode === "buy" ? (
          <>
            {" "}(<a href={IRAS_ABSD_URL} target="_blank" rel="noopener" style={{ color: "var(--blue)" }}>ABSD rates</a>)
          </>
        ) : null}. This tool does not account for reliefs, remissions or refunds.
      </p>
    </div>
  );
}
