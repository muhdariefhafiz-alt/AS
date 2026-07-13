"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { BuildingPage } from "../lib/buildingPages";
import { MIN_COMMENTARY_CHARS, MAX_COMMENTARY_CHARS, MAX_HEADLINE_CHARS } from "../lib/buildingPages";

// Building spotlights: agent-owned marketing on the canonical development
// pages. Exclusive while published (one live spotlight per development,
// first-come). Quota comes from the subscription tier; ownership never
// touches rank, score or lead flow.

type ProjectHit = { id: number; name: string; slug: string; street: string | null; district: string | null; txn_count: number | null };
type PanelData = { tier: string; quota: number; used: number; pages: BuildingPage[]; claimable?: number };

export default function BuildingPagesPanel() {
  const [data, setData] = useState<PanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // create form state
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ProjectHit[]>([]);
  const [picked, setPicked] = useState<ProjectHit | null>(null);
  const [headline, setHeadline] = useState("");
  const [commentary, setCommentary] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/building-pages");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced development search for the picker.
  useEffect(() => {
    if (picked || query.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/dashboard/building-pages?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) setHits((await res.json()).projects ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [query, picked]);

  async function submit(publish: boolean) {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/building-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: picked.id, headline, commentary, publish }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not save the page.");
        return;
      }
      setCreating(false);
      setPicked(null);
      setQuery("");
      setHeadline("");
      setCommentary("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: "draft" | "published") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/building-pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Could not update the page.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this building page? The live spotlight comes down immediately.")) return;
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/dashboard/building-pages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="fc-card fc-card--pad">
        <p className="muted small" style={{ margin: 0 }}>Loading your building pages...</p>
      </div>
    );
  }
  if (!data) return null;

  const atQuota = data.used >= data.quota;
  const commentaryLen = commentary.trim().length;

  return (
    <div className="fc-card fc-card--pad">
      <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div>
          <p className="kicker" style={{ color: "var(--blue-deep)", margin: 0 }}>Building pages</p>
          <h2 style={{ fontSize: 18, margin: "4px 0 0" }}>Own the page buyers read before they sell</h2>
        </div>
        <span className="muted small">{data.used} of {data.quota} pages on your {data.tier} plan</span>
      </div>

      <p className="muted small" style={{ marginTop: 10 }}>
        Every development page here is researched by real buyers and sellers. Put your name, your insight and
        your booking link on the one you know best, and you become the agent they meet. One agent per
        development, first come first served, and new spotlights get featured on the homepage. It never touches your rank.
      </p>

      {typeof data.claimable === "number" && data.claimable > 0 && data.used < data.quota && (
        <p className="small" style={{ marginTop: 8, color: "var(--blue-deep)", fontWeight: 600 }}>
          {data.claimable.toLocaleString()} developments still have no agent presenting them. Claim one before a competitor does.
        </p>
      )}

      {error && (
        <p className="small" style={{ marginTop: 10, color: "#b42318" }}>{error}</p>
      )}

      {data.pages.length > 0 && (
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {data.pages.map((p) => (
            <div key={p.id} className="fc-card fc-card--fill" style={{ padding: "12px 14px" }}>
              <div className="fc-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {p.project_name}
                    <span
                      className="small"
                      style={{
                        marginLeft: 8, padding: "1px 8px", borderRadius: 999, fontWeight: 600,
                        background: p.status === "published" ? "var(--blue-wash)" : "var(--cloud)",
                        color: p.status === "published" ? "var(--blue-deep)" : "var(--slate)",
                      }}
                    >
                      {p.status === "published" ? "Live" : "Draft"}
                    </span>
                  </div>
                  <div className="muted small" style={{ marginTop: 2 }}>{p.headline}</div>
                </div>
                <div className="fc-row" style={{ gap: 10, alignItems: "center" }}>
                  {p.status === "published" && (
                    <Link href={`/property-agents/development/${p.slug}`} className="small" style={{ color: "var(--blue)" }} target="_blank">
                      View live
                    </Link>
                  )}
                  {p.status === "draft" ? (
                    <button className="fc-btn fc-btn--sm" disabled={busy} onClick={() => setStatus(p.id, "published")}>Publish</button>
                  ) : (
                    <button className="fc-btn fc-btn--sm fc-btn--ghost" disabled={busy} onClick={() => setStatus(p.id, "draft")}>Unpublish</button>
                  )}
                  <button className="small" style={{ color: "#b42318", background: "none", border: "none", cursor: "pointer" }} disabled={busy} onClick={() => remove(p.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!creating ? (
        <div style={{ marginTop: 12 }}>
          {atQuota ? (
            <p className="muted small" style={{ margin: 0 }}>
              You&#39;ve used all {data.quota} building page{data.quota === 1 ? "" : "s"} on the {data.tier} plan.{" "}
              <Link href="/for-agents#pricing" style={{ color: "var(--blue)" }}>Upgrade for more</Link>.
            </p>
          ) : (
            <button className="fc-btn fc-btn--sm" onClick={() => setCreating(true)}>+ New building page</button>
          )}
        </div>
      ) : (
        <div className="fc-card fc-card--fill" style={{ marginTop: 12, padding: 16 }}>
          {!picked ? (
            <div>
              <label className="small" style={{ fontWeight: 600 }}>Which development do you know best?</label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by development name, e.g. Treasure at Tampines"
                className="fc-input"
                style={{ marginTop: 6, width: "100%" }}
              />
              {hits.length > 0 && (
                <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                  {hits.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => setPicked(h)}
                      style={{ textAlign: "left", background: "var(--cloud)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{h.name}</span>
                      <span className="muted small" style={{ marginLeft: 8 }}>
                        {h.street ?? ""} · D{h.district ?? "?"} · {h.txn_count ?? 0} URA transactions
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="fc-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{picked.name}</span>
                <button className="small" style={{ color: "var(--blue)", background: "none", border: "none", cursor: "pointer" }} onClick={() => { setPicked(null); setQuery(""); }}>
                  Change development
                </button>
              </div>
              <label className="small" style={{ fontWeight: 600, display: "block", marginTop: 12 }}>
                Headline <span className="muted">({headline.length}/{MAX_HEADLINE_CHARS})</span>
              </label>
              <input
                type="text"
                value={headline}
                maxLength={MAX_HEADLINE_CHARS}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder={`Why ${picked.name} is worth a closer look`}
                className="fc-input"
                style={{ marginTop: 6, width: "100%" }}
              />
              <label className="small" style={{ fontWeight: 600, display: "block", marginTop: 12 }}>
                Your local commentary{" "}
                <span className="muted">
                  ({commentaryLen}/{MAX_COMMENTARY_CHARS}, minimum {MIN_COMMENTARY_CHARS} to publish)
                </span>
              </label>
              <textarea
                value={commentary}
                maxLength={MAX_COMMENTARY_CHARS}
                onChange={(e) => setCommentary(e.target.value)}
                rows={7}
                placeholder="What should a buyer or seller genuinely know about this development? Layouts that work, stacks to avoid, the walk to the MRT, en-bloc chatter, how it compares to its neighbours. Your own words; this is what makes the page worth reading."
                className="fc-input"
                style={{ marginTop: 6, width: "100%", resize: "vertical" }}
              />
              <p className="muted small" style={{ marginTop: 8 }}>
                Shown as your commentary next to the neutral URA data, with your name, CEA registration and
                agency displayed automatically (CEA advertising guidelines). Keep it factual and your own.
              </p>
              <div className="fc-row" style={{ gap: 10, marginTop: 12 }}>
                <button className="fc-btn fc-btn--sm" disabled={busy || commentaryLen < MIN_COMMENTARY_CHARS} onClick={() => submit(true)}>
                  Publish spotlight
                </button>
                <button className="fc-btn fc-btn--sm fc-btn--ghost" disabled={busy} onClick={() => submit(false)}>
                  Save draft
                </button>
                <button className="small" style={{ background: "none", border: "none", color: "var(--slate)", cursor: "pointer" }} onClick={() => setCreating(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
