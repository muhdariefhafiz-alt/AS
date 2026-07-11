"use client";

import { useState } from "react";

// The actual demand signal: an explicit click, recorded as a funnel event.
// Honest state after clicking: interest registered, nothing oversold.
export default function TelegramInterestButton({ src }: { src: string }) {
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");

  async function click() {
    if (state !== "idle") return;
    setState("saving");
    try {
      // /api/track's page_views shape: the click is countable via
      // event='telegram_interest_click', source preserved in utm_source.
      await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "/telegram-alerts",
          event: "telegram_interest_click",
          utm_source: src,
        }),
      });
    } catch {
      // Interest noted locally even if the beacon fails; do not block the UI.
    }
    setState("done");
  }

  if (state === "done") {
    return (
      <div className="rounded-xl border border-[var(--line-2)] bg-[var(--blue-wash)] px-5 py-4 text-sm text-gray-800">
        Noted. We will enable Telegram alerts for your profile as soon as they
        launch. Meanwhile, seller requests reach you by email.
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={state === "saving"}
      className="rounded-lg bg-[var(--blue)] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[var(--blue-deep)] disabled:bg-gray-400"
    >
      Yes, I want Telegram alerts
    </button>
  );
}
