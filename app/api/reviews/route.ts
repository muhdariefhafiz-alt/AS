import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const { agentId, reviewerName, rating, transactionType, comment } = body;

  if (!agentId || !reviewerName || !rating) {
    return NextResponse.json({ error: "Name and rating are required" }, { status: 400 });
  }

  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }

  if (reviewerName.length > 100) {
    return NextResponse.json({ error: "Name too long" }, { status: 400 });
  }

  if (comment && comment.length > 2000) {
    return NextResponse.json({ error: "Review too long (max 2000 characters)" }, { status: 400 });
  }

  // Rate limit: max 3 reviews per agent per day (by agent, not by user - simple approach)
  const { count } = await supabase
    .from("sg_agent_reviews")
    .select("*", { count: "exact", head: true })
    .eq("agent_id", agentId)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: "Too many reviews for this agent today. Try again tomorrow." }, { status: 429 });
  }

  const { error } = await supabase.from("sg_agent_reviews").insert({
    agent_id: agentId,
    reviewer_name: reviewerName.trim(),
    rating,
    transaction_type: transactionType || null,
    comment: comment?.trim() || null,
  });

  if (error) {
    return NextResponse.json({ error: "Could not submit review" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Review submitted. It will appear after moderation." });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");

  if (!agentId) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sg_agent_reviews")
    .select("id, reviewer_name, rating, transaction_type, comment, created_at")
    .eq("agent_id", agentId)
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: "Could not fetch reviews" }, { status: 500 });
  }

  return NextResponse.json({ reviews: data ?? [] });
}
