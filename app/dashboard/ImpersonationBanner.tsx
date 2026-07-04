"use client";

import { useState } from "react";

export default function ImpersonationBanner({ adminEmail, agentEmail }: { adminEmail: string; agentEmail: string }) {
  const [busy, setBusy] = useState(false);

  async function exit() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/impersonate/stop", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      window.location.href = data?.redirect ?? "/admin";
    } catch {
      window.location.href = "/admin";
    }
  }

  return (
    <div
      style={{ position: "sticky", top: 0, zIndex: 60 }}
      className="flex flex-wrap items-center justify-between gap-2 bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950"
    >
      <span>
        Admin impersonation: viewing {agentEmail} as {adminEmail}. Anything you do acts as this agent.
      </span>
      <button
        onClick={exit}
        disabled={busy}
        className="rounded-md bg-amber-950 px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
      >
        {busy ? "Exiting..." : "Exit impersonation"}
      </button>
    </div>
  );
}
