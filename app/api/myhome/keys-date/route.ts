import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

// Sets the key-collection date on an AVM watch lead (the My Home MOP countdown).
// The watch token is the bearer credential: it is unguessable, was delivered
// only to the owner's email, and scopes the write to exactly one lead row.

export async function POST(req: Request) {
  let body: { token?: string; keys_date?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const token = String(body.token ?? "").trim();
  const keysDate = String(body.keys_date ?? "").trim();

  if (!token || token.length < 8 || token.length > 64) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  // Sane date: YYYY-MM-DD between 1990 and end of next year (BTO keys can be
  // slightly in the future when an owner enters an upcoming collection date).
  const m = keysDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const year = m ? Number(m[1]) : 0;
  if (!m || year < 1990 || year > new Date().getUTCFullYear() + 1) {
    return NextResponse.json({ error: "Please pick a valid month and year." }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("sg_leads")
    .update({ keys_date: keysDate })
    .eq("token", token)
    .eq("source", "avm")
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
