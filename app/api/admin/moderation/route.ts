import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "../../../lib/admin-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/admin/moderation
 * Body: { type: "message" | "photo" | "bio", agentId: number, decision: "approve" | "reject" }
 * Auth: admin session cookie.
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { type, agentId, decision } = await req.json();

    if (!["message", "photo", "bio"].includes(type)) {
      return NextResponse.json({ ok: false, error: "Invalid type" }, { status: 400 });
    }
    if (!["approve", "reject"].includes(decision)) {
      return NextResponse.json({ ok: false, error: "Invalid decision" }, { status: 400 });
    }
    if (typeof agentId !== "number") {
      return NextResponse.json({ ok: false, error: "Invalid agentId" }, { status: 400 });
    }

    const statusField =
      type === "message" ? "message_status" : type === "photo" ? "photo_status" : "bio_status";
    const contentField = type === "photo" ? "photo_url" : type;
    const newStatus = decision === "approve" ? "approved" : "rejected";

    const updates: Record<string, unknown> = { [statusField]: newStatus };

    // On reject, clear the content so it does not appear publicly
    if (decision === "reject") {
      updates[contentField] = null;
    }

    const { error } = await supabase.from("sg_agents").update(updates).eq("id", agentId);
    if (error) {
      console.error("[admin/moderation] update error:", error);
      return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
    }

    await supabase.from("admin_audit_log").insert({
      admin_identifier: session.email,
      action: `moderation_${decision}_${type}`,
      target_type: "sg_agents",
      target_id: String(agentId),
      detail: { type, decision },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}
