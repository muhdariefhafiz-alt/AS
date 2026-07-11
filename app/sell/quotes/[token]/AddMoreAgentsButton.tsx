"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Reopens the shortlist with fresh suggestions via the existing reshortlist
// endpoint. Rendered inside the waiting card so a seller with silent agents
// is never stuck: before this, "Show me more agents" only existed once at
// least one quote had arrived, which zero quotes ever had.
export default function AddMoreAgentsButton({
  token,
  prominent = false,
}: {
  token: string;
  prominent?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "working" | "error">("idle");

  async function go() {
    if (state === "working") return;
    setState("working");
    try {
      const res = await fetch("/api/sell/reshortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        setState("error");
        return;
      }
      router.push(`/sell/shortlist/${token}`);
    } catch {
      setState("error");
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={go}
        disabled={state === "working"}
        className={
          prominent
            ? "rounded-lg bg-[var(--blue)] px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-[var(--blue-deep)] disabled:bg-gray-400"
            : "rounded-lg border border-[var(--line-2)] px-4 py-2 text-sm font-semibold text-[var(--blue-deep)] hover:bg-white disabled:text-gray-400"
        }
      >
        {state === "working" ? "Finding more agents…" : "Add more agents"}
      </button>
      {state === "error" && (
        <span className="text-xs text-red-600">Could not expand, try again</span>
      )}
    </span>
  );
}
