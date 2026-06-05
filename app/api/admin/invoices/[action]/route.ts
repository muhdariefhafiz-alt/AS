import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getAdminSession } from "../../../../lib/admin-auth";
import { sendEmail } from "../../../../lib/email";

// POST /api/admin/invoices/{paid|waive|dispute}
// Body: { completionId: number, reason?: string }
// Auth: admin session cookie.

const ACTIONS = new Set(["paid", "waive", "dispute"]);

type Props = { params: Promise<{ action: string }> };

export async function POST(req: Request, { params }: Props) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { action } = await params;
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  }

  try {
    const { completionId, reason } = await req.json();
    const id = Number(completionId);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid completionId" }, { status: 400 });
    }

    const sb = supabaseAdmin();
    const { data: completion } = await sb
      .from("sg_lead_completions")
      .select("id, lead_id, agent_id, fee_status, platform_fee_amt, invoice_reference, note")
      .eq("id", id)
      .single();
    if (!completion) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    let patch: Record<string, unknown> = {};
    let auditAction = "";

    if (action === "paid") {
      if (completion.fee_status === "paid") {
        return NextResponse.json({ ok: true, already: true });
      }
      patch = { fee_status: "paid", paid_at: nowIso };
      auditAction = "invoice_mark_paid";
    } else if (action === "waive") {
      if (typeof reason !== "string" || reason.trim().length < 3) {
        return NextResponse.json(
          { ok: false, error: "Waive reason required (min 3 chars)." },
          { status: 400 }
        );
      }
      patch = {
        fee_status: "waived",
        note: appendNote(completion.note, `WAIVED by ${session.email}: ${reason.trim()}`),
      };
      auditAction = "invoice_waive";
    } else {
      // dispute
      patch = {
        fee_status: "disputed",
        note: appendNote(
          completion.note,
          `DISPUTED by ${session.email}: ${typeof reason === "string" ? reason.trim() : ""}`
        ),
      };
      auditAction = "invoice_dispute";
    }

    const { error: updErr } = await sb
      .from("sg_lead_completions")
      .update(patch)
      .eq("id", id);
    if (updErr) {
      console.error("[admin/invoices] update failed", updErr);
      return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
    }

    // Audit trail.
    await sb.from("admin_audit_log").insert({
      admin_identifier: session.email,
      action: auditAction,
      target_type: "sg_lead_completions",
      target_id: String(id),
      detail: {
        invoice_reference: completion.invoice_reference,
        fee_amount: completion.platform_fee_amt,
        reason: typeof reason === "string" ? reason : null,
      },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
    });

    await sb.from("sg_lead_events").insert({
      lead_id: completion.lead_id,
      agent_id: completion.agent_id,
      event_type: `admin_${auditAction}`,
      meta: { admin: session.email, reference: completion.invoice_reference },
    });

    // On paid: emit the canonical monetization event (North Star), then notify
    // seller + agent that the completion is verified (activates the badge).
    if (action === "paid") {
      await sb.from("sg_lead_events").insert({
        lead_id: completion.lead_id,
        agent_id: completion.agent_id,
        event_type: "invoice_paid",
        meta: { amount: completion.platform_fee_amt, reference: completion.invoice_reference },
      });
      await notifyPaid(sb, completion.lead_id, completion.agent_id).catch((e) =>
        console.error("[admin/invoices] paid notify failed", e)
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/invoices] unexpected", err);
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}

function appendNote(existing: string | null, line: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const entry = `[${stamp}] ${line}`;
  return existing ? `${existing}\n${entry}` : entry;
}

async function notifyPaid(
  sb: ReturnType<typeof supabaseAdmin>,
  leadId: number,
  agentId: number
): Promise<void> {
  const [{ data: lead }, { data: agent }] = await Promise.all([
    sb.from("sg_leads").select("email, full_name, town, district_code, property_type").eq("id", leadId).single(),
    sb.from("sg_agents").select("name, email, claimed_email, slug").eq("id", agentId).single(),
  ]);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
  const agentEmail = agent?.claimed_email ?? agent?.email ?? null;
  if (agentEmail) {
    await sendEmail({
      to: agentEmail,
      subject: "Payment received — your verified completion is live",
      html: agentPaidHtml({
        agentName: agent?.name ?? "",
        profileUrl: agent?.slug ? `${site}/property-agents/agent/${agent.slug}` : site,
      }),
      metric: "Agent Invoice",
      properties: { kind: "paid", agent_id: agentId },
    });
  }
  // Confirm to the seller that their completed sale is now on record.
  if (lead?.email) {
    const area = lead.town ?? lead.district_code ?? "your area";
    await sendEmail({
      to: lead.email,
      subject: "Your sale is confirmed on FairComparisons",
      html: sellerVerifiedHtml({
        name: lead.full_name ?? "",
        agentName: agent?.name ?? "your agent",
        area,
      }),
      metric: "Seller Completion Verified",
      properties: { kind: "verified", lead_id: leadId },
    });
  }
}

function sellerVerifiedHtml({
  name,
  agentName,
  area,
}: {
  name: string;
  agentName: string;
  area: string;
}): string {
  const first = name.split(" ")[0] || "";
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb">
<tr><td align="center" style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="background:#ffffff;border-radius:12px;overflow:hidden">
  <tr><td style="background:#0a1733;padding:24px 32px">
    <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">FairComparisons</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#111827">${first}, your sale in ${area} is confirmed.</p>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6">
      Thanks for using FairComparisons to find ${agentName}. We hope it went smoothly.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function agentPaidHtml({
  agentName,
  profileUrl,
}: {
  agentName: string;
  profileUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb">
<tr><td align="center" style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="background:#ffffff;border-radius:12px;overflow:hidden">
  <tr><td style="background:#0a1733;padding:24px 32px">
    <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">FairComparisons</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827">${agentName}, payment received.</p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6">
      Thank you. Your verified completion is now live on your public profile, a trust signal future sellers see when comparing agents.
    </p>
    <p style="margin:0 0 16px">
      <a href="${profileUrl}" style="display:inline-block;background:#1f44ff;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        View your profile
      </a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
