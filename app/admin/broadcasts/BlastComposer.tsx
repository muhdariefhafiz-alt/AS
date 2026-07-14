"use client";

import { useEffect, useState, useCallback } from "react";

type Audience = { tier?: string[]; area?: string[] };
const TIERS = ["free", "verified", "professional", "elite"];

// Email blast composer. Sibling to the in-app banner: same cohort model, but the
// reach channel is email, so it is claimed-only by construction (the API forces
// it) and needs a subject line + a typed confirmation before it will send.
export default function BlastComposer() {
  const [subject, setSubject] = useState("");
  const [heading, setHeading] = useState("");
  const [intro, setIntro] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [tiers, setTiers] = useState<string[]>([]);
  const [areaText, setAreaText] = useState("");
  const [recipients, setRecipients] = useState<number | null>(null);
  const [eligibleTotal, setEligibleTotal] = useState(0);
  const [hasProvider, setHasProvider] = useState(true);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const audience = useCallback((): Audience => {
    const a: Audience = {};
    if (tiers.length) a.tier = tiers;
    const areas = areaText.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (areas.length) a.area = areas;
    return a;
  }, [tiers, areaText]);

  useEffect(() => {
    fetch("/api/admin/blast").then((r) => r.json()).then((j) => {
      setEligibleTotal(j.eligibleTotal ?? 0);
      setHasProvider(!!j.hasProvider);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let live = true;
    fetch("/api/admin/blast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "preview", audience: audience() }) })
      .then((r) => r.json()).then((j) => { if (live) setRecipients(j.recipients ?? 0); }).catch(() => {});
    return () => { live = false; };
  }, [audience]);

  function toggleTier(t: string) {
    setTiers((xs) => (xs.includes(t) ? xs.filter((x) => x !== t) : [...xs, t]));
  }

  async function send() {
    if (busy) return;
    if (!subject.trim() || !intro.trim()) { setMsg("Subject and message are required."); return; }
    if (confirmText.trim().toUpperCase() !== "SEND") { setMsg('Type SEND to confirm.'); return; }
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/blast", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", subject, heading, intro, cta_label: ctaLabel, cta_href: ctaHref, audience: audience() }),
    }).then((x) => x.json()).catch(() => ({ error: "Network error" }));
    setBusy(false);
    if (r.dryRun) setMsg(`Dry run (no email provider configured): would send ${r.wouldSend}.`);
    else if (r.ok) { setMsg(`Sent to ${r.sent} agents${r.failed ? `, ${r.failed} failed` : ""}${r.capped ? " (capped)" : ""}.`); setConfirmText(""); }
    else setMsg(r.error || "Could not send.");
  }

  const label = "block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1";
  const input = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-bold text-gray-900">Email a cohort</h2>
      <p className="mt-1 text-xs text-gray-500">
        Reaches agents who may never open the dashboard. Claimed agents only, opt-outs suppressed. Every email carries a one-click unsubscribe.
      </p>
      {!hasProvider && (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          No email provider configured (RESEND_API_KEY). Sends will run as a dry run until it is set.
        </p>
      )}

      <div className="mt-4 space-y-3">
        <div><label className={label}>Subject</label><input className={input} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="New: your leads now reply in one tap" /></div>
        <div><label className={label}>Heading (optional, defaults to subject)</label><input className={input} value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="A faster way to answer leads" /></div>
        <div><label className={label}>Message</label><textarea className={input} rows={5} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder={"Write in plain paragraphs. Blank lines become new paragraphs.\n\nWe just shipped..."} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Button label (optional)</label><input className={input} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Open your dashboard" /></div>
          <div><label className={label}>Button link (optional)</label><input className={input} value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="https://fair-comparisons.com/dashboard" /></div>
        </div>

        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <div className={label}>Audience (within claimed agents)</div>
          <div className="mb-2 flex flex-wrap gap-2">
            {TIERS.map((t) => (
              <button key={t} type="button" onClick={() => toggleTier(t)}
                className={`rounded-full border px-3 py-1 text-xs ${tiers.includes(t) ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-600"}`}>{t}</button>
            ))}
          </div>
          <input className={input} value={areaText} onChange={(e) => setAreaText(e.target.value)} placeholder="Areas (comma-sep, e.g. TAMPINES, YISHUN) - optional" />
        </div>

        <p className="text-xs text-gray-500">
          Reaches <b className="text-gray-900 tabular-nums">{recipients ?? "..."}</b> of {eligibleTotal.toLocaleString()} claimed, contactable agents.
        </p>

        <div className="flex items-center gap-2">
          <input className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type SEND" />
          <button type="button" onClick={send} disabled={busy || !subject.trim() || !intro.trim() || confirmText.trim().toUpperCase() !== "SEND"} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Sending..." : `Send email${recipients ? ` to ${recipients}` : ""}`}</button>
        </div>
        {msg && <p className="text-xs text-gray-700">{msg}</p>}
      </div>
    </div>
  );
}
