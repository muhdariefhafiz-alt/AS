import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase";
import { getAgentSession } from "../../../../../lib/agent-auth";
import { renderPdf } from "../../../../../lib/documents/build";
import type { DocFields } from "../../../../../lib/documents/schema";

// Render a document to PDF, store it in the private agent-documents bucket, and
// stream it back. A "draft" status renders the DRAFT watermark; a "finalised"
// document renders clean (the agent is taking it to signing). Ownership is
// re-checked on every call.

export const maxDuration = 60;

type Props = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeName(title: string): string {
  const base = (title || "document").replace(/[^a-zA-Z0-9 _-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60);
  return `${base || "document"}.pdf`;
}

export async function GET(_req: Request, { params }: Props) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const sb = supabaseAdmin();
  const [{ data: doc }, { data: agent }] = await Promise.all([
    sb
      .from("sg_documents")
      .select("id, agent_id, doc_type, template_key, title, status, fields")
      .eq("id", id)
      .eq("agent_id", session.agentId)
      .maybeSingle(),
    sb.from("sg_agents").select("is_sandbox, subscription_tier").eq("id", session.agentId).single(),
  ]);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let bytes: Uint8Array;
  try {
    bytes = await renderPdf(doc.template_key, doc.fields as DocFields, {
      draft: doc.status === "draft",
      // Free-tier documents carry the provenance line; paying agents get a
      // clean footer on their client-facing document.
      provenance: (agent?.subscription_tier ?? "free") === "free",
    });
  } catch (err) {
    console.error("[documents/pdf] render failed", err);
    return NextResponse.json({ error: "Could not render document." }, { status: 500 });
  }

  const path = `${doc.agent_id}/${doc.id}.pdf`;
  const buf = Buffer.from(bytes);
  // Store the record (best effort) and stamp pdf_path; the stream below is the
  // download regardless of whether storage succeeds. An admin viewing a
  // document while impersonating reads it but writes NOTHING, same as every
  // other route here.
  if (!session.impersonatedBy) {
    await sb.storage.from("agent-documents").upload(path, buf, { upsert: true, contentType: "application/pdf" }).catch(() => {});
    await sb.from("sg_documents").update({ pdf_path: path }).eq("id", id);
  }

  if (agent?.is_sandbox !== true && !session.impersonatedBy) {
    await sb.from("sg_funnel_events").insert({
      event: "paperwork_generated",
      agent_id: session.agentId,
      metadata: { doc_type: doc.doc_type, template_key: doc.template_key, status: doc.status },
    });
  }

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName(doc.title)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
