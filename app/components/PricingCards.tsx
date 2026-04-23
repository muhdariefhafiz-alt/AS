"use client";

import { useState } from "react";
import Link from "next/link";

export default function PricingCards() {
  const [email, setEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState<"pro" | "premium" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout(tier: "pro" | "premium") {
    if (!email) {
      setShowEmailInput(tier);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), tier }),
      });
      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Something went wrong.");
        setLoading(false);
      }
    } catch {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="grid gap-6 md:grid-cols-3">
        {/* Free */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Free</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">S$0</p>
          <p className="text-xs text-gray-400">forever</p>
          <ul className="mt-6 space-y-2 text-sm text-gray-600">
            <li>- Photo and contact details</li>
            <li>- Practice description</li>
            <li>- Embed AgentScore widget</li>
            <li>- Profile view notifications</li>
          </ul>
          <Link href="/search" className="mt-6 block rounded-lg border border-teal-600 px-4 py-2.5 text-center text-sm font-semibold text-teal-600 transition hover:bg-teal-50">
            Claim your profile
          </Link>
        </div>

        {/* Pro */}
        <div className="rounded-xl border-2 border-teal-400 bg-teal-50 p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-teal-600">Pro</p>
            <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white">Popular</span>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">S$99<span className="text-base font-normal text-gray-400">/mo</span></p>
          <p className="text-xs text-gray-400">billed monthly</p>
          <ul className="mt-6 space-y-2 text-sm text-gray-700">
            <li>- Everything in Free</li>
            <li>- Sponsored badge on profile</li>
            <li>- Weekly profile view report</li>
            <li>- Sponsored placement in area listings</li>
          </ul>
          <button
            onClick={() => handleCheckout("pro")}
            disabled={loading}
            className="mt-6 block w-full rounded-lg bg-teal-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
          >
            {loading && showEmailInput === "pro" ? "Redirecting..." : "Start with Pro"}
          </button>
        </div>

        {/* Premium */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Premium</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">S$299<span className="text-base font-normal text-gray-400">/mo</span></p>
          <p className="text-xs text-gray-400">billed monthly</p>
          <ul className="mt-6 space-y-2 text-sm text-gray-600">
            <li>- Everything in Pro</li>
            <li>- Highlighted sponsored placement in rankings</li>
            <li>- Dedicated account support</li>
            <li>- Monthly market insights for your area</li>
          </ul>
          <button
            onClick={() => handleCheckout("premium")}
            disabled={loading}
            className="mt-6 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {loading && showEmailInput === "premium" ? "Redirecting..." : "Start with Premium"}
          </button>
        </div>
      </div>

      {/* Email input overlay */}
      {showEmailInput && (
        <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4">
          <p className="text-sm font-medium text-gray-700">
            Enter the email you used to claim your profile to continue:
          </p>
          <div className="mt-2 flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="you@example.com"
              autoFocus
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              onClick={() => handleCheckout(showEmailInput)}
              disabled={loading || !email}
              className="shrink-0 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? "..." : "Continue"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <p className="mt-2 text-xs text-gray-400">
            Haven't claimed your profile yet?{" "}
            <Link href="/search" className="text-teal-600 hover:underline">Find and claim it first</Link> (free).
          </p>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-gray-400">
        Payment never influences ranking position. Your AgentScore is calculated from public data only.
      </p>
    </div>
  );
}
