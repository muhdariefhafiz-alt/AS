import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { SectionHeading, StatCard, EmptyState, MS_DAY } from "../shared";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function countEvent(event: string, since: string): Promise<number> {
  const { count } = await supabase
    .from("sg_funnel_events")
    .select("id", { count: "exact", head: true })
    .eq("event", event)
    .gte("created_at", since);
  return count ?? 0;
}

async function countLeadEvent(eventType: string, since: string): Promise<number> {
  const { count } = await supabase
    .from("sg_lead_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", eventType)
    .gte("created_at", since);
  return count ?? 0;
}

export async function FunnelTab() {
  const cutoff30 = new Date(Date.now() - 30 * MS_DAY).toISOString();

  const [
    profileViews,
    waClicks,
    searches,
    bannerViews,
    bannerClicks,
    claimSubmits,
    claimsRes,
    checkoutStart,
    subStarted,
    dashLogins,
    profileEdits,
  ] = await Promise.all([
    countEvent("profile_view", cutoff30),
    countEvent("whatsapp_click", cutoff30),
    countEvent("search_performed", cutoff30),
    countEvent("claim_banner_view", cutoff30),
    countEvent("claim_click", cutoff30),
    countEvent("claim_submit", cutoff30),
    supabase.from("sg_claim_requests").select("status, created_at").gte("created_at", cutoff30),
    countEvent("checkout_started", cutoff30),
    countEvent("subscription_started", cutoff30),
    countEvent("dashboard_login", cutoff30),
    countEvent("profile_edit", cutoff30),
  ]);

  const claims = claimsRes.data ?? [];
  const verified = claims.filter((c) => c.status === "verified").length;

  // Seller funnel (sg_lead_events).
  const [
    sViewForm,
    sSubmit,
    sViewShortlist,
    sSelect,
    sQuote,
    sViewQuotes,
    sPick,
    sCompletion,
  ] = await Promise.all([
    countLeadEvent("view_form", cutoff30),
    countLeadEvent("submit_form", cutoff30),
    countLeadEvent("view_shortlist", cutoff30),
    countLeadEvent("select_agents", cutoff30),
    countLeadEvent("agent_submit_quote", cutoff30),
    countLeadEvent("view_quotes", cutoff30),
    countLeadEvent("pick_winner", cutoff30),
    countLeadEvent("log_completion", cutoff30),
  ]);

  // Shortlist intent: which agents do sellers actually put on their
  // comparison shortlists? This is the demand-side proof the marketplace is
  // working per agent, and the natural list to mine for claim outreach.
  const { data: slRows } = await supabase
    .from("sg_lead_shortlist")
    .select("agent_id, invited_at, quoted_at, picked_at")
    .gte("created_at", cutoff30)
    .limit(5000);
  const byAgent = new Map<number, { appearances: number; invited: number; quoted: number; picked: number }>();
  for (const r of slRows ?? []) {
    const cur = byAgent.get(r.agent_id) ?? { appearances: 0, invited: 0, quoted: 0, picked: 0 };
    cur.appearances += 1;
    if (r.invited_at) cur.invited += 1;
    if (r.quoted_at) cur.quoted += 1;
    if (r.picked_at) cur.picked += 1;
    byAgent.set(r.agent_id, cur);
  }
  const topShortlisted = [...byAgent.entries()].sort((a, b) => b[1].appearances - a[1].appearances).slice(0, 12);
  const { data: slAgents } = topShortlisted.length
    ? await supabase.from("sg_agents").select("id, name, slug, claimed, agency_name").in("id", topShortlisted.map(([id]) => id))
    : { data: [] };
  const agentById = new Map((slAgents ?? []).map((a) => [a.id, a]));

  const sellerSteps = [
    { label: "Form viewed", value: sViewForm, note: "landed on /sell" },
    { label: "Lead submitted", value: sSubmit, note: "/sell form completed" },
    { label: "Shortlist viewed", value: sViewShortlist, note: "saw ranked agents" },
    { label: "Agents invited", value: sSelect, note: "picked up to 3" },
    { label: "Quotes submitted", value: sQuote, note: "agent-side response" },
    { label: "Quotes compared", value: sViewQuotes, note: "seller reviewed" },
    { label: "Agent instructed", value: sPick, note: "picked a winner" },
    { label: "Completion logged", value: sCompletion, note: "sale closed" },
  ];

  const consumerSteps = [
    { label: "Searches", value: searches, note: "/search, district pagina's" },
    { label: "Profile views", value: profileViews, note: "klik naar agent pagina" },
    { label: "WhatsApp clicks", value: waClicks, note: "tipping point = echte contact" },
  ];

  const agentSteps = [
    { label: "Banner views", value: bannerViews, note: "banner gezien op profile" },
    { label: "Banner clicks", value: bannerClicks, note: "claim knop geklikt" },
    { label: "Claim submits", value: claimSubmits, note: "formulier + CEA" },
    { label: "Email verified", value: verified, note: "double opt-in" },
    { label: "Dashboard logins", value: dashLogins, note: "eerste keer terug na claim" },
    { label: "Profile edits", value: profileEdits, note: "agent voltooit profiel" },
    { label: "Checkout started", value: checkoutStart, note: "klikt op upgrade" },
    { label: "Subscription started", value: subStarted, note: "betaald" },
  ];

  return (
    <div className="space-y-8">
      {/* Seller funnel KPIs */}
      <div>
        <SectionHeading
          title="Seller funnel (30d)"
          hint="Lead to completed sale (free introductions, subscription model)."
        />
        <FunnelTable steps={sellerSteps} />
      </div>

      <div>
        <SectionHeading
          title="Shortlisted agents (30d)"
          hint="Demand-side intent per agent: shortlist appearances, invites, quotes, wins. Click an agent to deep-dive."
        />
        {topShortlisted.length === 0 ? (
          <EmptyState title="No shortlist activity yet" hint="Appears as soon as sellers generate shortlists." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-2.5">Agent</th>
                  <th className="px-4 py-2.5 text-right">Shortlisted</th>
                  <th className="px-4 py-2.5 text-right">Invited</th>
                  <th className="px-4 py-2.5 text-right">Quoted</th>
                  <th className="px-4 py-2.5 text-right">Won</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topShortlisted.map(([id, c]) => {
                  const a = agentById.get(id);
                  return (
                    <tr key={id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        {a?.slug ? (
                          <Link href={`/property-agents/agent/${a.slug}`} target="_blank" className="font-medium text-teal-700 hover:underline">
                            {a.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-gray-900">{a?.name ?? `Agent #${id}`}</span>
                        )}
                        <span className="ml-2 text-[11px] text-gray-400">{a?.agency_name ?? ""}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{c.appearances}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{c.invited}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{c.quoted}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{c.picked}</td>
                      <td className="px-4 py-2.5">
                        {a?.claimed ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Claimed</span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Unclaimed · outreach target</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <SectionHeading
          title="Consumer-funnel (30d)"
          hint="Van zoeken naar WhatsApp-click (tipping point voor value overdracht)."
        />
        <FunnelTable steps={consumerSteps} />
      </div>

      <div>
        <SectionHeading
          title="Agent-funnel (30d)"
          hint="Van banner view naar betalende agent. Per stap dropoff zichtbaar."
        />
        <FunnelTable steps={agentSteps} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          title="View to WhatsApp"
          value={profileViews ? `${Math.round((waClicks / profileViews) * 100)}%` : "0%"}
          sub="whatsapp / view (liquidity)"
          color="#2980b9"
        />
        <StatCard
          title="Submit to verified"
          value={claimSubmits ? `${Math.round((verified / claimSubmits) * 100)}%` : "0%"}
          sub="email double-opt-in"
          color="#e67e22"
        />
        <StatCard
          title="Verified to paid"
          value={verified ? `${Math.round((subStarted / Math.max(verified, 1)) * 100)}%` : "0%"}
          sub="free to Pro/Premium"
          color="#059669"
        />
      </div>

      {profileViews === 0 && (
        <EmptyState title="Nog geen funnel data" hint="Wacht tot sg_funnel_events events accumuleren (24-48h na launch)." />
      )}
    </div>
  );
}

function FunnelTable({ steps }: { steps: { label: string; value: number; note?: string }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">
          <tr>
            <th className="px-3 py-2">Stap</th>
            <th className="px-3 py-2 text-right">Volume</th>
            <th className="px-3 py-2">Visualisatie</th>
            <th className="px-3 py-2 text-right">Dropoff vs. vorige</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s, i) => {
            const prev = i > 0 ? steps[i - 1].value : null;
            const dropoff = prev && prev > 0 ? Math.round(((prev - s.value) / prev) * 100) : null;
            const pct = (s.value / max) * 100;
            return (
              <tr key={s.label} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium">
                  {s.label}
                  {s.note && <div className="text-[10px] text-gray-500">{s.note}</div>}
                </td>
                <td className="px-3 py-2 text-right font-semibold">{s.value.toLocaleString()}</td>
                <td className="px-3 py-2">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-2 bg-teal-600" style={{ width: `${pct}%` }} />
                  </div>
                </td>
                <td className="px-3 py-2 text-right text-xs text-gray-500">
                  {dropoff === null ? "-" : dropoff === 0 ? "0%" : `-${dropoff}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
