import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "../../lib/email";
import { checkRateLimit, clientIp } from "../../lib/rateLimit";
import { escapeHtml } from "../../lib/escapeHtml";

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
    const welcomeHtml = buildWelcomeEmail(districtTag || null);
    // Await: a fire-and-forget promise is dropped when the Vercel lambda freezes
    // after responding, so the Klaviyo event never lands.
    try {
      await sendEmail({
        to: email.toLowerCase().trim(),
        subject: "Welcome. Here's how we rank agents differently.",
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

function buildWelcomeEmail(districtTag: string | null): string {
  const districtLine = districtTag
    ? `<li>District updates for <strong>${escapeHtml(districtTag)}</strong></li>`
    : "";

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb">
<tr><td align="center" style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="background:#ffffff;border-radius:12px;overflow:hidden">

  <tr><td style="background:#0a1733;padding:24px 32px">
    <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">FairComparisons</p>
  </td></tr>

  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827">You signed up for independent agent rankings.</p>

    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6">
      FairComparisons scores every CEA-registered property agent in Singapore using actual transaction records. No ads, no paid placements, no fake reviews.
    </p>

    <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#111827">What you will receive:</p>
    <ul style="margin:0 0 20px;padding-left:20px;color:#4b5563;line-height:2;font-size:14px;">
      <li>Weekly top agent digest (Mondays)</li>
      ${districtLine}
      <li>Nothing else. No spam.</li>
    </ul>

    <a href="https://fair-comparisons.com/sell?utm_source=welcome&utm_medium=email" style="display:inline-block;background:#1f44ff;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
      Get matched with a top agent
    </a>
  </td></tr>

  <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5">
      FairComparisons. Rankings based on CEA transaction data, not advertising.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}
