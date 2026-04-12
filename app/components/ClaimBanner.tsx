"use client";

import { useState } from "react";

type Props = {
  agentId: number;
  agentName: string;
  claimed: boolean;
  districtClaimedCount?: number;
  profileViews?: number;
};

export default function ClaimBanner({ agentId, agentName, claimed, districtClaimedCount, profileViews }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (claimed) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-xs text-white">&#10003;</span>
          <span className="text-sm font-medium text-green-800">Verified profile</span>
        </div>
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
        <p className="font-semibold text-teal-800">Claim request submitted</p>
        <p className="mt-1 text-sm text-teal-700">
          We will verify your identity and activate your profile within 24 hours.
          Check your email at {email} for confirmation.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold text-amber-800">This is your FairComparisons profile</p>
          <p className="mt-1 text-sm text-amber-700">
            Your transaction history and score are already live. Claim your profile (free) to control how buyers see you.
          </p>
          <ul className="mt-2 space-y-1 text-xs text-amber-700">
            <li>- Add your photo and WhatsApp number</li>
            <li>- Write your practice area description</li>
            <li>- Get notified when buyers view your profile</li>
          </ul>
          {profileViews && profileViews > 10 ? (
            <p className="mt-2 text-xs font-medium text-amber-800">
              Your profile has been viewed {profileViews} times. Buyers cannot contact you until you claim it.
            </p>
          ) : null}
          {districtClaimedCount && districtClaimedCount > 3 ? (
            <p className="mt-1 text-xs text-amber-600">
              {districtClaimedCount} agents in your district have already claimed their profile.
            </p>
          ) : null}
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            Claim free profile
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-amber-800">Your email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-amber-800">Phone / WhatsApp (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+65 9XXX XXXX"
              className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          {status === "error" && (
            <p className="text-sm text-red-600">{errorMsg}</p>
          )}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
          >
            {status === "loading" ? "Submitting..." : "Claim my profile (free)"}
          </button>
          <p className="text-[10px] text-amber-600">
            We verify claims by matching your email to CEA registration records. Takes under 24 hours.
          </p>
        </form>
      )}
    </div>
  );
}
