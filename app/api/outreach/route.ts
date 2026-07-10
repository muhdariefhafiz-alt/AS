import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "../../lib/email";
import { getAdminSession } from "../../lib/admin-auth";
import {
  TEMPLATES,
  type TemplateName,
} from "../../lib/outreach-templates";

// Service role: reads agent email PII + writes sg_outreach. The email column
// is REVOKEd from the anon role.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const VALID_TEMPLATES = Object.keys(TEMPLATES) as TemplateName[];

export async function POST(request: Request) {
  try {
    // This endpoint sends agent-facing emails and reads agent PII. It must
    // never be public: gate it behind an admin session (manual use from the
    // admin UI) OR a valid CRON_SECRET bearer (automated runs). Previously
    // unauthenticated: anyone could enumerate agentId and email-bomb agents.
    const session = await getAdminSession();
    const authHeader = request.headers.get("authorization");
    const cronOk =
      !!process.env.CRON_SECRET &&
      authHeader === `Bearer ${process.env.CRON_SECRET}`;
    if (!session && !cronOk) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, template, views, rank, townOrArea } = body as {
      agentId: string;
      template: TemplateName;
      views?: number;
      rank?: number;
      townOrArea?: string;
    };

    // ---- Validation ----

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    if (!template || !VALID_TEMPLATES.includes(template)) {
      return NextResponse.json(
        { error: `template must be one of: ${VALID_TEMPLATES.join(", ")}` },
        { status: 400 }
      );
    }

    // ---- Fetch agent ----

    const { data: agent, error: agentError } = await supabase
      .from("sg_agents")
      .select(
        "id, name, slug, score, transaction_count, primary_area, cea_registration, agency_name, percentile, email"
      )
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // ---- Generate email from template ----

    // Marketing sends carry a signed unsubscribe link for the recipient.
    // Empty string when no email on file: nothing is sent, only previewed.
    const recipientEmail: string = agent.email || "";

    let email: { subject: string; html: string };

    switch (template) {
      case "weeklyNudge":
        if (typeof views !== "number") {
          return NextResponse.json(
            { error: "views (number) required for weeklyNudge template" },
            { status: 400 }
          );
        }
        email = TEMPLATES.weeklyNudge(agent, views, recipientEmail);
        break;

      case "areaLeader":
        if (typeof rank !== "number" || !townOrArea) {
          return NextResponse.json(
            { error: "rank (number) and townOrArea (string) required for areaLeader template" },
            { status: 400 }
          );
        }
        email = TEMPLATES.areaLeader(agent, rank, townOrArea, recipientEmail);
        break;

      default:
        email = TEMPLATES[template](agent, recipientEmail);
    }

    // ---- Send via Klaviyo ----

    let sendResult: { id: string } = { id: "no-email-on-file" };

    if (agent.email) {
      sendResult = (await sendEmail({
        to: agent.email,
        subject: email.subject,
        html: email.html,
        metric: "Agent Outreach",
        properties: {
          template,
          agent_id: agent.id,
          agent_name: agent.name,
          agent_slug: agent.slug,
        },
      })) as { id: string };
    }

    // ---- Log to sg_outreach ----

    const { error: logError } = await supabase.from("sg_outreach").upsert(
      {
        agent_id: agentId,
        campaign: "agent_acquisition",
        template,
        email_sent: !!agent.email,
        email_sent_at: agent.email ? new Date().toISOString() : null,
        email_subject: email.subject,
      },
      { onConflict: "agent_id,template" }
    );

    if (logError) {
      console.error("[outreach-log-error]", logError);
    }

    // ---- Response ----

    return NextResponse.json({
      success: true,
      sent: !!agent.email,
      sendResult,
      preview: {
        subject: email.subject,
        profileUrl: `https://fair-comparisons.com/property-agents/agent/${agent.slug}`,
      },
      html: email.html,
    });
  } catch (err) {
    console.error("[outreach-error]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
