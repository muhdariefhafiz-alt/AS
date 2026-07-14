import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAdminSession } from "../../../lib/admin-auth";
import { sendBatchEmails } from "../../../lib/email";
import { emailShell, p, muted } from "../../../lib/email-layout";
import type { BroadcastAudience } from "../../../lib/broadcasts";

// Operator email blast: the reach channel that broadcasts cannot cover. In-app
// broadcasts only reach agents who log in; most claimed agents check email, not
// the dashboard. Same cohort model as broadcasts, but email carries a hard
// safety floor that the audience filter can only NARROW, never widen:
//   claimed = true          (never email scraped/unclaimed addresses)
//   email_opt_out_at IS NULL (respect one-click unsubscribe)
//   claimed_email present    (nothing to send to otherwise)
// This mirrors every other marketing sender in the codebase (standing-digest,
// activation, weekly-digest) so a blast can never resurrect the outreach drip
// or hit an unconsented address.

const SEND_CAP = 2000; // domain-reputation guard; a bigger cohort sends the first CAP and reports the remainder

type Recipient = { id: number; name: string | null; slug: string | null; claimed_email: string };

// Eligible recipients for an audience. `claimed` in the audience is ignored on
// purpose: email is claimed-only, full stop. Tier + area narrow from there.
function eligible(sb: ReturnType<typeof supabaseAdmin>, aud: BroadcastAudience) {
  let q = sb
    .from("sg_agents")
    .select("id, name, slug, claimed_email")
    .eq("claimed", true)
    .is("email_opt_out_at", null)
    .not("claimed_email", "is", null);
  if (aud.tier?.length) {
    q = aud.tier.includes("free")
      ? q.or(`subscription_tier.is.null,subscription_tier.in.(${aud.tier.join(",")})`)
      : q.in("subscription_tier", aud.tier);
  }
  if (aud.area?.length) q = q.in("primary_area", aud.area);
  return q;
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = supabaseAdmin();
  const { count } = await sb
    .from("sg_agents")
    .select("id", { count: "exact", head: true })
    .eq("claimed", true)
    .is("email_opt_out_at", null)
    .not("claimed_email", "is", null);
  return NextResponse.json({ eligibleTotal: count ?? 0, sendCap: SEND_CAP, hasProvider: !!process.env.RESEND_API_KEY });
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    action: "preview" | "send";
    audience?: BroadcastAudience;
    subject?: string;
    heading?: string;
    intro?: string;
    cta_label?: string;
    cta_href?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const sb = supabaseAdmin();
  const aud = body.audience ?? {};

  if (body.action === "preview") {
    // head+count on the eligible query. Re-run the filter for a head count.
    let q = sb
      .from("sg_agents")
      .select("id", { count: "exact", head: true })
      .eq("claimed", true)
      .is("email_opt_out_at", null)
      .not("claimed_email", "is", null);
    if (aud.tier?.length) {
      q = aud.tier.includes("free")
        ? q.or(`subscription_tier.is.null,subscription_tier.in.(${aud.tier.join(",")})`)
        : q.in("subscription_tier", aud.tier);
    }
    if (aud.area?.length) q = q.in("primary_area", aud.area);
    const { count } = await q;
    return NextResponse.json({ recipients: count ?? 0, cap: SEND_CAP });
  }

  if (body.action === "send") {
    const subject = String(body.subject ?? "").trim();
    const heading = String(body.heading ?? "").trim() || subject;
    const intro = String(body.intro ?? "").trim();
    if (!subject || !intro) return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });

    const { data, error } = await eligible(sb, aud).limit(SEND_CAP);
    if (error) return NextResponse.json({ error: "Could not load recipients." }, { status: 500 });
    const recipients = ((data ?? []) as Recipient[]).filter((r) => r.claimed_email);
    if (!recipients.length) return NextResponse.json({ ok: true, sent: 0, failed: 0, reason: "no eligible recipients" });

    const ctaLabel = body.cta_label?.trim();
    const ctaHref = body.cta_href?.trim();
    const cta = ctaLabel && ctaHref ? { label: ctaLabel, href: ctaHref } : undefined;

    // Split the intro on blank lines into paragraphs so the operator can write
    // multi-paragraph copy in the textarea. HTML is escaped (operator-authored,
    // but never trust free text into an email body).
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const paras = intro.split(/\n\s*\n/).map((para) => p(esc(para).replace(/\n/g, "<br>"))).join("");

    const emails = recipients.map((r) => ({
      to: r.claimed_email,
      subject,
      html: emailShell({
        preheader: subject,
        heading,
        bodyHtml: paras + muted("You are receiving this because you claimed your profile on FairComparisons."),
        cta,
        footerNote: "Product update from FairComparisons.",
        unsubscribeEmail: r.claimed_email,
      }),
      metric: "Operator Blast",
    }));

    const provider = !!process.env.RESEND_API_KEY;
    if (!provider) {
      return NextResponse.json({ ok: true, sent: 0, failed: 0, dryRun: true, wouldSend: emails.length, reason: "no RESEND_API_KEY: dry run" });
    }

    const results = await sendBatchEmails(emails);
    const okSet = new Map(results.map((r) => [r.to, r.ok]));
    const sent = results.filter((r) => r.ok).length;
    const failed = results.length - sent;

    // Log each send to sg_outreach so opens/clicks/claims attribute back and the
    // operator has an audit trail. batch_id groups this blast.
    const batchId = `blast_${session.email.split("@")[0]}_${subject.slice(0, 24).replace(/\W+/g, "_")}`;
    const rows = recipients.map((r) => {
      const ok = okSet.get(r.claimed_email) ?? false;
      return {
        agent_id: r.id,
        agent_name: r.name,
        agent_email: r.claimed_email,
        campaign: "admin_blast",
        template: "operator_blast",
        email_subject: subject,
        email_sent: ok,
        email_sent_at: ok ? new Date().toISOString() : null,
        status: ok ? "sent" : "failed",
        sent_at: ok ? new Date().toISOString() : null,
        batch_id: batchId,
      };
    });
    await sb.from("sg_outreach").insert(rows);

    return NextResponse.json({ ok: true, sent, failed, capped: recipients.length >= SEND_CAP });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
