"use client";

import { useEffect, useState, useCallback } from "react";

type Audience = { tier?: string[]; claimed?: boolean; area?: string[] };
type BroadcastRow = {
  id: number; title: string; body: string; severity: string; active: boolean;
  audience_label: string; ends_at: string | null; created_at: string;
};

const TIERS = ["free", "verified", "professional", "elite"];

export default function BroadcastComposer() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [severity, setSeverity] = useState("info");
  const [tiers, setTiers] = useState<string[]>([]);
  const [claimed, setClaimed] = useState<"any" | "claimed" | "unclaimed">("any");
  const [areaText, setAreaText] = useState("");
  const [recipients, setRecipients] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [list, setList] = useState<BroadcastRow[]>([]);

  const audience = useCallback((): Audience => {
    const a: Audience = {};
    if (tiers.length) a.tier = tiers;
    if (claimed !== "any") a.claimed = claimed === "claimed";
    const areas = areaText.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (areas.length) a.area = areas;
    return a;
  }, [tiers, claimed, areaText]);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/broadcasts").then((x) => x.json()).catch(() => null);
    if (r) { setList(r.broadcasts ?? []); setTotal(r.totalAgents ?? 0); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Live recipient preview whenever the audience changes.
  useEffect(() => {
    let live = true;
    fetch("/api/admin/broadcasts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "preview", audience: audience() }) })
      .then((r) => r.json()).then((j) => { if (live) setRecipients(j.recipients ?? 0); }).catch(() => {});
    return () => { live = false; };
  }, [audience]);

  function toggleTier(t: string) {
    setTiers((xs) => (xs.includes(t) ? xs.filter((x) => x !== t) : [...xs, t]));
  }

  async function create() {
    if (!title.trim() || !text.trim() || busy) return;
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/broadcasts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", title, text, cta_label: ctaLabel, cta_href: ctaHref, severity, audience: audience() }),
    }).then((x) => x.json()).catch(() => ({ error: "Network error" }));
    setBusy(false);
    if (r.ok) {
      setMsg(`Published to ${r.recipients} agents.`);
      setTitle(""); setText(""); setCtaLabel(""); setCtaHref("");
      load();
    } else setMsg(r.error || "Could not publish.");
  }

  async function deactivate(id: number) {
    await fetch("/api/admin/broadcasts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deactivate", id }) });
    load();
  }

  const label = "block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1";
  const input = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-bold text-gray-900">Compose an announcement</h2>
        <p className="mt-1 text-xs text-gray-500">Shows as a dismissible banner in the matching agents&apos; dashboards.</p>

        <div className="mt-4 space-y-3">
          <div><label className={label}>Title</label><input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New: reply to leads in one tap" /></div>
          <div><label className={label}>Body</label><textarea className={input} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Your AI-drafted reply is now grounded in your own transactions." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>CTA label (optional)</label><input className={input} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="See what's new" /></div>
            <div><label className={label}>CTA link (optional)</label><input className={input} value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="/dashboard?tab=leads" /></div>
          </div>
          <div><label className={label}>Tone</label>
            <select className={input} value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="info">Info (blue)</option><option value="success">Success (green)</option><option value="warn">Warning (amber)</option>
            </select>
          </div>

          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <div className={label}>Audience</div>
            <div className="mb-2 flex flex-wrap gap-2">
              {TIERS.map((t) => (
                <button key={t} type="button" onClick={() => toggleTier(t)}
                  className={`rounded-full border px-3 py-1 text-xs ${tiers.includes(t) ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-600"}`}>{t}</button>
              ))}
            </div>
            <div className="mb-2 flex gap-3 text-xs text-gray-600">
              {(["any", "claimed", "unclaimed"] as const).map((c) => (
                <label key={c} className="flex items-center gap-1"><input type="radio" name="claimed" checked={claimed === c} onChange={() => setClaimed(c)} /> {c}</label>
              ))}
            </div>
            <input className={input} value={areaText} onChange={(e) => setAreaText(e.target.value)} placeholder="Areas (comma-sep, e.g. TAMPINES, YISHUN) - optional" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Reaches <b className="text-gray-900 tabular-nums">{recipients ?? "..."}</b> of {total.toLocaleString()} agents</span>
            <button type="button" onClick={create} disabled={busy || !title.trim() || !text.trim()} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Publishing..." : "Publish banner"}</button>
          </div>
          {msg && <p className="text-xs text-gray-600">{msg}</p>}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-gray-900">Recent broadcasts</h2>
        <div className="mt-3 space-y-2">
          {list.length === 0 ? (
            <p className="text-xs text-gray-500">None yet.</p>
          ) : list.map((b) => (
            <div key={b.id} className="rounded-md border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{b.title}</div>
                  <div className="text-[11px] text-gray-500">{b.audience_label} &middot; {b.active ? "active" : "off"} &middot; {new Date(b.created_at).toLocaleDateString("en-SG")}</div>
                </div>
                {b.active && <button type="button" onClick={() => deactivate(b.id)} className="shrink-0 rounded border border-gray-300 px-2 py-1 text-[11px] text-gray-600">Turn off</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
