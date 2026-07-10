import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "../../lib/email";
import { checkRateLimit, clientIp } from "../../lib/rateLimit";
import { emailShell, p } from "../../lib/email-layout";

// Use service role key for server-side API route (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);

    const { limited } = await checkRateLimit(`subscribe:${ip}`, 3, 60 * 60 * 1000);
    if (limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, source, pagePath, districtTag, consent } = body;

    // Validate string lengths to prevent abuse
    if (typeof source === "string" && source.length > 100) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    if (typeof pagePath === "string" && pagePath.length > 500) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    if (typeof districtTag === "string" && districtTag.length > 100) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    // Validate email
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // PDPA: consent must be explicitly true
    if (consent !== true) {
      return NextResponse.json(
        { error: "Consent is required to subscribe." },
        { status: 400 }
      );
    }

    // Upsert: if email exists, update source/page (don't create duplicate)
    const { error } = await supabase
      .from("sg_email_subscribers")
      .upsert(
        {
          email: email.toLowerCase().trim(),
          source: source || "footer",
          page_path: pagePath || null,
          district_tag: districtTag || null,
          consent: true,
          unsubscribed: false,
        },
        { onConflict: "email" }
      );

    if (error) {
      console.error("Subscribe error:", error);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    // Fire Klaviyo welcome event with full HTML.
    // PDPA: consent=true verified above.
    const normalizedEmail = email.toLowerCase().trim();
    const welcomeHtml = buildWelcomeEmail(normalizedEmail);
    // Await: a fire-and-forget promise is dropped when the Vercel lambda freezes
    // after responding, so the Klaviyo event never lands.
    try {
      await sendEmail({
        to: normalizedEmail,
        subject: "Your agent shortlist, and how we rank them",
        html: welcomeHtml,
        metric: "Consumer Welcome",
        properties: {
          source: source || "footer",
          page_path: pagePath || null,
          district_tag: districtTag || null,
          signup_date: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("[subscribe] Klaviyo welcome event failed:", err);
    }

    return NextResponse.json({
      success: true,
      message: "You're subscribed! We'll send you relevant updates.",
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}

function buildWelcomeEmail(recipientEmail: string): string {
  const bodyHtml =
    p(
      "Thanks for using FairComparisons. Two things worth knowing before you pick an agent:"
    ) +
    p(
      "We rank every CEA-registered agent on their <strong>real transaction record</strong>, not on advertising. No agent can pay to rank higher. That is the whole point."
    ) +
    p(
      "And it is free for you. We are paid by optional agent subscriptions, never by taking a cut of your sale."
    );

  return emailShell({
    preheader: "Free for sellers. No agent pays for placement. Ever.",
    heading: "Your agent shortlist, and how we rank them",
    bodyHtml,
    cta: {
      label: "See agents for your home",
      href: "https://fair-comparisons.com/sell?utm_source=welcome&utm_medium=email",
    },
    unsubscribeEmail: recipientEmail,
  });
}
