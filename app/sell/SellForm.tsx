"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PropertyType = "HDB" | "CONDO" | "LANDED" | "EC";

type PinnedAgent = { id: number; name: string; agency: string };

type Props = {
  hdbTowns: string[];
  districts: { code: string; name: string }[];
  initialPropertyType?: PropertyType;
  initialTown?: string;
  initialDistrictCode?: string;
  pinnedAgent?: PinnedAgent | null;
};

const TIMELINES: { value: string; label: string }[] = [
  { value: "asap", label: "ASAP" },
  { value: "1_3m", label: "1–3 months" },
  { value: "3_6m", label: "3–6 months" },
  { value: "6_12m", label: "6–12 months" },
  { value: "exploring", label: "Just exploring" },
];

const REASONS: { value: string; label: string }[] = [
  { value: "upgrade", label: "Upgrading" },
  { value: "downsize", label: "Downsizing" },
  { value: "relocate", label: "Relocating" },
  { value: "investment", label: "Investment exit" },
  { value: "other", label: "Other" },
];

const MOP_STATUSES = [
  { value: "past_mop", label: "Past MOP (eligible to sell)" },
  { value: "before_mop", label: "Before MOP" },
  { value: "unknown", label: "Not sure" },
];

export default function SellForm({
  hdbTowns,
  districts,
  initialPropertyType = "HDB",
  initialTown = "",
  initialDistrictCode = "",
  pinnedAgent = null,
}: Props) {
  const router = useRouter();

  const [propertyType, setPropertyType] = useState<PropertyType>(initialPropertyType);
  const [town, setTown] = useState<string>(initialTown);
  const [districtCode, setDistrictCode] = useState<string>(initialDistrictCode);
  const [bedrooms, setBedrooms] = useState<string>("");
  const [postalCode, setPostalCode] = useState<string>("");
  const [addressLine, setAddressLine] = useState<string>("");
  const [estValue, setEstValue] = useState<string>("");
  const [timeline, setTimeline] = useState<string>("3_6m");
  const [reason, setReason] = useState<string>("upgrade");
  const [mopStatus, setMopStatus] = useState<string>("unknown");

  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [pdpaConsent, setPdpaConsent] = useState<boolean>(false);
  const [marketingConsent, setMarketingConsent] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Top-of-funnel beacon: fire once on mount so view_form → submit_form
  // conversion is measurable in the admin funnel.
  useEffect(() => {
    const src = new URLSearchParams(window.location.search).get("utm_source");
    fetch("/api/sell/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "view_form", source: src }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  const isHdb = propertyType === "HDB";

  const canSubmit = useMemo(() => {
    if (!fullName.trim()) return false;
    if (!email.trim()) return false;
    if (!pdpaConsent) return false;
    if (isHdb && !town) return false;
    if (!isHdb && !districtCode && !town) return false;
    return true;
  }, [fullName, email, pdpaConsent, isHdb, town, districtCode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setError(null);
    setSubmitting(true);

    const estimateLow = estValue
      ? Math.max(0, Math.round(Number(estValue) * 0.9))
      : null;
    const estimateHigh = estValue
      ? Math.max(0, Math.round(Number(estValue) * 1.1))
      : null;

    try {
      const res = await fetch("/api/sell/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_type: propertyType,
          bedrooms: bedrooms ? Number(bedrooms) : null,
          district_code: districtCode || null,
          town: town || null,
          postal_code: postalCode || null,
          address_line: addressLine || null,
          est_value_low: estimateLow,
          est_value_high: estimateHigh,
          timeline,
          reason,
          current_mop_status: isHdb ? mopStatus : null,
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          whatsapp: phone.trim() || null,
          pdpa_consent: pdpaConsent,
          marketing_consent: marketingConsent,
          source: pinnedAgent ? "agent_profile" : "sell_form",
          requested_agent_id: pinnedAgent?.id ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.token) {
        setError(json?.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      router.push(`/sell/shortlist/${json.token}`);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="lp-panel" style={{ maxWidth: 720, margin: "-32px auto 0", padding: "30px 32px" }}>
      {pinnedAgent && (
        <div
          className="fc-card"
          style={{ padding: "14px 16px", marginBottom: 22, background: "var(--blue-wash)", border: "1px solid var(--blue)" }}
        >
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>
            Requesting an introduction to {pinnedAgent.name}
          </div>
          <p className="small muted" style={{ margin: "4px 0 0", lineHeight: 1.55 }}>
            {pinnedAgent.agency}. We&apos;ll put {pinnedAgent.name.split(" ")[0]} at the top of your
            shortlist, plus other top-ranked agents for your area so you can compare before you
            decide who to invite. Free for sellers.
          </p>
        </div>
      )}
      <div className="form-step"><span className="n">1</span> What are you selling?</div>
      <div className="sel-grid" style={{ marginTop: 12 }}>
        {(["HDB", "CONDO", "EC", "LANDED"] as PropertyType[]).map((t) => (
          <button key={t} type="button" onClick={() => setPropertyType(t)} className={"seg__btn" + (propertyType === t ? " seg__btn--active" : "")}>
            {t === "EC" ? "EC" : t === "CONDO" ? "Condo" : t === "LANDED" ? "Landed" : t}
          </button>
        ))}
      </div>

      <div className="form-step" style={{ marginTop: 26 }}><span className="n">2</span> Where is it?</div>
      {isHdb ? (
        <div className="fld">
          <label>HDB town <span className="req">*</span></label>
          <select className="fc-select" value={town} onChange={(e) => setTown(e.target.value)} required={isHdb}>
            <option value="">Pick a town</option>
            {hdbTowns.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      ) : (
        <div className="fld">
          <label>District <span className="req">*</span></label>
          <select className="fc-select" value={districtCode} onChange={(e) => setDistrictCode(e.target.value)} required={!isHdb}>
            <option value="">Pick a district</option>
            {districts.map((d) => <option key={d.code} value={d.code}>{d.code} · {d.name.split(",")[0]}</option>)}
          </select>
        </div>
      )}
      <div className="grid2">
        <div className="fld"><label>Postal code</label><input className="fc-input" value={postalCode} onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6 digits" /></div>
        <div className="fld"><label>Block + street <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label><input className="fc-input" value={addressLine} onChange={(e) => setAddressLine(e.target.value.slice(0, 160))} placeholder="e.g. 123 Tampines Street 11" /></div>
      </div>

      <div className="form-step" style={{ marginTop: 26 }}><span className="n">3</span> Details</div>
      <div className="grid2">
        <div className="fld"><label>Bedrooms</label>
          <select className="fc-select" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}>
            <option value="">Pick</option>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="fld"><label>Estimated value (S$)</label><input className="fc-input" value={estValue} onChange={(e) => setEstValue(e.target.value.replace(/\D/g, "").slice(0, 9))} inputMode="numeric" placeholder="e.g. 650000" /></div>
        <div className="fld"><label>Timeline</label>
          <select className="fc-select" value={timeline} onChange={(e) => setTimeline(e.target.value)}>
            {TIMELINES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="fld"><label>Reason</label>
          <select className="fc-select" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>
      {isHdb && (
        <div className="fld"><label>MOP status</label>
          <select className="fc-select" value={mopStatus} onChange={(e) => setMopStatus(e.target.value)}>
            {MOP_STATUSES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      )}

      <div className="form-step" style={{ marginTop: 26 }}><span className="n">4</span> Where to send the shortlist</div>
      <div className="fld"><label>Full name <span className="req">*</span></label><input className="fc-input" value={fullName} onChange={(e) => setFullName(e.target.value.slice(0, 120))} required /></div>
      <div className="grid2">
        <div className="fld"><label>Email <span className="req">*</span></label><input className="fc-input" type="email" value={email} onChange={(e) => setEmail(e.target.value.slice(0, 200))} required /></div>
        <div className="fld"><label>Mobile <span className="muted" style={{ fontWeight: 400 }}>(WhatsApp preferred)</span></label><input className="fc-input" value={phone} onChange={(e) => setPhone(e.target.value.slice(0, 24))} inputMode="tel" placeholder="+65 ..." /></div>
      </div>
      <label className="fc-row" style={{ gap: 10, alignItems: "flex-start", marginTop: 18, fontSize: 13.5, color: "var(--slate)" }}>
        <input type="checkbox" checked={pdpaConsent} onChange={(e) => setPdpaConsent(e.target.checked)} style={{ marginTop: 3 }} required />
        <span>I agree that FairComparisons may share my details with the agents I invite, under Singapore&apos;s PDPA. My data is never shared with agents I did not pick.</span>
      </label>
      <label className="fc-row" style={{ gap: 10, alignItems: "flex-start", marginTop: 10, fontSize: 13.5, color: "var(--slate)" }}>
        <input type="checkbox" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)} style={{ marginTop: 3 }} />
        <span>Send me a monthly property market update. Unsubscribe anytime.</span>
      </label>

      {error && <div className="fc-alert fc-alert--warn" style={{ marginTop: 16 }}>{error}</div>}

      <button type="submit" disabled={!canSubmit || submitting} className="fc-btn fc-btn--primary fc-btn--block fc-btn--lg" style={{ marginTop: 18 }}>
        {submitting
          ? "Matching you with top agents…"
          : pinnedAgent
            ? `Request ${pinnedAgent.name.split(" ")[0]} + see my shortlist`
            : "See my shortlist"}
      </button>
      <p className="small muted" style={{ textAlign: "center", margin: "12px 0 0" }}>
        Free for sellers. Agents only pay if you complete a sale through them.
      </p>
    </form>
  );
}
