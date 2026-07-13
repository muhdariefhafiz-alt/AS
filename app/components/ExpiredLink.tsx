import Link from "next/link";

// Graceful landing for a well-formed but unknown/expired/removed token link
// (e.g. an old email CTA whose comparison no longer exists). A transactional
// email link must never dead-end in a bare 404: recover the user into a fresh
// funnel instead.
export default function ExpiredLink({ kind = "comparison" }: { kind?: string }) {
  return (
    <section className="bg-gray-50">
      <div className="mx-auto max-w-[560px] px-5 py-20 text-center md:px-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--blue-deep)]">Link no longer active</p>
        <h1 className="mt-3 text-2xl font-extrabold text-gray-900">This {kind} is no longer available</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Links like this stop working when a {kind} is removed or expires after inactivity. Starting fresh takes about a minute, and it is always free.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/sell?utm_source=expired_link" className="inline-flex items-center justify-center rounded-lg bg-[var(--blue)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--blue-deep)]">
            Start a fresh comparison
          </Link>
          <Link href="/tools/valuation?utm_source=expired_link" className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Get a free valuation
          </Link>
        </div>
      </div>
    </section>
  );
}
