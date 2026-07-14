import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "../../../lib/admin-auth";
import { sendEmail } from "../../../lib/email";
import { emailShell, p, rows, statCard } from "../../../lib/email-layout";
import { AGENT_TERMS_VERSION } from "../../../lib/agent-terms";
import { greetName } from "../../../lib/names";
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
      fee_pct: 0,
      signatory_name: agent.name ?? null,
      signatory_email: claim.email,
      ip: null,
      user_agent: "admin-approval",
      source: "admin_claim_review",
    });

    // Notify the agent at the (now admin-vetted) submitted email.
    try {
      const first = escapeHtml(greetName(agent.name ?? "") || "there");
      const dashboardUrl = "https://fair-comparisons.com/dashboard?utm_source=claim_approved&utm_medium=email";
      const profileUrl = agent.slug
        ? `https://fair-comparisons.com/property-agents/agent/${agent.slug}?utm_source=claim_approved&utm_medium=email`
        : null;

      const bodyParts = [
        p(
          "Your profile is live and sellers can now invite you to quote." +
            (profileUrl ? ` You can view your public page <a href="${profileUrl}">here</a>.` : "")
        ),
      ];
      if (typeof agent.score === "number") {
        bodyParts.push(statCard(String(Math.round(Number(agent.score))), "AgentScore"));
        bodyParts.push(p("Your AgentScore is computed only from your CEA record."));
      }
      bodyParts.push(
        p(
          "Agents who complete these three convert far more of the sellers who view them:"
        )
      );
      bodyParts.push(
        rows(
          [
            "Add a professional photo",
            "Add your WhatsApp number (this is how seller leads reach you fastest)",
            "Write two lines on how you work",
          ],
          true
        )
      );

      const html = emailShell({
        preheader: "Add your photo and WhatsApp so sellers know who they are picking.",
        heading: `${first}, your profile is live. 3 things to finish it.`,
        bodyHtml: bodyParts.join(""),
        cta: { label: "Complete your profile", href: dashboardUrl },
        footerNote: "You will get a short weekly report on your leads and views. Manage or turn off anytime.",
      });

      await sendEmail({
        to: claim.email,
        subject: `${first}, your profile is live. 3 things to finish it.`,
        html,
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
