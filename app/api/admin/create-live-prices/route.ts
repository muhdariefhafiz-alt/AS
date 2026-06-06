import { NextResponse } from "next/server";
import { getStripe } from "../../../lib/stripe";

// TEMPORARY one-shot setup route. Creates the three subscription prices using
// the STRIPE_SECRET_KEY already configured in Vercel (so no key is pasted
// anywhere), and returns the resulting price IDs (which are not secret).
// Token-gated, and DELETED immediately after use.
const SETUP_TOKEN = "fc-px-setup-7Qm2Lx9v";

const TIERS = [
  { key: "verified", name: "FairComparisons Verified", amount: 2900 },
  { key: "professional", name: "FairComparisons Professional", amount: 6900 },
  { key: "elite", name: "FairComparisons Elite", amount: 14900 },
] as const;

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== SETUP_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const stripe = getStripe();
    const prices: Record<string, string> = {};
    let livemode = false;
    for (const t of TIERS) {
      const price = await stripe.prices.create({
        unit_amount: t.amount,
        currency: "sgd",
        recurring: { interval: "month" },
        product_data: { name: t.name },
      });
      prices[t.key] = price.id;
      livemode = price.livemode;
    }
    return NextResponse.json({ livemode, prices });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
