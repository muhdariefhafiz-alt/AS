import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabaseAdmin } from "../../../lib/supabase";
import ReviewForm from "./ReviewForm";

export const metadata: Metadata = {
  title: "Review your property agent · FairComparisons",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

export default async function ReviewPage({ params }: Props) {
  const { token } = await params;
  if (!token || token.length < 8 || token.length > 64) notFound();

  const sb = supabaseAdmin();
  const { data: lead } = await sb
    .from("sg_leads")
    .select("id, token, full_name")
    .eq("token", token)
    .single();
  if (!lead) notFound();

  const { data: completion } = await sb
    .from("sg_lead_completions")
    .select(
      "id, agent_id, otp_signed_at, completion_date, sg_agents!inner(id, name, slug)"
    )
    .eq("lead_id", lead.id)
    .single();

  if (!completion || !completion.otp_signed_at) {
    return (
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-[640px] px-5 md:px-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <h1 className="text-xl font-bold text-gray-900">
              Reviews open after OTP signing
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Once your sale agreement (OTP) is signed, this page becomes
              live. We&apos;ll email you the link automatically.
            </p>
          </div>
        </div>
      </section>
    );
  }

  type AgentJoin = { id: number; name: string; slug: string | null };
  const joined = completion.sg_agents as unknown;
  const agent: AgentJoin =
    (Array.isArray(joined) ? joined[0] : joined) ??
    ({ id: 0, name: "your agent", slug: null } as AgentJoin);

  // Has the seller already reviewed?
  const { data: existing } = await sb
    .from("sg_agent_reviews")
    .select("id, status")
    .eq("completion_id", completion.id)
    .maybeSingle();
  const alreadyReviewed = Boolean(existing);

  return (
    <>
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-[640px] px-5 py-10 md:px-8 md:py-12">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--blue-deep)]">
            Leave a review
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900 md:text-3xl">
            How did {agent.name} do?
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Two minutes. Public reviews show initials only. Honest reviews
            help the next seller in your area pick well.
          </p>
        </div>
      </section>

      <section className="bg-gray-50 py-10">
        <div className="mx-auto max-w-[640px] px-5 md:px-8">
          <ReviewForm
            token={token}
            agentName={agent.name ?? "your agent"}
            agentSlug={(agent.slug as string | null) ?? null}
            alreadyReviewed={alreadyReviewed}
          />
        </div>
      </section>
    </>
  );
}
