"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function WaitlistForm({ lawyerMode }: { lawyerMode?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    const { error } = await supabase.from("sg_waitlist").insert({
      email,
      type: lawyerMode ? "lawyer" : "consumer",
    });
    setStatus(error ? "error" : "done");
  }

  if (status === "done") {
    return <p className="mt-4 text-sm font-medium text-teal-700">You are on the list. We will be in touch.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-4 flex max-w-md gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder={lawyerMode ? "your@lawfirm.com" : "your@email.com"}
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className={`shrink-0 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${
          lawyerMode ? "bg-teal-600 hover:bg-teal-700" : "bg-slate-800 hover:bg-slate-700"
        }`}
      >
        {status === "loading" ? "..." : lawyerMode ? "Claim early access" : "Join waitlist"}
      </button>
      {status === "error" && <p className="text-xs text-red-500">Try again</p>}
    </form>
  );
}
