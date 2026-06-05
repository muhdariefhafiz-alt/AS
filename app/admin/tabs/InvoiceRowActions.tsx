"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  completionId: number;
  reference: string;
  feeAmount: number;
};

function fmtSgd(n: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function InvoiceRowActions({
  completionId,
  reference,
  feeAmount,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "paid" | "waive" | "dispute">(null);
  const [confirm, setConfirm] = useState<null | "paid" | "waive" | "dispute">(null);
  const [waiveReason, setWaiveReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function act(action: "paid" | "waive" | "dispute", reason?: string) {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/invoices/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionId, reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error ?? "Failed.");
        setBusy(null);
        return;
      }
      setConfirm(null);
      setBusy(null);
      router.refresh();
    } catch {
      setError("Network error.");
      setBusy(null);
    }
  }

  if (confirm === "paid") {
    return (
      <div className="flex flex-col items-end gap-1">
        <p className="text-[11px] text-gray-600">
          Mark {reference} ({fmtSgd(feeAmount)}) paid?
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => act("paid")}
            disabled={busy !== null}
            className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:bg-gray-300"
          >
            {busy === "paid" ? "…" : "Confirm paid"}
          </button>
          <button
            onClick={() => setConfirm(null)}
            className="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-600"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-[11px] text-red-700">{error}</p>}
      </div>
    );
  }

  if (confirm === "waive") {
    return (
      <div className="flex flex-col items-end gap-1">
        <input
          value={waiveReason}
          onChange={(e) => setWaiveReason(e.target.value)}
          placeholder="Waive reason"
          className="w-36 rounded border border-gray-200 px-2 py-1 text-[11px]"
        />
        <div className="flex gap-1">
          <button
            onClick={() => act("waive", waiveReason)}
            disabled={busy !== null || waiveReason.trim().length < 3}
            className="rounded bg-gray-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-gray-600 disabled:bg-gray-300"
          >
            {busy === "waive" ? "…" : "Waive"}
          </button>
          <button
            onClick={() => setConfirm(null)}
            className="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-600"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-[11px] text-red-700">{error}</p>}
      </div>
    );
  }

  if (confirm === "dispute") {
    return (
      <div className="flex flex-col items-end gap-1">
        <input
          value={waiveReason}
          onChange={(e) => setWaiveReason(e.target.value)}
          placeholder="Dispute note"
          className="w-36 rounded border border-gray-200 px-2 py-1 text-[11px]"
        />
        <div className="flex gap-1">
          <button
            onClick={() => act("dispute", waiveReason)}
            disabled={busy !== null}
            className="rounded bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-500 disabled:bg-gray-300"
          >
            {busy === "dispute" ? "…" : "Flag dispute"}
          </button>
          <button
            onClick={() => setConfirm(null)}
            className="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-600"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-[11px] text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-1">
      <button
        onClick={() => setConfirm("paid")}
        className="rounded border border-emerald-300 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
        title={`Mark ${reference} paid`}
      >
        Paid
      </button>
      <button
        onClick={() => setConfirm("waive")}
        className="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
      >
        Waive
      </button>
      <button
        onClick={() => setConfirm("dispute")}
        className="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
      >
        Dispute
      </button>
    </div>
  );
}
