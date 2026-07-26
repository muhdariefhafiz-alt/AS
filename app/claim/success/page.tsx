import Link from "next/link";
import { SkylineStrip } from "../../components/LineArt";

// The moment an agent becomes a member: worth a beat of celebration. Staggered
// load-in (CSS-only, reduced-motion safe), skyline signature, hairline CTA.
export default function ClaimSuccessPage() {
  return (
    <div className="mx-auto max-w-[600px] px-5 py-20 text-center">
      <div className="fc-hero-in fc-hero-in--1 mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--ok-wash)" }}>
        <span className="text-3xl" style={{ color: "var(--ok)" }}>&#10003;</span>
      </div>
      <h1 className="fc-hero-in fc-hero-in--2 mt-6 text-3xl font-extrabold text-gray-900">
        Profile claimed. <span className="italic-serif" style={{ fontWeight: 400, color: "var(--blue)" }}>Welcome.</span>
      </h1>
      <p className="fc-hero-in fc-hero-in--3 mt-3 text-gray-600">
        Your profile is verified. Complete it now: your inbox, viewing planner and
        Deal Radar are already waiting in your dashboard.
      </p>
      <div className="fc-hero-in fc-hero-in--4 mt-8 space-y-3">
        <Link href="/dashboard" className="fc-btn fc-btn--primary fc-btn--block fc-btn--hairline">
          Complete your profile
        </Link>
        <Link
          href="/search"
          className="block text-sm hover:underline"
          style={{ color: "var(--blue)" }}
        >
          Find your profile
        </Link>
      </div>
      <div className="fc-hero-in fc-hero-in--5" style={{ marginTop: 48, color: "var(--line-2)", overflow: "hidden" }}>
        <SkylineStrip width={460} style={{ maxWidth: "100%" }} />
      </div>
    </div>
  );
}
