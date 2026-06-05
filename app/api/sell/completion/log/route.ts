import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { sendEmail } from "../../../../lib/email";
import {
  buildInvoiceHtml,
  computeInvoiceTotals,
  fmtSgd,
  makeInvoiceReference,
} from "../../../../lib/invoice";
import { PLATFORM_FEE_PCT, GST_PCT } from "../../../../lib/fee";

// Agents log instruction → OTP → completion. Each step is a separate POST so
// the agent can stop anywhere without losing earlier state.
//
// stage="instruction" payload: { instruction_signed_at, commission_pct_final? }
// stage="otp"         payload: { otp_signed_at }
// stage="completion"  payload: { completion_date, sale_price }
//
// Auth = cea_registration + agent_email match against sg_agents (same loose
// pattern as /api/sell/quote and /api/dashboard/lookup).

const STAGES = new Set(["instruction", "otp", "completion"]);

const TYPE_LABEL: Record<string, string> = {
  HDB: "HDB",
  CONDO: "Condo",
  EC: "EC",
  LANDED: "Landed",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      token,
      cea_registration,
      agent_email,
      stage,
      instruction_signed_at,
      otp_signed_at,
      completion_date,
      sale_price,
      commission_pct_final,
    } = body ?? {};

    if (typeof token !== "string" || token.length < 8 || token.length > 64) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }
    if (!STAGES.has(stage)) {
      return NextResponse.json({ error: "Invalid stage." }, { status: 400 });
    }
    if (!cea_registration || !agent_email) {
      return NextResponse.json(
        { error: "CEA reg + email required." },
        { status: 400 }
      );
    }

    const sb = supabaseAdmin();

    const { data: agent, error: agentErr } = await sb
      .from("sg_agents")
      .select("id, name, email, claimed_email, slug")
      .eq("cea_registration", String(cea_registration).trim())
      .single();
    if (agentErr || !agent) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }
    const emailLc = String(agent_email).toLowerCase().trim();
    // Once an agent has claimed (verified email ownership), ONLY their
    // claimed_email authenticates; the scraped public email no longer works,
    // which closes impersonation of claimed agents. Unclaimed agents may still
    // use their on-file email to participate.
    const matches = agent.claimed_email
      ? String(agent.claimed_email).toLowerCase() === emailLc
      : !!agent.email && String(agent.email).toLowerCase() === emailLc;
    if (!matches) {
      return NextResponse.json(
        { error: "Email does not match this CEA registration." },
        { status: 403 }
      );
    }

    const { data: lead } = await sb
      .from("sg_leads")
      .select(
        "id, token, status, property_type, town, district_code, bedrooms, full_name, email"
      )
      .eq("token", token)
      .single();
    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const { data: completion } = await sb
      .from("sg_lead_completions")
      .select(
        "id, agent_id, quote_id, instruction_signed_at, otp_signed_at, completion_date, sale_price, fee_status, invoice_reference, commission_pct_final"
      )
      .eq("lead_id", lead.id)
      .single();
    if (!completion || completion.agent_id !== agent.id) {
      return NextResponse.json(
        { error: "You are not the instructed agent on this lead." },
        { status: 403 }
      );
    }

    const nowIso = new Date().toISOString();

    // ── stage: instruction ────────────────────────────────────────────────
    if (stage === "instruction") {
      const signedAt = instruction_signed_at
        ? new Date(String(instruction_signed_at)).toISOString()
        : nowIso;
      const overridePct =
        commission_pct_final !== undefined && commission_pct_final !== null
          ? Number(commission_pct_final)
          : null;
      if (
        overridePct !== null &&
        (!Number.isFinite(overridePct) || overridePct <= 0 || overridePct > 10)
      ) {
        return NextResponse.json(
          { error: "Override commission must be between 0 and 10%." },
          { status: 400 }
        );
      }
      const patch: Record<string, unknown> = {
        instruction_signed_at: signedAt,
      };
      if (overridePct !== null) patch.commission_pct_final = overridePct;
      await sb
        .from("sg_lead_completions")
        .update(patch)
        .eq("id", completion.id);
      await sb
        .from("sg_leads")
        .update({ status: "instructed" })
        .eq("id", lead.id);
      await sb.from("sg_lead_events").insert({
        lead_id: lead.id,
        agent_id: agent.id,
        event_type: "log_instruction",
        meta: {
          signed_at: signedAt,
          commission_override: overridePct,
        },
      });
      return NextResponse.json({ success: true, stage });
    }

    // ── stage: otp ────────────────────────────────────────────────────────
    if (stage === "otp") {
      const otpAt = otp_signed_at
        ? new Date(String(otp_signed_at)).toISOString()
        : nowIso;
      if (!completion.instruction_signed_at) {
        return NextResponse.json(
          { error: "Log instruction signing first." },
          { status: 409 }
        );
      }
      await sb
        .from("sg_lead_completions")
        .update({ otp_signed_at: otpAt })
        .eq("id", completion.id);
      await sb.from("sg_lead_events").insert({
        lead_id: lead.id,
        agent_id: agent.id,
        event_type: "log_otp",
        meta: { otp_signed_at: otpAt },
      });
      return NextResponse.json({ success: true, stage });
    }

    // ── stage: completion ─────────────────────────────────────────────────
    const salePrice = Number(sale_price);
    if (!Number.isFinite(salePrice) || salePrice <= 0 || salePrice > 1e9) {
      return NextResponse.json(
        { error: "Sale price looks invalid." },
        { status: 400 }
      );
    }
    if (!completion_date) {
      return NextResponse.json(
        { error: "Completion date required." },
        { status: 400 }
      );
    }
    const completionDate = new Date(String(completion_date));
    if (Number.isNaN(completionDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid completion date." },
        { status: 400 }
      );
    }
    if (!completion.otp_signed_at) {
      return NextResponse.json(
        { error: "Log OTP signing first." },
        { status: 409 }
      );
    }

    const finalPct =
      completion.commission_pct_final ??
      null;
    const agentCommissionAmt = finalPct
      ? salePrice * (Number(finalPct) / 100)
      : null;

    const totals = computeInvoiceTotals(salePrice, PLATFORM_FEE_PCT, GST_PCT);
    const reference =
      completion.invoice_reference ?? makeInvoiceReference(completionDate);
    const dueAt = new Date(completionDate.getTime() + 14 * 86_400_000);

    await sb
      .from("sg_lead_completions")
      .update({
        completion_date: completionDate.toISOString().slice(0, 10),
        sale_price: salePrice,
        agent_commission_amt: agentCommissionAmt,
        platform_fee_pct: PLATFORM_FEE_PCT,
        platform_fee_amt: totals.platform_fee_amt,
        fee_status: "invoiced",
        invoice_reference: reference,
        invoice_payment_method: "paynow",
        invoice_sent_at: nowIso,
        invoice_due_at: dueAt.toISOString(),
      })
      .eq("id", completion.id);

    await sb
      .from("sg_leads")
      .update({ status: "completed" })
      .eq("id", lead.id);

    await sb.from("sg_lead_events").insert({
      lead_id: lead.id,
      agent_id: agent.id,
      event_type: "log_completion",
      meta: {
        sale_price: salePrice,
        platform_fee_amt: totals.platform_fee_amt,
        reference,
      },
    });

    const propertySummary = [
      lead.bedrooms ? `${lead.bedrooms}-rm` : "",
      TYPE_LABEL[lead.property_type] ?? lead.property_type,
      "in",
      lead.town ?? lead.district_code ?? "Singapore",
    ]
      .filter(Boolean)
      .join(" ");

    // Fire-and-forget agent invoice.
    sendEmail({
      to: emailLc,
      subject: `Invoice ${reference} · ${fmtSgd(totals.total_due)} due`,
      html: buildInvoiceHtml({
        reference,
        agent_name: agent.name ?? "",
        agent_cea_reg: String(cea_registration).trim(),
        agent_email: emailLc,
        property_summary: propertySummary,
        sale_price: salePrice,
        platform_fee_pct: PLATFORM_FEE_PCT,
        platform_fee_amt: totals.platform_fee_amt,
        gst_pct: GST_PCT,
        total_due: totals.total_due,
        due_at: dueAt.toISOString(),
      }),
      metric: "Agent Invoice",
      properties: {
        lead_token: token,
        invoice_reference: reference,
        amount_sgd: totals.total_due,
      },
    }).catch((e) => console.error("[completion/log] invoice email failed", e));

    // Fire-and-forget seller "sale completed" + review request prompt.
    if (lead.email) {
      const site =
        process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
      const reviewLink = `${site}/sell/review/${token}?utm_source=email`;
      sendEmail({
        to: lead.email,
        subject: `Your sale completed — leave ${agent.name?.split(" ")[0] ?? "your agent"} a review`,
        html: sellerCompletedHtml({
          name: lead.full_name ?? "",
          agentName: agent.name ?? "",
          salePrice: salePrice,
          link: reviewLink,
        }),
        metric: "Seller Completion",
        properties: {
          lead_token: token,
          agent_id: agent.id,
        },
      }).catch((e) =>
        console.error("[completion/log] seller email failed", e)
      );
    }

    return NextResponse.json({
      success: true,
      stage,
      reference,
      total_due: totals.total_due,
    });
  } catch (err) {
    console.error("[completion/log] unexpected", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

function sellerCompletedHtml({
  name,
  agentName,
  salePrice,
  link,
}: {
  name: string;
  agentName: string;
  salePrice: number;
  link: string;
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
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827">${first}, your sale completed.</p>
    <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6">
      Sale price: <strong>${fmtSgd(salePrice)}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6">
      A short review of ${agentName} helps the next seller in your area pick well. Two minutes.
    </p>
    <p style="margin:0 0 16px">
      <a href="${link}" style="display:inline-block;background:#1f44ff;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Leave a review
      </a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
