import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAgentSession } from "../../../lib/agent-auth";

// "Drop your AgentNet PDF" falsification test. An agent uploads their
// PropertyGuru AgentNet performance export; we store it privately and log the
// event. The point right now is to measure WILLINGNESS (do agents bother?) —
// the only lawful path to their own listing views/enquiries, since no SG portal
// exposes an API. Parsing is deliberately deferred until willingness is proven.
// Session-gated; sensitive file goes to a PRIVATE bucket; row is service-role only.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const MAX_SIZE = 15 * 1024 * 1024; // 15MB
const BUCKET = "agent-uploads";

export async function GET() {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data } = await supabase
    .from("sg_agent_perf_uploads")
    .select("id, filename, status, created_at")
    .eq("agent_id", session.agentId)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({ uploads: data ?? [] });
}

export async function POST(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let file: File | null = null;
  try {
    const formData = await req.formData();
    file = formData.get("file") as File | null;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: "File is required" }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "Please upload the PDF export from PropertyGuru AgentNet." }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large. Maximum size is 15MB." }, { status: 400 });

  const timestamp = Date.now();
  const storagePath = `${session.agentId}/${timestamp}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    console.error("[perf-upload] storage error:", uploadError);
    return NextResponse.json({ error: "Could not save the file. Please try again." }, { status: 500 });
  }

  const { data: row, error: insertError } = await supabase
    .from("sg_agent_perf_uploads")
    .insert({
      agent_id: session.agentId,
      source: "propertyguru_agentnet",
      filename: file.name.slice(0, 200),
      storage_path: storagePath,
      status: "received",
    })
    .select("id, filename, status, created_at")
    .single();

  if (insertError) {
    console.error("[perf-upload] insert error:", insertError);
    return NextResponse.json({ error: "Could not record the upload." }, { status: 500 });
  }

  // Willingness signal for the falsification test.
  await supabase.from("sg_funnel_events").insert({
    event: "perf_pdf_upload",
    agent_id: session.agentId,
    metadata: { source: "propertyguru_agentnet", filename: file.name.slice(0, 200) },
  });

  return NextResponse.json({ ok: true, upload: row });
}
