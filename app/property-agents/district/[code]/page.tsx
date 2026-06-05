import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { getDistrictMarketData } from "../../../lib/districtData";
import { formatPrice, formatPriceFull, formatPsf } from "../../../lib/narrativeHelpers";
import EmailCapture from "../../../components/EmailCapture";
import StickyMobileCta from "../../../components/StickyMobileCta";
import PostcodeBox from "../../../components/PostcodeBox";
import type { Metadata } from "next";

export const revalidate = 43200; // 12h; daily cron also force-revalidates
export const dynamicParams = false;
type Props = { params: Promise<{ code: string }> };

const DISTRICT_TO_BEST: Record<string, string> = {
  D01: "raffles-place-marina", D02: "chinatown-tanjong-pagar", D03: "queenstown-tiong-bahru",
  D04: "harbourfront-telok-blangah", D05: "clementi-west-coast", D06: "high-street",
  D07: "beach-road-golden-mile", D08: "little-india", D09: "orchard-river-valley",
  D10: "bukit-timah-holland", D11: "novena-thomson", D12: "balestier-toa-payoh",
  D13: "macpherson-braddell", D14: "geylang-eunos", D15: "katong-joo-chiat",
  D16: "bedok-east-coast", D17: "changi-loyang", D18: "tampines-pasir-ris",
  D19: "serangoon-hougang-punggol", D20: "bishan-ang-mo-kio", D21: "upper-bukit-timah",
  D22: "jurong", D23: "bukit-panjang-choa-chu-kang", D24: "lim-chu-kang",
  D25: "kranji-woodlands", D26: "upper-thomson", D27: "yishun-sembawang", D28: "seletar",
};

function pct(a: number, b: number) {
  if (!b) return { v: 0, d: "neutral" as const };
  const p = Math.round(((a - b) / b) * 100);
  return { v: Math.abs(p), d: p > 2 ? ("up" as const) : p < -2 ? ("down" as const) : ("neutral" as const) };
}

async function getWikipediaContext(name: string): Promise<string | null> {
  const area = name.split(",")[0].trim().replace(/\s+/g, "_");
  const searches = [`${area},_Singapore`, `${area}_(Singapore)`, `${area}_Road`, `${area}_planning_area`, area];
  for (const s of searches) {
    try {
      const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(s)}`, { cache: "force-cache" });
      if (!r.ok) continue;
      const d = await r.json();
      if (d.extract?.length > 50 && d.type !== "disambiguation") {
        const text = (d.extract as string).toLowerCase();
        if (text.includes("singapore") || text.includes("district") || text.includes("residential") || text.includes("mrt") || text.includes("hdb")) return d.extract;
      }
    } catch { continue; }
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const { data: district } = await supabase.from("sg_districts").select("code, name").eq("slug", code).single();
  if (!district) return {};
  const area = district.name.split(",")[0].trim();
  return {
    title: `Property Prices in ${area} (${district.code}) - Condo, Landed & Rental Analysis`,
    description: `${area} property market analysis. Condo and apartment prices, freehold vs leasehold comparison, floor-level premiums, rental yields, and top developments. Based on URA transaction data.`,
    alternates: { canonical: `https://fair-comparisons.com/property-agents/district/${code}` },
  };
}

export async function generateStaticParams() {
  const { data } = await supabase.from("sg_districts").select("slug").not("slug", "is", null);
  return (data ?? []).map((d) => ({ code: d.slug }));
}

const PlusIcon = () => (
  <svg className="ic" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
);

