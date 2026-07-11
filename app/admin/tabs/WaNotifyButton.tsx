"use client";

import { useState } from "react";

// One-tap WhatsApp invite from the admin "invited agents not reached"
// worklist. First tap opens official wa.me click-to-chat with the invite
// prefilled (the operator sends it from the FairComparisons WhatsApp
// profile). Second tap, AFTER actually sending, records the send in
// sg_lead_notifications so the ledger and seller copy stay truthful. The
// ledger row is never written on the first tap: opening WhatsApp is not
// proof the message went out.
export default function WaNotifyButton({
  leadId,
  agentId,
  waNumber,
  text,
}: {
  leadId: number;
  agentId: number;
  waNumber: string; // digits only, E.164 without +
  text: string;
}) {
  const [state, setState] = useState<"idle" | "opened" | "saving" | "recorded" | "error">("idle");

  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;

  async function record() {
    setState("saving");
    try {
      const res = await fetch("/api/admin/notify-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, agent_id: agentId }),
      });
      setState(res.ok ? "recorded" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "recorded") {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Recorded
      </span>
    );
  }

  if (state === "opened" || state === "saving" || state === "error") {
    return (
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={record}
          disabled={state === "saving"}
          className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:bg-gray-300"
        >
          {state === "saving" ? "Saving…" : "Mark sent"}
        </button>
        {state === "error" && (
          <span className="text-xs text-red-600">failed, retry</span>
        )}
      </span>
    );
  }

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => setState("opened")}
      className="inline-flex items-center rounded-md border border-emerald-600 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
    >
      WhatsApp invite
    </a>
  );
}
