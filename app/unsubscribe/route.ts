import { NextResponse } from "next/server";
import { supabaseAdmin } from "../lib/supabase";
import { verifyUnsubscribe } from "../lib/unsubscribe";
import { escapeHtml } from "../lib/escapeHtml";

// Unsubscribe handler for agent + subscriber emails. Emails link here with a
// signed ?email=&t= pair (see lib/unsubscribe). Two-step by design:
//   GET  verifies the signature and renders a confirm button (no mutation)
//   POST performs the opt-out
// This closes two holes in the old bare-?email= version: (1) the email alone is
// no longer enough to opt anyone out (an attacker would need the HMAC), and
// (2) the write is POST-only, so link-prefetchers / mail scanners that fetch
// the URL on delivery, and cross-site <img src>, cannot auto-unsubscribe anyone.

function page(heading: string, body: string, status = 200) {
  return new NextResponse(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading}</title></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f6f8;color:#0a1733">
<div style="max-width:520px;margin:64px auto;padding:32px;background:#fff;border-radius:12px;border:1px solid #e5e7eb">
<p style="margin:0 0 16px;font-size:18px;font-weight:700">FairComparisons</p>
<h1 style="margin:0 0 8px;font-size:22px">${heading}</h1>
${body}
</div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

const p = (text: string) =>
  `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6">${text}</p>`;

const invalidLink = () =>
  page("Invalid link", p("This unsubscribe link is not valid. Please use the link from a recent email."), 400);

// GET only confirms; it never mutates. Prefetchers stop here harmlessly.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") || "").trim();
  const token = url.searchParams.get("t");

  if (!email) return page("No email specified", p("This unsubscribe link is missing an email address."), 400);
  if (!verifyUnsubscribe(email, token)) return invalidLink();

  // The email/token are round-tripped through a POST so the opt-out is an
  // explicit user action, not something a link scanner can trigger.
  const esc = escapeHtml(email);
  const tesc = escapeHtml(token);
  return page(
    "Unsubscribe from FairComparisons emails?",
    p(`This will stop standing updates and activity emails to <strong>${esc}</strong>.`) +
      `<form method="POST" action="/unsubscribe">
<input type="hidden" name="email" value="${esc}">
<input type="hidden" name="t" value="${tesc}">
<button type="submit" style="cursor:pointer;border:0;border-radius:8px;background:#0a1733;color:#fff;font-size:15px;font-weight:600;padding:12px 20px">Confirm unsubscribe</button>
</form>`
  );
}

// POST performs the mutation after re-verifying the signature.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") || "").trim();
  const token = String(form?.get("t") || "");

  if (!email || !verifyUnsubscribe(email, token)) return invalidLink();

  try {
    const sb = supabaseAdmin();
    // Exact match: the link carries the stored email round-tripped, and eq avoids
    // ilike treating "_" / "%" in an address as wildcards (over-matching).
    const nowIso = new Date().toISOString();
    await sb.from("sg_agents").update({ email_opt_out_at: nowIso }).eq("claimed_email", email);
    await sb.from("sg_email_subscribers").update({ unsubscribed: true }).eq("email", email);
    // Sellers too: leads carry the same suppression flag, checked by every
    // seller marketing sender (reminder, reactivation, review requests, AVM
    // updates, MOP alerts). Without this the confirmation below was a lie for
    // sellers.
    await sb.from("sg_leads").update({ email_opt_out_at: nowIso }).eq("email", email);
  } catch {
    return page("Something went wrong", p("We could not process that just now. Please try again shortly."), 500);
  }

  return page(
    "You are unsubscribed",
    p("You will no longer receive standing updates or activity emails from FairComparisons. To start receiving them again, contact us and we will re-enable them.")
  );
}
