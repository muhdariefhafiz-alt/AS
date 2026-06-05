import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, clientIp } from "../../lib/rateLimit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Funnel event tracking for Reforge Refinement Phase.
 *
 * Events tracked:
 * - profile_view: agent profile page loaded
 * - claim_banner_view: claim CTA visible in viewport
 * - claim_click: "Claim profile" button clicked
 * - claim_submit: claim form submitted
 * - claim_verified: email verification completed
 * - profile_edit: agent edits their claimed profile
 * - subscription_start: agent starts paid subscription
 * - email_capture: email subscribe form submitted
 * - email_to_claim: email subscriber clicks claim CTA
 */
export async function POST(req: Request) {
  try {
    const { event, agentId, agentSlug, source, pagePath, metadata } = await req.json();

    if (!event || typeof event !== "string" || event.length > 50) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    // Open endpoint: throttle floods that would inflate funnel metrics / bloat
    // the table, and harden the attacker-controlled fields.
    const { limited } = await checkRateLimit(`funnel:${clientIp(req)}`, 120, 10 * 60 * 1000);
    if (limited) {
      return NextResponse.json({ ok: true });
    }

    const agentIdNum = Number(agentId);
    // Cap metadata size so a caller cannot stuff large blobs into the table.
    let safeMeta: Record<string, unknown> = {};
    if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
      if (JSON.stringify(metadata).length <= 2000) safeMeta = metadata;
    }

    await supabase.from("sg_funnel_events").insert({
      event,
      agent_id: Number.isFinite(agentIdNum) && agentIdNum > 0 ? agentIdNum : null,
      agent_slug: typeof agentSlug === "string" ? agentSlug.slice(0, 120) : null,
      source: typeof source === "string" ? source.slice(0, 120) : null,
      page_path: typeof pagePath === "string" ? pagePath.slice(0, 300) : null,
      metadata: safeMeta,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
