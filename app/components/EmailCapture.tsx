"use client";

import { useState } from "react";
import Link from "next/link";

type Variant = "footer" | "inline" | "sidebar";

interface EmailCaptureProps {
  /** Visual variant */
  variant?: Variant;
  /** Where the form appears (for analytics) */
  source?: string;
  /** Current page path (for analytics) */
  pagePath?: string;
  /** District tag if on a district/area page */
  districtTag?: string;
  /** Headline override */
  heading?: string;
  /** Description override */
  description?: string;
}

export default function EmailCapture({
  variant = "footer",
  source,
  pagePath,
  districtTag,
  heading,
  description,
}: EmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const defaultHeading =
    variant === "footer"
      ? "Get property market updates"
      : variant === "sidebar"
        ? "Stay informed"
        : "Get updates for this area";

  const defaultDescription =
    variant === "footer"
      ? "Agent rankings, market trends, and new features. No spam, unsubscribe anytime."
      : variant === "sidebar"
        ? "Rankings, market data, and tips. No spam."
        : "We'll notify you when rankings change or new data is available for this area.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !consent) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: source || variant,
          pagePath,
          districtTag,
          consent: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Track funnel event
        fetch("/api/funnel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "email_capture", source: source || variant, pagePath }),
        }).catch(() => {});
        setStatus("success");
        setMessage(data.message || "You're subscribed!");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Connection error. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className={wrapperClass(variant)} role="status" aria-live="polite">
        <div className="flex items-center gap-2 text-[#1f44ff]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm font-medium">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass(variant)}>
      <div>
        <h3 className={headingClass(variant)}>{heading || defaultHeading}</h3>
        <p className={descClass(variant)}>{description || defaultDescription}</p>
      </div>

      <form onSubmit={handleSubmit} className={formClass(variant)}>
        <div className="flex gap-2">
          <label htmlFor={`email-${variant}-${source || "default"}`} className="sr-only">Email address</label>
          <input
            id={`email-${variant}-${source || "default"}`}
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
            placeholder="your@email.com"
            required
            aria-label="Email address"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#1f44ff] focus:outline-none focus:ring-1 focus:ring-[#1f44ff]"
          />
          <button
            type="submit"
            disabled={status === "loading" || !consent}
            className="shrink-0 rounded-lg bg-[#1f44ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a23cf] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "loading" ? "..." : "Subscribe"}
          </button>
        </div>

        <label className="mt-2 flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1f44ff] focus:ring-[#1f44ff]"
          />
          <span className="text-[11px] leading-tight text-gray-400">
            I agree to receive emails from FairComparisons. You can{" "}
            <Link href="/privacy" className="underline hover:text-gray-600">unsubscribe</Link>{" "}
            at any time. We respect your privacy under PDPA.
          </span>
        </label>

        {status === "error" && (
          <p className="mt-1 text-xs text-red-500" role="alert">{message}</p>
        )}
      </form>
    </div>
  );
}

function wrapperClass(variant: Variant): string {
  switch (variant) {
    case "footer":
      return "space-y-3";
    case "inline":
      return "rounded-xl border border-[var(--line)] bg-[var(--blue-wash)] p-5 space-y-3";
    case "sidebar":
      return "rounded-lg border border-gray-200 bg-white p-5 space-y-3";
  }
}

function headingClass(variant: Variant): string {
  switch (variant) {
    case "footer":
      return "text-xs font-bold uppercase tracking-widest text-gray-400";
    case "inline":
      return "text-sm font-bold text-gray-900";
    case "sidebar":
      return "text-xs font-bold uppercase tracking-widest text-gray-400";
  }
}

function descClass(variant: Variant): string {
  switch (variant) {
    case "footer":
      return "mt-1 text-sm text-gray-500";
    case "inline":
      return "mt-1 text-xs text-gray-600";
    case "sidebar":
      return "mt-1 text-xs text-gray-500";
  }
}

function formClass(variant: Variant): string {
  return variant === "footer" ? "mt-3" : "mt-2";
}

