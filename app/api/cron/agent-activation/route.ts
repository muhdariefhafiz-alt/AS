import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { buildActivationEmail, type ActivationAgent } from "../../../lib/activation-emails";

// Lifecycle ACTIVATION flow (Resend). A newly-claimed agent with an incomplete
// profile gets up to 4 onboarding emails on a T+0 / +2d / +4d / +7d cadence,
// each attacking their biggest remaining gap. They DROP OUT the moment their
// core profile is complete (photo + message + WhatsApp + bio) — that is the
// aha. Only agents claimed within the last 10 days enter, so this never blasts
// long-claimed incomplete profiles. Gated behind CRON_SECRET; suppression on
// dead/opted-out emails; signed unsubscribe on every send.

// Minimum days since claim before each step may send. Index = step number.
const THRESHOLD_DAYS = [0, 0, 2, 4, 7];
const MIN_GAP_MS = 20 * 60 * 60 * 1000; // never two activation emails within ~a day
const ENTRY_WINDOW_DAYS = 10;
const BATCH = 200;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const sb = supabaseAdmin();
  const now = Date.now();
  const entryCutoff = new Date(now - ENTRY_WINDOW_DAYS * 86400000).toISOString();

  const { data: agents } = await sb
    .from("sg_agents")
    .select("id, name, email, slug, primary_area, photo_url, message, whatsapp, bio, claimed_at, activation_step, activation_last_sent_at, email_status, email_opt_out_at")
    .eq("claimed", true)
    .gte("claimed_at", entryCutoff)
    .lt("activation_step", 4)
    .not("email", "is", null)
    .is("email_opt_out_at", null)
    // Incomplete = at least one core conversion field still missing.
    .or("photo_url.is.null,message.is.null,whatsapp.is.null,bio.is.null")
    .order("claimed_at", { ascending: true })
    .limit(BATCH);

  if (!agents || agents.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const DEAD = new Set(["no_mx", "bounced", "complained"]);
  let sent = 0;
  const byStep: Record<number, number> = {};

  for (const a of agents) {
    try {
      if (!a.email || DEAD.has(String(a.email_status ?? ""))) continue;
      if (!a.claimed_at) continue;

      const nextStep = (a.activation_step ?? 0) + 1;
      if (nextStep > 4) continue;

      const ageDays = (now - new Date(String(a.claimed_at)).getTime()) / 86400000;
      if (ageDays < THRESHOLD_DAYS[nextStep]) continue;

      const last = a.activation_last_sent_at ? new Date(String(a.activation_last_sent_at)).getTime() : 0;
      if (now - last < MIN_GAP_MS) continue;

      const built = buildActivationEmail(nextStep, a as ActivationAgent);
      if (!built) continue;

      const res = await sendEmail({
        to: String(a.email),
        subject: built.subject,
        html: built.html,
        metric: "Agent Activation",
        properties: { step: nextStep, agent_slug: a.slug },
      });
      if ((res as { error?: string }).error) continue;

      await sb
        .from("sg_agents")
        .update({ activation_step: nextStep, activation_last_sent_at: new Date(now).toISOString() })
        .eq("id", a.id);

      sent += 1;
      byStep[nextStep] = (byStep[nextStep] ?? 0) + 1;
    } catch (e) {
      console.error("[cron/agent-activation] agent failed", a.id, e);
    }
  }

  return NextResponse.json({ ok: true, scanned: agents.length, sent, byStep });
}
