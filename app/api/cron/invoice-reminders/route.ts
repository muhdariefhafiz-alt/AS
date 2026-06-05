import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { sendWaAsync } from "../../../lib/whatsapp";
import { fmtSgd } from "../../../lib/invoice";

// Daily cron: nudge agents with unpaid invoices.
//
// Schedule: 7d / 14d / 21d after invoice_sent_at, then 28d escalation.
// Idempotent: the last-sent stage is tracked in a JSON marker appended to
// sg_lead_completions.note, so re-running the cron the same day never
// double-sends. Auto-stops when fee_status flips to paid or waived.

const STAGE_DAYS = [7, 14, 21, 28] as const;
const MARKER_RE = /\[dunning:(\d+)\]/;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const sb = supabaseAdmin();
  const { data: invoices } = await sb
    .from("sg_lead_completions")
    .select(
      "id, lead_id, agent_id, platform_fee_amt, invoice_reference, invoice_sent_at, invoice_due_at, fee_status, note"
    )
    .eq("fee_status", "invoiced")
    .is("paid_at", null)
    .not("invoice_sent_at", "is", null)
    .limit(500);

  if (!invoices || invoices.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, escalated: 0 });
  }

  let sent = 0;
  let escalated = 0;

  for (const inv of invoices) {
    try {
      const ageDays = Math.floor(
        (Date.now() - new Date(String(inv.invoice_sent_at)).getTime()) /
          86_400_000
      );
      // Which stage is due? Highest STAGE_DAYS threshold <= ageDays.
      const dueStage = [...STAGE_DAYS].reverse().find((d) => ageDays >= d);
      if (!dueStage) continue;

      const lastSent = lastStage(inv.note);
      if (lastSent >= dueStage) continue; // already sent this stage

      const { data: agent } = await sb
        .from("sg_agents")
        .select("name, email, claimed_email, whatsapp")
        .eq("id", inv.agent_id)
        .single();
      const agentEmail = agent?.claimed_email ?? agent?.email ?? null;

      const isEscalation = dueStage === 28;
      const site =
        process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
      const dashLink = `${site}/dashboard`;
      const ref = inv.invoice_reference ?? `#${inv.id}`;
      const amount = inv.platform_fee_amt ?? 0;

      if (agentEmail) {
        await sendEmail({
          to: agentEmail,
          subject: isEscalation
            ? `Action needed: invoice ${ref} is ${ageDays} days overdue`
            : `Reminder: invoice ${ref} (${fmtSgd(amount)})`,
          html: reminderHtml({
            agentName: agent?.name ?? "",
            reference: ref,
            amount,
            ageDays,
            stage: dueStage,
            link: dashLink,
          }),
          metric: "Agent Invoice",
          properties: {
            kind: "reminder",
            stage: dueStage,
            invoice_reference: ref,
          },
        });
      }
      if (agent?.whatsapp && !isEscalation) {
        // WhatsApp only for the gentle nudges; escalation is email + admin.
        sendWaAsync({
          to: String(agent.whatsapp),
          template: "agent_invoice_reminder",
          variables: {
            agent_first_name: (agent.name ?? "").split(" ")[0] || "Hi",
            invoice_reference: ref,
            amount_sgd: fmtSgd(amount),
            link: dashLink,
          },
          metric: "Agent Invoice",
          properties: { kind: "reminder_wa", stage: dueStage },
        });
      }

      // Record the stage marker (idempotency) + escalation event.
      await sb
        .from("sg_lead_completions")
        .update({ note: setStage(inv.note, dueStage) })
        .eq("id", inv.id);

      await sb.from("sg_lead_events").insert({
        lead_id: inv.lead_id,
        agent_id: inv.agent_id,
        event_type: isEscalation ? "dunning_escalation" : "dunning_reminder",
        meta: { stage: dueStage, age_days: ageDays, reference: ref },
      });

      // Fire invoice_overdue once, when the invoice first crosses its 14-day
      // due date unpaid. The stage marker (lastSent) keeps it idempotent.
      if (dueStage >= 14 && lastSent < 14) {
        await sb.from("sg_lead_events").insert({
          lead_id: inv.lead_id,
          agent_id: inv.agent_id,
          event_type: "invoice_overdue",
          meta: { age_days: ageDays, reference: ref, amount },
        });
      }

      if (isEscalation) escalated += 1;
      else sent += 1;
    } catch (e) {
      console.error("[cron/invoice-reminders] row failed", inv.id, e);
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: invoices.length,
    sent,
    escalated,
  });
}

function lastStage(note: string | null): number {
  if (!note) return 0;
  const m = note.match(MARKER_RE);
  return m ? Number(m[1]) : 0;
}

function setStage(note: string | null, stage: number): string {
  const marker = `[dunning:${stage}]`;
  if (!note) return marker;
  if (MARKER_RE.test(note)) return note.replace(MARKER_RE, marker);
  return `${note}\n${marker}`;
}

function reminderHtml({
  agentName,
  reference,
  amount,
  ageDays,
  stage,
  link,
}: {
  agentName: string;
  reference: string;
  amount: number;
  ageDays: number;
  stage: number;
  link: string;
}): string {
  const paynowUen = process.env.FC_PAYNOW_UEN ?? "TBC";
  const tone =
    stage >= 28
      ? `This invoice is now ${ageDays} days overdue. Please settle it or reply to this email if there is an issue, so we can resolve it.`
      : stage >= 14
        ? `A quick nudge: invoice ${reference} is still open. Pay by PayNow to UEN ${paynowUen} with reference ${reference}.`
        : `Just a friendly reminder that invoice ${reference} is due.`;
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
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#111827">${agentName}, invoice ${reference} — ${fmtSgd(amount)}</p>
    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6">${tone}</p>
    <div style="margin:16px 0;padding:14px;background:#eef1ff;border:1px solid #c9d4ff;border-radius:8px">
      <p style="margin:0;font-size:13px;color:#0a1733">
        PayNow UEN: <strong>${paynowUen}</strong><br>Reference: <strong>${reference}</strong><br>Amount: <strong>${fmtSgd(amount)}</strong>
      </p>
    </div>
    <p style="margin:16px 0 0">
      <a href="${link}" style="display:inline-block;background:#1f44ff;color:#ffffff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Open dashboard
      </a>
    </p>
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">Already paid? Reply and we will reconcile within one business day.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
