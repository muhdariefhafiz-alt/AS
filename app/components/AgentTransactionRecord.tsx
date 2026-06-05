import Link from "next/link";
import { supabase } from "../lib/supabase";

// T1 "show the receipts": the agent's real transaction provenance from the CEA
// salesperson public register. A represented-side summary plus the most recent
// rows. This is the strongest trust signal for a data platform (every number is
// auditable) and adds deep, unique per-agent content for SEO/E-E-A-T. No price
// or address is stored or shown.

type Row = {
  month: string;
  property_type: string;
  transaction_type: string;
  represented: string | null;
  area: string | null;
};
type Rec = {
  total: number;
  sales: number;
  seller_sales: number;
  buyer_sales: number;
  rentals: number;
  recent: Row[] | null;
};

const MONTHS: Record<string, string> = {
  JAN: "Jan", FEB: "Feb", MAR: "Mar", APR: "Apr", MAY: "May", JUN: "Jun",
  JUL: "Jul", AUG: "Aug", SEP: "Sep", OCT: "Oct", NOV: "Nov", DEC: "Dec",
};
function fmtMonth(s: string): string {
  const [mo, yr] = (s || "").split("-");
  return MONTHS[mo] ? `${MONTHS[mo]} ${yr}` : s;
}
function titleCase(s: string): string {
  return (s || "").toLowerCase().replace(/(^|[\s/-])([a-z])/g, (_m, p, c) => p + c.toUpperCase());
}
function propLabel(p: string): string {
  const map: Record<string, string> = {
    HDB: "HDB",
    CONDOMINIUM_APARTMENTS: "Condo",
    EXECUTIVE_CONDOMINIUM: "EC",
    LANDED_PROPERTIES: "Landed",
  };
  return map[p] ?? titleCase(p);
}

const MIDX: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};
// Whole months between a MON-YYYY string and now. The recent[] rows are ordered
// newest-first, so recent[0].month is the agent's last recorded deal.
function monthsAgo(m: string | undefined): number | null {
  if (!m) return null;
  const [mo, yr] = m.split("-");
  if (MIDX[mo] == null || !yr) return null;
  const then = new Date(Date.UTC(Number(yr), MIDX[mo], 1));
  const now = new Date();
  return (now.getUTCFullYear() - then.getUTCFullYear()) * 12 + (now.getUTCMonth() - then.getUTCMonth());
}

const TH: React.CSSProperties = { textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "var(--slate)", whiteSpace: "nowrap" };
const TD: React.CSSProperties = { padding: "9px 12px", borderTop: "1px solid var(--line)", whiteSpace: "nowrap" };

export default async function AgentTransactionRecord({ cea, given }: { cea: string; given?: string }) {
  const { data } = await supabase.rpc("get_agent_txn_record", { p_reg: cea, p_lim: 60 });
  const rec = (data as Rec | null) ?? null;
  if (!rec || !rec.total) return null;

  const recent = rec.recent ?? [];
  const who = given || "This agent";
  const lastDeal = recent[0]?.month;
  const ago = monthsAgo(lastDeal);
  const dormant = ago != null && ago > 24; // 2 years: conservative, allows for the ~3-month data lag

  return (
    <section style={{ marginTop: 40 }}>
      <h2 style={{ fontSize: "clamp(22px,2.6vw,30px)" }}>Transaction record</h2>
      <p className="muted small" style={{ margin: "6px 0 0", maxWidth: "64ch" }}>
        Every deal below is from the CEA salesperson public register. No price or address is published in this record.{" "}
        <a
          href={`https://eservices.cea.gov.sg/aceas/public-register/sales/1/?registrationNumber=${encodeURIComponent(cea)}`}
          target="_blank"
          rel="noopener noreferrer nofollow"
          style={{ color: "var(--blue)", fontWeight: 600 }}
        >
          Verify {who === "This agent" ? "this agent" : who}&apos;s current CEA registration &#8599;
        </a>
      </p>

      <div className="fc-card fc-card--pad" style={{ marginTop: 16 }}>
        <div className="fc-grid-3" style={{ gap: 18 }}>
          <div>
            <div className="serif" style={{ fontSize: 30, fontWeight: 600, color: "var(--blue)" }}>{rec.seller_sales}</div>
            <div className="muted small">Sales representing the seller</div>
          </div>
          <div>
            <div className="serif" style={{ fontSize: 30, fontWeight: 600 }}>{rec.buyer_sales}</div>
            <div className="muted small">Sales representing the buyer</div>
          </div>
          <div>
            <div className="serif" style={{ fontSize: 30, fontWeight: 600 }}>{rec.rentals}</div>
            <div className="muted small">Rental transactions</div>
          </div>
        </div>
        {rec.sales > 0 && (
          <p className="muted small" style={{ marginTop: 12 }}>
            Selling a home? {who} represented the <strong>seller</strong> in {rec.seller_sales} of {rec.sales} recorded sales
            {rec.rentals > 0 ? `, alongside ${rec.rentals.toLocaleString()} rental deals` : ""}.
          </p>
        )}

        {lastDeal && (
          <div className="fc-row" style={{ gap: 10, marginTop: 14, alignItems: "center" }}>
            <span className="fc-badge fc-badge--source">Last recorded deal · {fmtMonth(lastDeal)}</span>
            {dormant && (
              <span className="fc-badge fc-badge--warn" title="Based on the public CEA transaction record">
                No transactions recorded in over 2 years
              </span>
            )}
          </div>
        )}

        <div style={{ overflowX: "auto", marginTop: 16, border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: "var(--cloud)" }}>
                <th style={TH}>Date</th>
                <th style={TH}>Type</th>
                <th style={TH}>Acting for</th>
                <th style={TH}>Property</th>
                <th style={TH}>Area</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => {
                const isSeller = r.represented === "SELLER";
                return (
                  <tr key={i}>
                    <td style={TD}>{fmtMonth(r.month)}</td>
                    <td style={TD}>{titleCase(r.transaction_type)}</td>
                    <td style={{ ...TD, fontWeight: isSeller ? 700 : 400, color: isSeller ? "var(--blue)" : "inherit" }}>
                      {r.represented ? titleCase(r.represented) : "—"}
                    </td>
                    <td style={TD}>{propLabel(r.property_type)}</td>
                    <td style={TD}>{r.area ? titleCase(r.area) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {rec.total > recent.length && (
          <p className="muted small" style={{ marginTop: 12 }}>
            Showing the {recent.length} most recent of {rec.total.toLocaleString()} recorded transactions.
          </p>
        )}
      </div>

      {/* T6 honest disclosure + T5 report-a-correction */}
      <p className="muted small" style={{ marginTop: 12, maxWidth: "70ch" }}>
        This record reflects transactions in the public CEA register. Off-market deals and very recent transactions may
        not appear yet, and government data is published with a lag. Spotted an error?{" "}
        <Link href="/contact" style={{ color: "var(--blue)", fontWeight: 600 }}>Report it</Link> and we will check it
        against the source.
      </p>
    </section>
  );
}
