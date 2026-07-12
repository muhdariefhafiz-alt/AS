import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { titleName, cleanAgency } from "../../../../lib/names";

export const revalidate = 86400;

// Personal shareable report: not indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

const DISTRICTS: Record<string, string> = {
  "1": "Raffles Place / Marina", "2": "Tanjong Pagar / Anson", "3": "Tiong Bahru / Queenstown",
  "4": "Sentosa / Harbourfront", "5": "Clementi / West Coast", "6": "City Hall / Clarke Quay",
  "7": "Bugis / Beach Road", "8": "Little India / Farrer Park", "9": "Orchard / River Valley",
  "10": "Bukit Timah / Holland", "11": "Novena / Newton", "12": "Balestier / Toa Payoh",
  "13": "Macpherson / Potong Pasir", "14": "Geylang / Eunos", "15": "Katong / Marine Parade",
  "16": "Bedok / Upper East Coast", "17": "Changi / Loyang", "18": "Tampines / Pasir Ris",
  "19": "Serangoon / Hougang / Punggol", "20": "Ang Mo Kio / Bishan", "21": "Upper Bukit Timah",
  "22": "Jurong / Boon Lay", "23": "Bukit Panjang / Choa Chu Kang", "24": "Lim Chu Kang / Tengah",
  "25": "Kranji / Woodgrove", "26": "Upper Thomson / Springleaf", "27": "Yishun / Sembawang",
  "28": "Seletar / Yio Chu Kang",
};

