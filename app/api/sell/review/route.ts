import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

// Public review submission. Authenticated purely by lead token; we only
// accept reviews for leads that have a logged completion (sg_lead_completions
// row with non-null completion_date) so we can stamp verified_completion=true.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      token,
      rating_overall,
      comment,
      seller_initials,
      pdpa_consent_review,
    } = body ?? {};

    if (typeof token !== "string" || token.length < 8 || token.length > 64) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }
    const rating = Number(rating_overall);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be 1–5." },
        { status: 400 }
      );
    }
    if (typeof comment !== "string" || comment.trim().length < 10) {
      return NextResponse.json(
        { error: "Comment must be at least 10 characters." },
        { status: 400 }
      );
    }
    if (comment.length > 500) {
      return NextResponse.json(
        { error: "Comment is too long (max 500 chars)." },
        { status: 400 }
      );
    }
    if (pdpa_consent_review !== true) {
      return NextResponse.json(
        {
          error:
            "Public review consent is required (PDPA). Tick the consent box to continue.",
        },
        { status: 400 }
      );
    }
    const initials =
      typeof seller_initials === "string" && seller_initials.length > 0
        ? seller_initials.toUpperCase().replace(/[^A-Z. ]/g, "").slice(0, 6)
        : null;

    const sb = supabaseAdmin();
    const { data: lead } = await sb
      .from("sg_leads")
      .select("id, token, full_name")
      .eq("token", token)
      .single();
    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const { data: completion } = await sb
      .from("sg_lead_completions")
      .select("id, agent_id, otp_signed_at, completion_date")
      .eq("lead_id", lead.id)
      .single();
    if (!completion) {
      return NextResponse.json(
        { error: "No instruction on file for this token." },
        { status: 404 }
      );
    }
    // Allow review once OTP is signed (the seller's experience of the agent
    // is fully formed at OTP; legal completion is 8–12 weeks of admin later).
    if (!completion.otp_signed_at) {
      return NextResponse.json(
        {
          error:
            "Reviews open once OTP is signed. Check back after your sale agreement is in.",
        },
        { status: 409 }
      );
    }

    const verified = Boolean(completion.completion_date);
    const stamp = new Date().toISOString();
    const fallbackInitials =
      String(lead.full_name ?? "")
        .split(/\s+/)
        .map((s: string) => s.charAt(0).toUpperCase())
        .join("")
        .slice(0, 4) || "Anonymous";

    const { error: insertErr } = await sb
      .from("sg_agent_reviews")
      .upsert(
        {
          agent_id: completion.agent_id,
          completion_id: completion.id,
          lead_id: lead.id,
          rating_overall: rating,
          comment: comment.trim(),
          seller_initials: initials ?? fallbackInitials,
          verified_completion: verified,
          pdpa_consent_review: true,
          status: "published",
          updated_at: stamp,
        },
        { onConflict: "completion_id" }
      );
    if (insertErr) {
      console.error("[sell/review] insert failed", insertErr);
      return NextResponse.json(
        { error: "Could not save your review." },
        { status: 500 }
      );
    }

    // Refresh sg_agents.review_aggregate (avg, count, last_reviewed_at).
    const { data: agentReviews } = await sb
      .from("sg_agent_reviews")
      .select("rating_overall")
      .eq("agent_id", completion.agent_id)
      .eq("status", "published");
    const ratings = (agentReviews ?? [])
      .map((r) => Number(r.rating_overall))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
    const avg =
      ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null;
    await sb
      .from("sg_agents")
      .update({
        review_aggregate: {
          avg: avg !== null ? Math.round(avg * 10) / 10 : null,
          count: ratings.length,
          last_reviewed_at: stamp,
        },
      })
      .eq("id", completion.agent_id);

    await sb.from("sg_lead_events").insert({
      lead_id: lead.id,
      agent_id: completion.agent_id,
      event_type: "submit_review",
      meta: { rating, verified },
    });

    return NextResponse.json({ success: true, verified });
  } catch (err) {
    console.error("[sell/review] unexpected", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
