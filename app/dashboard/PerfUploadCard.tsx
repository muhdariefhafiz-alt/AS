"use client";

import { useEffect, useState } from "react";

// "Drop your AgentNet PDF" — the honest on-ramp to portal performance data.
// SG portals expose no API, so the only lawful way to get an agent's own
// listing views/enquiries into FairComparisons is for them to hand us the
// export. This card measures whether they will; parsing follows demand.

type Upload = { id: string; filename: string | null; status: string; created_at: string };

function fmtDate(s: string): string {
  const d = new Date(s);
  return d.toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

export default function PerfUploadCard() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function refresh() {
    const res = await fetch("/api/dashboard/perf-upload");
    if (res.ok) setUploads((await res.json()).uploads ?? []);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch("/api/dashboard/perf-upload");
      if (active && res.ok) setUploads((await res.json()).uploads ?? []);
    })();
    return () => { active = false; };
  }, []);

  async function onFile(file: File) {
    setStatus("uploading");
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/dashboard/perf-upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { setStatus("error"); setMsg(json.error ?? "Upload failed."); return; }
      setStatus("done");
      setMsg("Got it. We'll turn this into your dashboard and email you when it's ready.");
      await refresh();
    } catch {
      setStatus("error");
      setMsg("Network error. Please try again.");
    }
  }

  return (
    <div className="fc-card fc-card--pad">
      <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div>
          <p className="kicker" style={{ color: "var(--blue-deep)", margin: 0 }}>Early access</p>
          <h2 style={{ fontSize: 18, margin: "4px 0 0" }}>Bring in your portal numbers</h2>
        </div>
        <span className="fc-badge" style={{ background: "var(--cloud)", color: "var(--slate)" }}>Beta</span>
      </div>

      <p className="muted small" style={{ marginTop: 10, maxWidth: "64ch" }}>
        PropertyGuru shows your listing views and enquiries only inside AgentNet, and there is no way to connect it.
        Export the PDF (AgentNet &rarr; Performance &rarr; Download) and drop it here &mdash; we&apos;ll turn it into
        your FairComparisons dashboard, next to your real transaction record. Your file stays private and is never shown publicly.
      </p>

      <label className="fc-btn fc-btn--ghost fc-btn--sm" style={{ marginTop: 12, display: "inline-block", cursor: "pointer" }}>
        {status === "uploading" ? "Uploading…" : "Upload AgentNet PDF"}
        <input
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          disabled={status === "uploading"}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
        />
      </label>

      {status === "done" && <p className="small" style={{ marginTop: 10, color: "var(--ok)" }}>{msg}</p>}
      {status === "error" && <p className="small" style={{ marginTop: 10, color: "var(--danger)" }}>{msg}</p>}

      {uploads.length > 0 && (
        <div style={{ marginTop: 14, display: "grid", gap: 6 }}>
          {uploads.map((u) => (
            <div key={u.id} className="fc-row" style={{ justifyContent: "space-between", fontSize: 13, color: "var(--slate)" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{u.filename ?? "AgentNet export"}</span>
              <span className="muted">{u.status === "received" ? "Received" : u.status} · {fmtDate(u.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
