"use client";

import { useState } from "react";

// Inline MOP capture on the My Home page: the owner tells us roughly when they
// collected their keys; we derive the 5-year MOP countdown. Saved against the
// same watch token (no account needed).
export default function KeysDateForm({ token }: { token: string }) {
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const years: number[] = [];
  for (let y = 2027; y >= 2005; y--) years.push(y);

  async function save() {
    if (!month || !year || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/myhome/keys-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, keys_date: `${year}-${month.padStart(2, "0")}-01` }),
      });
      if (res.ok) {
        setDone(true);
        // Server-rendered MOP section appears on reload.
        window.location.reload();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Could not save. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <p className="text-sm text-gray-600">Saved. Updating your MOP countdown...</p>;

  return (
    <div>
      <p className="text-sm text-gray-600">
        When did you collect your keys? We&#39;ll add your 5-year MOP countdown to this page and your updates.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <option value="">Month</option>
          {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
            <option key={m} value={String(i + 1)}>{m}</option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <option value="">Year</option>
          {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        <button type="button" onClick={save} disabled={busy || !month || !year}
          className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Saving..." : "Add MOP countdown"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
