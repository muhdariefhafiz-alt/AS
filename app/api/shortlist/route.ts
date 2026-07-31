import { NextRequest, NextResponse } from "next/server";
import { getShortlist } from "../../lib/hireData";

export const runtime = "nodejs";

// Powers the F1 interactive matcher: returns the evidence-ranked agents for an
// (intent, area) with NO signup wall. Public, read-only over public CEA data.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const intent = typeof body.intent === "string" ? body.intent : "";
    const area = typeof body.area === "string" ? body.area : "";
    if (!intent || !area) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const limit = Math.min(Math.max(Number(body.limit) || 8, 3), 12);
    const data = await getShortlist(intent, area, limit);
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (data.agents.length === 0) return NextResponse.json({ error: "no_data" }, { status: 404 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
