"use client";

import { useState } from "react";

type Props = {
  agentId: number;
  agentName: string;
  claimed: boolean;
};

export default function ClaimBanner({ agentId, agentName, claimed }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const firstName = agentName.split(" ")[0];

  if (claimed) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50/80 px-4 py-3">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[11px] text-white">&#10003;</span>
        <span className="text-sm font-medium text-green-800">Verified and claimed profile</span>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, email, phone }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Something went wrong");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-[11px] text-white">&#10003;</span>
          <p className="font-semibold text-teal-800">Claim submitted</p>
        </div>
        <p className="mt-2 text-sm text-teal-700">
          We&apos;ll verify your identity and activate your profile within 24 hours. Check {email} for confirmation.
        </p>
      </div>
    );
  }

  return (
    <div id="claim" className="overflow-hidden rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 to-white">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-base font-bold text-gray-900">
              Is this your profile, {firstName}?
            </p>
            <p className="mt-1.5 text-sm text-gray-600">
              Your transaction data is already public via CEA. Claiming lets you put your best foot forward.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-[10px] text-teal-700">+</span>
                Add photo & WhatsApp
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-[10px] text-teal-700">+</span>
                Write your own bio
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-[10px] text-teal-700">+</span>
                Direct buyer enquiries
              </div>
            </div>
          </div>
          {!open && (
            <button
              onClick={() => setOpen(true)}
              className="flex-shrink-0 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 hover:shadow-md"
            >
              Claim profile
            </button>
          )}
        </div>

        {open && (
          <form onSubmit={handleSubmit} className="mt-5 rounded-lg border border-teal-100 bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-700">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">WhatsApp (optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+65 9XXX XXXX"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
            {status === "error" && (
              <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
            )}
            <button
              type="submit"
              disabled={status === "loading"}
              className="mt-3 w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50 sm:w-auto"
            >
              {status === "loading" ? "Submitting..." : "Claim my profile"}
            </button>
            <p className="mt-2 text-[11px] text-gray-400">
              Free. We verify by matching your email to CEA records. Usually under 24 hours.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
