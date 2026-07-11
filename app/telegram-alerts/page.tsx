import { supabaseAdmin } from "../lib/supabase";
import TelegramInterestButton from "./TelegramInterestButton";
import type { Metadata } from "next";

// Fake door for Telegram lead alerts (roadmap item 8). Telegram is the only
// free, officially automatable push channel available while WhatsApp API is
// vetoed, but with a near-empty claimed-agent funnel we measure demand before
// building the bot. Every view and every explicit "I want this" click is a
// funnel event; the bot gets built when interest crosses the threshold
// (10 clicks), not before.

export const metadata: Metadata = {
  title: "Telegram lead alerts | FairComparisons",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ src?: string }> };

export default async function TelegramAlertsPage({ searchParams }: Props) {
  const { src } = await searchParams;
  const sb = supabaseAdmin();
  await sb
    .from("sg_funnel_events")
    .insert({
      event: "telegram_fake_door_view",
      metadata: { src: (src ?? "direct").slice(0, 40) },
    })
    .then(
      () => undefined,
      (e: unknown) => console.error("[telegram-alerts] view log failed", e)
    );

  return (
    <section className="bg-gray-50 py-16">
      <div className="mx-auto max-w-[560px] px-5 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--blue-deep)]">
          Coming soon
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-gray-900 md:text-3xl">
          Instant lead alerts on Telegram.
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          When a homeowner shortlists you, a Telegram message reaches you in
          seconds so you can quote before the 24 hour window closes. We are
          building this now and switch it on for the agents who want it first.
        </p>
        <div className="mt-6">
          <TelegramInterestButton src={(src ?? "direct").slice(0, 40)} />
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Free for agents. Alerts only, never marketing. Your ranking is
          computed from public transaction data and never changes based on
          participation.
        </p>
      </div>
    </section>
  );
}
