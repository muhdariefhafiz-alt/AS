import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { SectionHeading, StatCard, Pill } from "../shared";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function SupplyTab() {
  const [allAgents, claimRates, specCounts] = await Promise.all([
    supabase
      .from("sg_agents")
      .select(
        "id, primary_area, claimed, subscription_tier, email, phone, whatsapp, bio, message, photo_url, score, specializations, cea_registration, google_rating, google_review_count, transaction_count, years_active"
      ),
    supabase.from("sg_claim_requests").select("status, created_at"),
    supabase.from("sg_agents").select("specializations").not("specializations", "is", null).limit(30000),
  ]);

  const agents = (allAgents.data ?? []) as Array<{
    id: number;
    primary_area: string | null;
    claimed: boolean;
    subscription_tier: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    bio: string | null;
    message: string | null;
    photo_url: string | null;
    score: number | null;
    specializations: string[] | null;
    cea_registration: string | null;
    google_rating: number | null;
    transaction_count: number | null;
    years_active: number | null;
  }>;

  const total = agents.length;
  const claimed = agents.filter((a) => a.claimed).length;
  const paying = agents.filter((a) => a.subscription_tier === "pro" || a.subscription_tier === "premium").length;
  const claimPct = total ? Math.round((claimed / total) * 100) : 0;

  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const pctClaimed = (n: number) => (claimed ? Math.round((n / claimed) * 100) : 0);

  const emailPct = pct(agents.filter((a) => a.email).length);
  const phonePct = pct(agents.filter((a) => a.phone).length);
  const ceaPct = pct(agents.filter((a) => a.cea_registration).length);
  const ratingPct = pct(agents.filter((a) => a.google_rating != null).length);
  const scorePct = pct(agents.filter((a) => a.score != null).length);
  const txnPct = pct(agents.filter((a) => a.transaction_count && a.transaction_count > 0).length);

  // Claimed-only completeness
  const claimedAgents = agents.filter((a) => a.claimed);
  const photoPct = pctClaimed(claimedAgents.filter((a) => a.photo_url).length);
  const waPct = pctClaimed(claimedAgents.filter((a) => a.whatsapp).length);
  const bioPct = pctClaimed(claimedAgents.filter((a) => (a.bio || "").length >= 40).length);
  const messagePct = pctClaimed(claimedAgents.filter((a) => (a.message || "").length >= 20).length);

  // Score distribution
  const withScore = agents.filter((a) => a.score != null);
  const excellent = withScore.filter((a) => Number(a.score) >= 80).length;
  const good = withScore.filter((a) => Number(a.score) >= 60 && Number(a.score) < 80).length;
  const average = withScore.filter((a) => Number(a.score) >= 40 && Number(a.score) < 60).length;
  const basic = withScore.filter((a) => Number(a.score) < 40).length;

  // Claim velocity (weekly last 8 weeks)
  const weeklyClaims: number[] = [];
  const now = Date.now();
  for (let w = 7; w >= 0; w--) {
    const from = now - (w + 1) * 7 * 86_400_000;
    const to = now - w * 7 * 86_400_000;
    weeklyClaims.push(
      (claimRates.data ?? []).filter((c) => {
        const t = new Date(c.created_at).getTime();
        return t >= from && t < to && c.status === "verified";
      }).length
    );
  }

  // Coverage per district (top 20)
  const byDistrict = new Map<string, { total: number; claimed: number }>();
  for (const a of agents) {
    if (!a.primary_area) continue;
    const prev = byDistrict.get(a.primary_area) || { total: 0, claimed: 0 };
    prev.total++;
    if (a.claimed) prev.claimed++;
    byDistrict.set(a.primary_area, prev);
  }
  const topDistricts = Array.from(byDistrict.entries())
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  // Top specializations
  const specMap = new Map<string, number>();
  for (const row of specCounts.data ?? []) {
    for (const s of (row.specializations as string[] | null) ?? []) {
      specMap.set(s, (specMap.get(s) || 0) + 1);
    }
  }
  const topSpecs = Array.from(specMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading title="Supply-side overview" hint="Aantal, claim-coverage en paid conversion van onze agent database." />
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard title="Total agents" value={total.toLocaleString()} sub="CEA geregistreerd" />
          <StatCard title="Claimed" value={`${claimed} (${claimPct}%)`} sub="coverage ratio" color="#059669" />
          <StatCard title="Paying" value={paying} sub="Pro + Premium" color="#e67e22" />
          <StatCard
            title="Completion (claimed)"
            value={`${Math.round((photoPct + waPct + bioPct + messagePct) / 4)}%`}
            sub="avg across 4 profile fields"
            color="#2980b9"
          />
        </div>
      </div>

      <div>
        <SectionHeading title="Base data completeness" hint="Welk % van alle agents heeft waarde per veld." />
        <div className="grid gap-3 md:grid-cols-3">
          <CompletenessBar label="E-mail" pct={emailPct} hint="outreach-plafond" />
          <CompletenessBar label="Phone" pct={phonePct} />
          <CompletenessBar label="CEA registration" pct={ceaPct} hint="verplicht voor identiteit" />
          <CompletenessBar label="Google rating" pct={ratingPct} hint="score-input" />
          <CompletenessBar label="AgentScore" pct={scorePct} hint="ranking mogelijk" />
          <CompletenessBar label="Transaction count" pct={txnPct} hint="CEA data" />
        </div>
      </div>

      <div>
        <SectionHeading title="Claimed profile completeness" hint="Per veld van geclaimde agents. Hogere coverage = unieke SEO content per pagina." />
        <div className="grid gap-3 md:grid-cols-4">
          <CompletenessBar label="Photo" pct={photoPct} hint="professional headshot" />
          <CompletenessBar label="WhatsApp" pct={waPct} hint="direct contact" />
          <CompletenessBar label="Bio (40+ chars)" pct={bioPct} hint="practice description" />
          <CompletenessBar label="Message (20+ chars)" pct={messagePct} hint="top-of-profile quote" />
        </div>
      </div>

      <div>
        <SectionHeading title="Score distribution" hint={`Van ${withScore.length.toLocaleString()} scored agents.`} />
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard title="Excellent (80+)" value={excellent} color="#059669" />
          <StatCard title="Good (60-79)" value={good} color="#2980b9" />
          <StatCard title="Average (40-59)" value={average} color="#d97706" />
          <StatCard title="Basic (<40)" value={basic} color="#6b7280" />
        </div>
      </div>

      <div>
        <SectionHeading title="Claim velocity (last 8 weeks)" />
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <div className="flex items-end gap-1">
            {weeklyClaims.map((n, i) => {
              const max = Math.max(1, ...weeklyClaims);
              const h = (n / max) * 60;
              return (
                <div key={i} className="flex-1 text-center">
                  <div
                    className="mx-auto bg-teal-600"
                    style={{ height: `${h}px`, width: "60%", minHeight: n > 0 ? "3px" : "1px" }}
                  />
                  <div className="mt-1 text-[10px] text-gray-500">{n}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-gray-500">
            <span>8 weken geleden</span>
            <span>nu</span>
          </div>
        </div>
      </div>

      <div>
        <SectionHeading title="Top 20 districts by volume" hint="Met claim coverage percentage." />
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-3 py-2">District</th>
                <th className="px-3 py-2 text-right">Agents</th>
                <th className="px-3 py-2 text-right">Claimed</th>
                <th className="px-3 py-2 text-right">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {topDistricts.map((c) => {
                const cov = c.total ? Math.round((c.claimed / c.total) * 100) : 0;
                return (
                  <tr key={c.name} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium">{c.name}</td>
                    <td className="px-3 py-2 text-right">{c.total}</td>
                    <td className="px-3 py-2 text-right">{c.claimed}</td>
                    <td className="px-3 py-2 text-right">
                      {cov > 0 ? <Pill color="emerald">{cov}%</Pill> : <Pill color="gray">0%</Pill>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <SectionHeading title="Top 10 specializations" />
        <div className="grid gap-2 sm:grid-cols-2">
          {topSpecs.map(([spec, n]) => (
            <div
              key={spec}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <span className="text-gray-900">{spec}</span>
              <span className="font-semibold">{n.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Prevent unused Link import in builds */}
      <Link href="#" className="hidden" aria-hidden />
    </div>
  );
}

function CompletenessBar({ label, pct, hint }: { label: string; pct: number; hint?: string }) {
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold text-gray-900">{label}</span>
        <span className="text-sm font-bold">{pct}%</span>
      </div>
      {hint && <div className="text-[10px] text-gray-500">{hint}</div>}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-1.5 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
