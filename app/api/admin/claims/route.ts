import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "../../../lib/admin-auth";
import { sendEmail } from "../../../lib/email";
import { AGENT_TERMS_VERSION } from "../../../lib/agent-terms";
import { PLATFORM_FEE_PCT } from "../../../lib/fee";
import { givenName } from "../../../lib/names";
import { escapeHtml } from "../../../lib/escapeHtml";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/admin/claims
 * Body: { claimId: number, decision: "approve" | "reject" }
 * Auth: admin session cookie.
 *
 * Handles claim requests that could not be auto-verified by email (no on-file
 * address). The admin vets identity out of band, then approves here: this
 * marks the agent claimed, records the blanket agreement, and emails the agent.
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { claimId, decision } = await req.json();
    if (!["approve", "reject"].includes(decision)) {
      return NextResponse.json({ ok: false, error: "Invalid decision" }, { status: 400 });
    }
    if (typeof claimId !== "number") {
      return NextResponse.json({ ok: false, error: "Invalid claimId" }, { status: 400 });
    }

    const { data: claim } = await supabase
      .from("sg_claim_requests")
      .select("id, agent_id, email, status")
      .eq("id", claimId)
      .single();
    if (!claim) {
      return NextResponse.json({ ok: false, error: "Claim not found" }, { status: 404 });
    }
    if (claim.status !== "manual_review") {
      return NextResponse.json({ ok: false, error: "Claim is not pending review" }, { status: 409 });
    }

    if (decision === "reject") {
      await supabase.from("sg_claim_requests").update({ status: "rejected" }).eq("id", claimId);
      await audit(session.email, "claim_reject", claim.agent_id, claim.email);
      return NextResponse.json({ ok: true });
    }

    // --- approve ---
    const { data: agent } = await supabase
      .from("sg_agents")
      .select("id, name, slug, score, agency_name, cea_registration, claimed")
      .eq("id", claim.agent_id)
      .single();
    if (!agent) {
      return NextResponse.json({ ok: false, error: "Agent not found" }, { status: 404 });
    }
    if (agent.claimed) {
      // Already claimed via another path; close this request out.
      await supabase.from("sg_claim_requests").update({ status: "rejected" }).eq("id", claimId);
      return NextResponse.json({ ok: false, error: "Agent already claimed" }, { status: 409 });
    }

    const nowIso = new Date().toISOString();

    await supabase
      .from("sg_agents")
      .update({ claimed: true, claimed_email: claim.email, claimed_at: nowIso })
      .eq("id", agent.id);

    await supabase
      .from("sg_claim_requests")
      .update({ status: "approved", verified_at: nowIso })
      .eq("id", claimId);

    // Record the blanket agent agreement. Consent chain: the agent submitted the
    // claim form (which presents the terms) and an admin verified identity out of
    // band. Source marks it as admin-approved rather than email-clicked.
    await supabase.from("sg_agent_agreements").insert({
      agent_id: agent.id,
      cea_registration: agent.cea_registration ?? null,
      terms_version: AGENT_TERMS_VERSION,
      fee_pct: PLATFORM_FEE_PCT,
      signatory_name: agent.name ?? null,
      signatory_email: claim.email,
      ip: null,
      user_agent: "admin-approval",
      source: "admin_claim_review",
    });

    // Notify the agent at the (now admin-vetted) submitted email.
    try {
      await sendEmail({
        to: claim.email,
        subject: "Your profile claim is approved",
        html: buildApprovedEmail(agent.name ?? "", agent.slug ?? ""),
        metric: "Agent Claimed",
        properties: {
          agent_id: agent.id,
          agent_slug: agent.slug ?? "",
          source: "admin_claim_review",
        },
      });
    } catch (err) {
      console.error("[admin/claims] approval email failed:", err);
    }

    if (agent.slug) {
      try {
        revalidatePath(`/property-agents/agent/${agent.slug}`);
      } catch (err) {
        console.error("[admin/claims] revalidate failed:", err);
      }
    }

    await audit(session.email, "claim_approve", agent.id, claim.email);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}

async function audit(
  adminEmail: string,
  action: string,
  agentId: number | null,
  claimEmail: string
) {
  try {
    await supabase.from("admin_audit_log").insert({
      admin_identifier: adminEmail,
      action,
      target_type: "sg_claim_requests",
      target_id: agentId != null ? String(agentId) : null,
      detail: { claim_email: claimEmail },
    });
  } catch (err) {
    console.error("[admin/claims] audit log failed:", err);
  }
}

function buildApprovedEmail(name: string, slug: string): string {
  const first = escapeHtml(givenName(name) || "there");
  const dashboardUrl = "https://fair-comparisons.com/dashboard";
  const profileUrl = `https://fair-comparisons.com/property-agents/agent/${slug}`;
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
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827">${first}, your profile claim is approved.</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6">
      Our team verified your request. You can now manage your profile and receive seller leads in your area.
    </p>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding-right:8px">
        <a href="${dashboardUrl}?utm_source=claim_approved&utm_medium=email" style="display:inline-block;background:#1f44ff;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Open your dashboard</a>
      </td>
      <td>
        <a href="${profileUrl}?utm_source=claim_approved&utm_medium=email" style="display:inline-block;border:1px solid #d1d5db;color:#374151;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px">View public page</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5">FairComparisons. Rankings based on CEA transaction data, not advertising.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
