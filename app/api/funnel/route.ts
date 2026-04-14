import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    await supabase.from("sg_funnel_events").insert({
      event,
      agent_id: agentId || null,
      agent_slug: agentSlug || null,
      source: source || null,
      page_path: pagePath || null,
      metadata: metadata || {},
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