export default async function DistrictPage({ params }: Props) {
  const { code } = await params;
  const { data: district } = await supabase.from("sg_districts").select("*").eq("slug", code).single();
  if (!district) notFound();

  const area = district.name.split(",")[0].trim();
  const [data, wiki, allDistrictsRes] = await Promise.all([
    getDistrictMarketData(district.code),
    getWikipediaContext(district.name),
    supabase.from("sg_districts").select("code, name, slug").not("slug", "is", null).order("code"),
  ]);
  const allDistricts = allDistrictsRes.data ?? [];

  const vsSg = pct(data.medianPrice, data.sgMedianPrice);
  const condoTypes = data.propertyTypes.filter((t) => t.property_type === "Apartment" || t.property_type === "Condominium");
  const landedTypes = data.propertyTypes.filter((t) => ["Terrace", "Semi-detached", "Detached"].includes(t.property_type));
  const hasRental = data.rentalData.length >= 3;
  const freehold = data.tenureAnalysis.find((t) => t.tenure_type === "Freehold");
  const leasehold = data.tenureAnalysis.find((t) => t.tenure_type === "99-year Leasehold");
  const tenurePremium = freehold && leasehold ? pct(freehold.median_price, leasehold.median_price) : null;
  const floors = [...data.floorPremium].sort((a, b) => b.median_price - a.median_price);
  const highFloor = floors[0];
  const lowFloor = floors[floors.length - 1];
  const floorPrem = highFloor && lowFloor && floors.length >= 3 ? pct(highFloor.median_price, lowFloor.median_price) : null;
  const rentals = [...data.rentalData].sort((a, b) => b.avg_rent_psf - a.avg_rent_psf).slice(0, 5);
  const rentMax = rentals[0]?.avg_rent_psf || 1;
  const topProjects = data.topProjects.slice(0, 6);
  const bestSlug = DISTRICT_TO_BEST[district.code];
  const aboveAvg = vsSg.d === "up";
  const typeMedian = (name: string) => data.propertyTypes.find((t) => t.property_type === name)?.median_price ?? null;

  const schemas = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fair-comparisons.com" },
      { "@type": "ListItem", position: 2, name: `${district.code} ${area}`, item: `https://fair-comparisons.com/property-agents/district/${code}` },
    ]},
    { "@context": "https://schema.org", "@type": "Place", name: `${district.code} ${area}, Singapore`,
      address: { "@type": "PostalAddress", addressLocality: area, addressCountry: "SG" },
      ...(wiki && { description: wiki.slice(0, 300) }),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas).replace(/</g, "\\u003c") }} />

      {/* header */}
      <header className="fc-wrap" style={{ padding: "26px 40px 32px" }}>
        <div className="sr-crumb"><Link href="/">Home</Link> / {district.code} {area}</div>
        <div className="fc-row" style={{ gap: 10, marginTop: 18 }}>
          <span className="dpill">{district.code}</span>
          <span className="fc-badge fc-badge--ranked"><span className="dot" /> {aboveAvg ? "Above average market" : vsSg.d === "down" ? "Accessible market" : "Mid-range market"}</span>
        </div>
        <h1 style={{ margin: "18px 0 0", fontSize: "clamp(36px,5vw,60px)" }}>Property market in {area}</h1>
        <div className="kicker" style={{ marginTop: 10 }}>{district.code} · {district.name}</div>
        <p className="lede" style={{ maxWidth: "64ch", marginTop: 16 }}>
          An analysis of {data.totalTxns.toLocaleString()} private property transactions in {area}, covering condos, apartments and landed property. Prices, tenure splits, floor-level premiums, rental rates and top developments. All data from URA.
        </p>

        <div className="fc-grid-4" style={{ marginTop: 28, gap: 16 }}>
          <div className="fc-card fc-card--pad">
            <div className="statcap">Median condo price</div>
            <div className="statnum" style={{ marginTop: 6 }}>{formatPrice(data.medianPrice)}</div>
            {vsSg.d !== "neutral" && <div className="small" style={{ color: aboveAvg ? "var(--ok)" : "var(--slate)", fontWeight: 700, marginTop: 2 }}>{aboveAvg ? "▲" : "▼"} {vsSg.v}% vs national</div>}
          </div>
          <div className="fc-card fc-card--pad">
            <div className="statcap">Transactions</div>
            <div className="statnum" style={{ marginTop: 6 }}>{data.totalTxns.toLocaleString()}</div>
            <div className="small muted">URA records</div>
          </div>
          {data.avgRentPsf ? (
            <div className="fc-card fc-card--pad">
              <div className="statcap">Avg rent</div>
              <div className="statnum" style={{ marginTop: 6 }}>{formatPsf(data.avgRentPsf)}</div>
              <div className="small muted">psf per month</div>
            </div>
          ) : (
            <div className="fc-card fc-card--pad">
              <div className="statcap">Property types</div>
              <div className="statnum" style={{ marginTop: 6 }}>{data.propertyTypes.length}</div>
              <div className="small muted">categories</div>
            </div>
          )}
          <div className="fc-card fc-card--pad">
            <div className="statcap">Property types</div>
            <div className="statnum" style={{ marginTop: 6 }}>{data.propertyTypes.length}</div>
            <div className="small muted">{landedTypes.length > 0 ? "incl. landed" : "categories"}</div>
          </div>
        </div>

        {bestSlug && (
          <div className="fc-card fc-card--pad" style={{ marginTop: 18, background: "var(--ink)", color: "#fff", display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <svg className="fc-seal fc-seal--light" width="34" height="34" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="29.5" stroke="currentColor" strokeWidth="3" /><circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="2.4" strokeDasharray="1.6 4.3" opacity="0.42" /><path d="M21.5 33 l7.2 7.6 L44 23.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div className="serif" style={{ fontWeight: 600, fontSize: 21 }}>Selling a property in {area}?</div>
              <div className="small" style={{ color: "rgba(255,255,255,0.72)" }}>Get matched with the top agents who actually close in {district.code}. Free shortlist, no obligation.</div>
            </div>
            <div className="fc-row" style={{ gap: 10 }}>
              <Link href={`/sell?type=CONDO&district=${district.code}&utm_source=district`} className="fc-btn fc-btn--primary">Get my free shortlist</Link>
              <Link href={`/property-agents/best/${bestSlug}`} className="fc-btn fc-btn--ghost-light">See all top agents</Link>
            </div>
          </div>
        )}
      </header>

      <div className="fc-wrap" style={{ padding: "0 40px" }}><hr className="rule" /></div>

      <div className="fc-wrap" style={{ padding: "48px 40px 72px" }}>
        <div className="ap-layout">
          <main>
            <h2 style={{ fontSize: "clamp(24px,2.8vw,32px)" }}>What are property prices in {area} ({district.code})?</h2>
            <div className="prose" style={{ marginTop: 16 }}>
              <p>
                The median private residential property price in {area} is <strong>{formatPrice(data.medianPrice)}</strong>, based on {data.totalTxns.toLocaleString()} URA-recorded transactions.
                {freehold && leasehold && ` Freehold trades at ${formatPrice(freehold.median_price)} while 99-year leasehold costs ${formatPrice(leasehold.median_price)}${tenurePremium ? `, a ${tenurePremium.v}% tenure premium` : ""}.`}
                {data.avgRentPsf ? ` Average monthly rent is ${formatPsf(data.avgRentPsf)} psf.` : ""}
                {` ${area} sits ${vsSg.v}% ${aboveAvg ? "above" : vsSg.d === "down" ? "below" : "in line with"} the Singapore-wide median of ${formatPrice(data.sgMedianPrice)}.`}
                {topProjects[0] && ` The most actively traded development is ${topProjects[0].project}, with ${topProjects[0].txns} transactions.`}
              </p>
              {condoTypes[0] && (
                <p>
                  {district.code} spans {data.propertyTypes.length} property categories. {condoTypes[0].property_type === "Apartment" ? "Apartments" : "Condominiums"} lead with {condoTypes[0].txns.toLocaleString()} transactions at a median of {formatPrice(condoTypes[0].median_price)}.
                  {landedTypes.length > 0 && ` Landed is active too: ${landedTypes.map((t) => `${t.property_type.toLowerCase()} at ${formatPrice(t.median_price)}`).join(", ")}.`}
                </p>
              )}
            </div>

            {freehold && leasehold && (
              <>
                <h2 style={{ fontSize: "clamp(24px,2.8vw,32px)", marginTop: 48 }}>Freehold vs leasehold</h2>
                <p className="prose" style={{ marginTop: 14, color: "#39425e" }}>
                  Tenure is a defining factor in {area}&apos;s pricing.{tenurePremium ? ` Freehold trades at a ${tenurePremium.v}% premium, roughly ${formatPrice(Math.abs(freehold.median_price - leasehold.median_price))} more in absolute terms.` : ""} Freehold transactions number {freehold.txns.toLocaleString()} to leasehold&apos;s {leasehold.txns.toLocaleString()}.
                </p>
                <div className="fc-grid-3" style={{ marginTop: 18, gap: 16 }}>
                  {data.tenureAnalysis.slice(0, 3).map((t) => (
                    <div key={t.tenure_type} className="fc-card fc-card--pad">
                      <div className="statcap">{t.tenure_type}</div>
                      <div className="statnum" style={{ marginTop: 6 }}>{formatPrice(t.median_price)}</div>
                      <div className="small muted">{t.txns.toLocaleString()} txns{t.price_per_sqm ? ` · ${formatPrice(t.price_per_sqm)}/sqm` : ""}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {floorPrem && (
              <>
                <h2 style={{ fontSize: "clamp(24px,2.8vw,32px)", marginTop: 48 }}>Floor-level pricing</h2>
                <p className="prose" style={{ marginTop: 14, color: "#39425e" }}>
                  For condos and apartments, floor level creates a measurable price gradient. Units on {highFloor.floor_range} sell for a median of {formatPrice(highFloor.median_price)}, while {lowFloor.floor_range} sell for {formatPrice(lowFloor.median_price)}, a {floorPrem.v}% premium worth roughly {formatPrice(Math.abs(highFloor.median_price - lowFloor.median_price))} per unit.
                </p>
                <div className="fc-card fc-card--pad" style={{ marginTop: 18 }}>
                  {floors.map((f) => (
                    <div className="bar" key={f.floor_range}>
                      <span className="bar__lab">{f.floor_range}</span>
                      <div className="bar__track"><div className="bar__fill" style={{ width: `${Math.round((f.median_price / highFloor.median_price) * 100)}%` }} /></div>
                      <span className="bar__val">{formatPrice(f.median_price)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {hasRental && (
              <>
                <h2 style={{ fontSize: "clamp(24px,2.8vw,32px)", marginTop: 48 }}>Rental market</h2>
                <p className="prose" style={{ marginTop: 14, color: "#39425e" }}>
                  Rents average {formatPsf(data.avgRentPsf)} psf per month. Across the most-rented developments the range runs from {formatPsf(rentals[rentals.length - 1].avg_rent_psf)} to {formatPsf(rentals[0].avg_rent_psf)} psf.
                </p>
                <div className="fc-card fc-card--pad" style={{ marginTop: 18 }}>
                  {rentals.map((r) => (
                    <div className="bar" key={r.project}>
                      <span className="bar__lab" style={{ width: "auto", minWidth: 130 }}>{r.project}</span>
                      <div className="bar__track"><div className="bar__fill" style={{ width: `${Math.max(40, Math.round((r.avg_rent_psf / rentMax) * 100))}%` }} /></div>
                      <span className="bar__val">{formatPsf(r.avg_rent_psf)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {topProjects.length > 0 && (
              <>
                <h2 style={{ fontSize: "clamp(24px,2.8vw,32px)", marginTop: 48 }}>Most traded developments</h2>
                <p className="prose" style={{ marginTop: 14, color: "#39425e" }}>
                  High transaction volume signals an active secondary market with good liquidity. Buyers who may sell within a few years should weight proven resale activity.
                </p>
                <div className="fc-card fc-card--pad" style={{ marginTop: 18, padding: "6px 24px 12px" }}>
                  {topProjects.map((p, i) => (
                    <div className="dev" key={p.project}>
                      <span className="dev__pos">{String(i + 1).padStart(2, "0")}</span>
                      <div style={{ flex: 1 }}>
                        <div className="dev__name">{p.project}</div>
                        {p.street && <div className="dev__road">{p.street}</div>}
                      </div>
                      <span className="dev__price">{formatPrice(p.median_price)}</span>
                      <span className="dev__txns">{p.txns} txns</span>
                    </div>
                  ))}
                </div>
                <div className="fc-badge fc-badge--source" style={{ marginTop: 16 }}>Source · URA private residential transactions &amp; median rental data</div>
              </>
            )}

            <h2 style={{ fontSize: "clamp(24px,2.8vw,32px)", marginTop: 48 }}>What this means for buyers</h2>
            <div className="fc-grid-2" style={{ marginTop: 18, gap: 16 }}>
              <div className="fc-card fc-card--pad">
                <div className="kicker" style={{ color: "var(--blue)" }}>Position</div>
                <p className="small" style={{ margin: "8px 0 0" }}>At {formatPrice(data.medianPrice)}, {area} sits {aboveAvg ? "above" : "around"} the Singapore private-market median. You get {aboveAvg ? "established character and access" : "value and access"} relative to prime districts.</p>
              </div>
              {floorPrem && (
                <div className="fc-card fc-card--pad">
                  <div className="kicker" style={{ color: "var(--blue)" }}>Floor matters</div>
                  <p className="small" style={{ margin: "8px 0 0" }}>High floors cost {floorPrem.v}% more than low floors. Budget-conscious buyers can save around {formatPrice(Math.abs(highFloor.median_price - lowFloor.median_price))} by choosing a lower floor in the same development.</p>
                </div>
              )}
            </div>

            <h2 style={{ fontSize: "clamp(24px,2.8vw,32px)", marginTop: 48 }}>Frequently asked questions</h2>
            <div style={{ marginTop: 16 }}>
              <details className="faq"><summary>What is the average condo price in {area} ({district.code})?<PlusIcon /></summary><p>The median condominium and apartment price is {formatPrice(data.medianPrice)}, based on {data.totalTxns.toLocaleString()} URA-recorded transactions. Prices range widely depending on unit size, tenure and development.</p></details>
              <details className="faq"><summary>How many property transactions were recorded in {area}?<PlusIcon /></summary><p>URA records show {data.totalTxns.toLocaleString()} private residential transactions in {district.code}, covering apartments, condominiums and landed properties.</p></details>
              {topProjects.length >= 3 && <details className="faq"><summary>What are the most popular developments in {area}?<PlusIcon /></summary><p>By URA transaction volume: {topProjects.slice(0, 3).map((p) => `${p.project} (${p.txns} transactions, median ${formatPriceFull(p.median_price)})`).join(", ")}.</p></details>}
              <details className="faq"><summary>What types of property are available in {area}?<PlusIcon /></summary><p>{data.propertyTypes.length} categories with recorded transactions: {data.propertyTypes.map((t) => t.property_type.toLowerCase()).join(", ")}.{condoTypes[0] && ` ${condoTypes[0].property_type === "Apartment" ? "Apartments" : "Condominiums"} are the largest segment at ${condoTypes[0].txns.toLocaleString()} transactions.`}</p></details>
            </div>

            {bestSlug && (
              <div className="fc-card fc-card--pad" style={{ marginTop: 32, background: "var(--cloud)", display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div className="serif" style={{ fontWeight: 600, fontSize: 20 }}>Looking for a property agent in {area}?</div>
                  <p className="small muted" style={{ margin: "6px 0 0" }}>We ranked the top-performing agents in {district.code} on transaction records, area expertise and verified reviews.</p>
                </div>
                <Link href={`/property-agents/best/${bestSlug}`} className="fc-btn fc-btn--ink">View best agents in {area}</Link>
              </div>
            )}
          </main>

          <aside>
            <div className="ap-side">
              <div className="fc-card fc-card--pad" style={{ background: "var(--ink)", color: "#fff" }}>
                <div className="kicker" style={{ color: "var(--slate-2)" }}>Quick answer</div>
                <p className="small" style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.82)" }}>
                  A typical condo in {area} costs around <strong style={{ color: "#fff" }}>{formatPrice(data.medianPrice)}</strong>.
                  {freehold && leasehold && ` Freehold ${formatPrice(freehold.median_price)}, leasehold ${formatPrice(leasehold.median_price)}.`}
                  {data.avgRentPsf ? ` Average rent ${formatPsf(data.avgRentPsf)} psf per month.` : ""}
                </p>
              </div>

              {data.propertyTypes.length > 0 && (
                <div className="fc-card fc-card--pad">
                  <div className="kicker">Prices by type</div>
                  <div style={{ marginTop: 10 }}>
                    {["Apartment", "Condominium", "Terrace", "Semi-detached", "Detached"].map((name) => {
                      const m = typeMedian(name);
                      return m ? <div className="typerow" key={name}><span>{name}</span><strong className="tnum">{formatPrice(m)}</strong></div> : null;
                    })}
                  </div>
                </div>
              )}

              <div className="fc-card fc-card--pad">
                <div className="kicker">Vs Singapore average</div>
                <div className="statnum" style={{ marginTop: 8 }}>{formatPrice(data.medianPrice)}</div>
                {vsSg.d !== "neutral" && <p className="small" style={{ margin: "4px 0 0", color: aboveAvg ? "var(--ok)" : "var(--slate)", fontWeight: 700 }}>{vsSg.v}% {aboveAvg ? "above" : "below"} national median of {formatPrice(data.sgMedianPrice)}</p>}
              </div>

              <div className="fc-card fc-card--pad">
                <EmailCapture variant="sidebar" source="district" pagePath={`/property-agents/district/${code}`} districtTag={district.code} heading="District price alerts" description={`Get notified when new market data is available for ${area}.`} />
              </div>

              <div className="fc-card fc-card--pad">
                <div className="kicker">Free tools</div>
                <div className="fc-col" style={{ gap: 6, marginTop: 10 }}>
                  <Link href="/tools/valuation" className="small" style={{ fontWeight: 600 }}>What is my home worth? ›</Link>
                  <Link href="/tools/mop-tracker" className="small" style={{ fontWeight: 600 }}>HDB MOP tracker ›</Link>
                  <Link href="/sell" className="small" style={{ fontWeight: 600 }}>Get an agent shortlist ›</Link>
                </div>
              </div>

              {allDistricts.length > 0 && (
                <div className="fc-card fc-card--pad">
                  <div className="kicker">Other districts</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginTop: 12 }}>
                    {allDistricts.filter((d) => d.slug !== code).slice(0, 15).map((d) => (
                      <Link key={d.code} href={`/property-agents/district/${d.slug}`} className="dchip">{d.code}</Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <section className="fc-section fc-section--dark">
        <div className="fc-wrap" style={{ textAlign: "center" }}>
          <h2 style={{ color: "#fff" }}>Selling in {area}?</h2>
          <p className="lede" style={{ margin: "12px auto 20px", textAlign: "center" }}>
            Enter your postal code for a free shortlist of the agents who actually sell here.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <PostcodeBox source="district_postcode" />
          </div>
        </div>
      </section>
      <StickyMobileCta href={`/sell?type=CONDO&district=${district.code}&utm_source=district_sticky`} />
    </>
  );
}
