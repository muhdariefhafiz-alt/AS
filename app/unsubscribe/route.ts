import { NextResponse } from "next/server";
import { supabaseAdmin } from "../lib/supabase";

// Unsubscribe handler for agent + subscriber emails. The digest and notification
// emails link here with ?email=. Sets the agent email opt-out and the subscriber
// unsubscribed flag (previously these links were dangling / 404).
export async function GET(req: Request) {
  const email = (new URL(req.url).searchParams.get("email") || "").trim();

  const page = (heading: string, body: string, status = 200) =>
    new NextResponse(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading}</title></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f6f8;color:#0a1733">
<div style="max-width:520px;margin:64px auto;padding:32px;background:#fff;border-radius:12px;border:1px solid #e5e7eb">
<p style="margin:0 0 16px;font-size:18px;font-weight:700">FairComparisons</p>
<h1 style="margin:0 0 8px;font-size:22px">${heading}</h1>
<p style="margin:0;font-size:15px;color:#374151;line-height:1.6">${body}</p>
</div></body></html>`,
      { status, headers: { "content-type": "text/html; charset=utf-8" } }
    );

  if (!email) return page("No email specified", "This unsubscribe link is missing an email address.", 400);

  try {
    const sb = supabaseAdmin();
    // Exact match: the link carries the stored email round-tripped, and eq avoids
    // ilike treating "_" / "%" in an address as wildcards (over-matching).
    await sb.from("sg_agents").update({ email_opt_out_at: new Date().toISOString() }).eq("claimed_email", email);
    await sb.from("sg_email_subscribers").update({ unsubscribed: true }).eq("email", email);
  } catch {
    return page("Something went wrong", "We could not process that just now. Please try again shortly.", 500);
  }

  return page(
    "You are unsubscribed",
    "You will no longer receive standing updates or activity emails from FairComparisons. You can re-enable them anytime from your dashboard."
  );
}