type Sale = { kind: string; title: string; subtitle: string; price: number | null; event_date: string };

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function money(n: number | null): string {
  if (n == null) return "";
  return n >= 1_000_000 ? `S$${(n / 1_000_000).toFixed(2)}M` : `S$${Math.round(n / 1000)}K`;
}
function fmtMonth(iso: string): string {
  const m = iso?.match(/^(\d{4})-(\d{2})/);
  return m ? `${MONTHS[Number(m[2])]} ${m[1]}` : "";
}
function areaLabel(type: string, key: string): string {
  if (type === "town") return key.split("/")[0].toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return `District ${key}${DISTRICTS[key] ? ` (${DISTRICTS[key]})` : ""}`;
}
function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default async function SellerReportPage({
  params,
}: {
  params: Promise<{ agent: string; type: string; key: string }>;
}) {
  const { agent: agentSlug, type, key } = await params;
  if (type !== "town" && type !== "district") notFound();
  const areaKey = decodeURIComponent(key).toUpperCase();

  const { data: agent } = await supabase
    .from("sg_agents")
    .select("name, agency_name, slug, cea_registration, score, photo_url, photo_status, primary_area, claimed")
    .eq("slug", agentSlug)
    .maybeSingle();
  if (!agent) notFound();

  const { data: salesRaw } = await supabase.rpc("area_recent_sales", { p_type: type, p_key: areaKey, p_limit: 40 });
  const sales: Sale[] = (salesRaw as Sale[] | null) ?? [];

  const prices = sales.map((s) => Number(s.price)).filter((n) => n > 0).sort((a, b) => a - b);
  const median = prices.length ? prices[Math.floor(prices.length / 2)] : null;
  const latest = sales[0]?.event_date ? fmtMonth(sales[0].event_date) : "";
  const name = titleName(agent.name);
  const agency = cleanAgency(agent.agency_name);
  const area = areaLabel(type, areaKey);
  const score = agent.score != null ? Math.round(Number(agent.score)) : null;
  const showPhoto = agent.photo_url && agent.photo_status === "approved";
  const isHdb = type === "town";

  return (
    <div style={{ background: "var(--paper, #f7f8fb)", minHeight: "100vh" }}>
      <div className="fc-wrap" style={{ maxWidth: 780, padding: "32px 24px 64px" }}>
        {/* Agent header */}
        <div className="fc-card fc-card--pad" style={{ background: "#fff" }}>
          <div className="fc-row" style={{ gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            {showPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agent.photo_url as string} alt={name} width={64} height={64}
                style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--blue-wash, #eef2ff)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 22, flexShrink: 0 }}>
                {initials(name)}
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="serif" style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>{name}</div>
              <div className="muted small" style={{ marginTop: 2 }}>{agency} · CEA {agent.cea_registration}</div>
            </div>
            {score != null && (
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div className="serif" style={{ fontSize: 26, fontWeight: 700, color: "var(--blue-deep)" }}>{score}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--slate)", letterSpacing: "0.05em" }}>AGENTSCORE</div>
              </div>
            )}
          </div>
        </div>

        {/* Report title */}
        <div style={{ marginTop: 24 }}>
          <p className="kicker" style={{ color: "var(--blue-deep)" }}>Market report, prepared for you</p>
          <h1 className="serif" style={{ fontSize: "clamp(26px,4vw,36px)", fontWeight: 600, margin: "6px 0 0", color: "var(--ink)" }}>
            What&#39;s selling in {area}
          </h1>
          <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>
            A snapshot of recent {isHdb ? "HDB resale" : "private"} activity near you, from official {isHdb ? "HDB" : "URA"} transaction records.
          </p>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginTop: 20 }}>
          <div className="fc-card fc-card--pad" style={{ background: "#fff" }}>
            <div className="kicker">Recent transactions</div>
            <div className="serif tnum" style={{ fontSize: 28, fontWeight: 600, marginTop: 2 }}>{sales.length}</div>
            <div className="muted small">latest deals on record</div>
          </div>
          <div className="fc-card fc-card--pad" style={{ background: "#fff" }}>
            <div className="kicker">Median price</div>
            <div className="serif tnum" style={{ fontSize: 28, fontWeight: 600, marginTop: 2 }}>{median != null ? money(median) : "—"}</div>
            <div className="muted small">across these deals</div>
          </div>
          <div className="fc-card fc-card--pad" style={{ background: "#fff" }}>
            <div className="kicker">Most recent</div>
            <div className="serif tnum" style={{ fontSize: 28, fontWeight: 600, marginTop: 2 }}>{latest || "—"}</div>
            <div className="muted small">last transaction</div>
          </div>
        </div>

        {/* Recent sales */}
        {sales.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h2 className="serif" style={{ fontSize: 18, fontWeight: 600 }}>Recent sales near you</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "flex", flexDirection: "column", gap: 8 }}>
              {sales.slice(0, 8).map((s, i) => (
                <li key={i} className="fc-card" style={{ padding: "12px 16px", background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>{s.title}</div>
                    <div className="muted small">{s.subtitle} · {fmtMonth(s.event_date)}</div>
                  </div>
                  <div className="serif" style={{ fontWeight: 600, fontSize: 15.5, whiteSpace: "nowrap" }}>{money(s.price)}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div className="fc-card fc-card--pad" style={{ marginTop: 28, background: "var(--ink)", color: "#fff" }}>
          <h2 className="serif" style={{ fontSize: 22, fontWeight: 600, color: "#fff", margin: 0 }}>Thinking of selling in {area}?</h2>
          <p style={{ marginTop: 8, color: "rgba(255,255,255,0.75)", fontSize: 15, lineHeight: 1.6 }}>
            {name} can give you a free, no-obligation valuation and a plan to get the best price, based on exactly these records.
          </p>
          <Link href={`/sell?agent=${agent.slug}&utm_source=seller_report`} className="fc-btn fc-btn--primary fc-btn--lg" style={{ marginTop: 16 }}>
            Get my free valuation
          </Link>
        </div>

        {/* Footer */}
        <p className="muted small" style={{ marginTop: 24, textAlign: "center" }}>
          Prepared by {name}, {agency}. Data from official {isHdb ? "HDB resale" : "URA caveat"} records via{" "}
          <Link href="/?utm_source=seller_report" style={{ color: "var(--blue)" }}>FairComparisons</Link>. Figures are recent transactions, not a valuation of any specific home.
        </p>
      </div>
    </div>
  );
}
