"use client";

import { useEffect, useState, useCallback } from "react";

type Audience = { tier?: string[]; claimed?: boolean; area?: string[] };
type Coverage = {
  eligible: number; seen: number; acked: number; clicked: number;
  // unseen_count is the real gap; unseen is a readable sample of it.
  unseen_count: number;
  unseen: { name: string | null; email: string | null }[];
};
type BroadcastRow = {
  id: number; title: string; body: string; severity: string; active: boolean;
  audience_label: string; ends_at: string | null; created_at: string;
  coverage: Coverage | null;
};

const TIERS = ["free", "verified", "professional", "elite"];

export default function BroadcastComposer() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkHref, setLinkHref] = useState("");
  const [severity, setSeverity] = useState("info");
  const [tiers, setTiers] = useState<string[]>([]);
  const [areaText, setAreaText] = useState("");
  const [recipients, setRecipients] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [list, setList] = useState<BroadcastRow[]>([]);

  const audience = useCallback((): Audience => {
    const a: Audience = {};
    if (tiers.length) a.tier = tiers;
    a.claimed = true; // in-app delivery is claimed-only, see the note in the audience box
    const areas = areaText.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (areas.length) a.area = areas;
    return a;
  }, [tiers, areaText]);

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
      body: JSON.stringify({ action: "create", title, text, cta_label: ctaLabel, cta_href: ctaHref, link_label: linkLabel, link_href: linkHref, severity, audience: audience() }),
    }).then((x) => x.json()).catch(() => ({ error: "Network error" }));
    setBusy(false);
    if (r.ok) {
      setMsg(`Published to ${r.recipients} agents.`);
      setTitle(""); setText(""); setCtaLabel(""); setCtaHref(""); setLinkLabel(""); setLinkHref("");
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
        <p className="mt-1 text-xs text-gray-500">
          Shown as a card over the dashboard the next time each matching agent signs in, and kept in their What&apos;s new list afterwards. One at a time: the newest unread announcement wins. If an agent closes it without reading, it returns on their next two visits and then stops interrupting. Turning it off later stops new appearances but leaves it in the history of agents who already saw it.
        </p>

        <div className="mt-4 space-y-3">
          <div><label className={label}>Title</label><input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New: reply to leads in one tap" /></div>
          <div><label className={label}>Body</label><textarea className={input} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Your AI-drafted reply is now grounded in your own transactions." /></div>
          {/* The button is the action ("start using it"); the second row is the
              write-up ("read about it first"). Filling only one is fine. */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Button label (optional)</label><input className={input} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Draw up a letter of intent" /></div>
            <div><label className={label}>Button link (optional)</label><input className={input} value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="/dashboard?tab=paperwork&amp;newDoc=loi&amp;newDocFrom=broadcast" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Read-more label (optional)</label><input className={input} value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="How it works" /></div>
            <div><label className={label}>Read-more link (optional)</label><input className={input} value={linkHref} onChange={(e) => setLinkHref(e.target.value)} placeholder="/roadmap/letter-of-intent" /></div>
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
            {/* No claimed/unclaimed choice: an in-app announcement can only
                reach an agent who can sign in, and only a claimed agent can.
                Offering "unclaimed" would be a control that reaches nobody. */}
            <p className="mb-2 text-xs text-gray-500">Claimed agents only. Use the email blast to reach anyone else.</p>
            <input className={input} value={areaText} onChange={(e) => setAreaText(e.target.value)} placeholder="Areas (comma-sep, e.g. TAMPINES, YISHUN) - optional" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Reaches <b className="text-gray-900 tabular-nums">{recipients ?? "..."}</b> of {total.toLocaleString()} claimed agents</span>
            <button type="button" onClick={create} disabled={busy || !title.trim() || !text.trim()} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Publishing..." : "Publish announcement"}</button>
          </div>
          {msg && <p className="text-xs text-gray-600">{msg}</p>}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-gray-900">Recent announcements</h2>
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

              {/* Delivery, not dispatch. Publishing an announcement is not the
                  same as anyone having seen it, and the gap between the two is
                  the only part worth acting on. */}
              {b.coverage && b.coverage.eligible > 0 && (
                <div className="mt-2 border-t border-gray-100 pt-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
                    <span>
                      Seen by <b className="tabular-nums text-gray-900">{b.coverage.seen}</b> of{" "}
                      <b className="tabular-nums text-gray-900">{b.coverage.eligible}</b>
                      {b.coverage.eligible > 0 && (
                        <> ({Math.round((b.coverage.seen / b.coverage.eligible) * 100)}%)</>
                      )}
                    </span>
                    <span>Read <b className="tabular-nums text-gray-900">{b.coverage.acked}</b></span>
                    <span>Clicked <b className="tabular-nums text-gray-900">{b.coverage.clicked}</b></span>
                  </div>
                  {b.coverage.unseen_count > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[11px] text-gray-500">
                        {b.coverage.unseen_count} not reached yet (email them)
                      </summary>
                      <ul className="mt-1 space-y-0.5">
                        {b.coverage.unseen.map((u, i) => (
                          <li key={i} className="text-[11px] text-gray-600">
                            {u.name ?? "Unnamed"}{u.email ? ` · ${u.email}` : ""}
                          </li>
                        ))}
                      </ul>
                      {b.coverage.unseen_count > b.coverage.unseen.length && (
                        <p className="mt-1 text-[11px] text-gray-500">
                          Showing the first {b.coverage.unseen.length} of {b.coverage.unseen_count}.
                        </p>
                      )}
                    </details>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
