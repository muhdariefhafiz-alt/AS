import { createClient } from "@supabase/supabase-js";
import { SectionHeading, StatCard, Pill } from "../shared";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type SupplyStats = {
  total: number;
  claimed: number;
  paying: number;
  email: number;
  phone: number;
  google_rating: number;
  score: number;
  txn: number;
  photo: number;
  whatsapp: number;
  bio40: number;
  message20: number;
  score_excellent: number;
  score_good: number;
  score_average: number;
  score_basic: number;
  districts: { name: string; total: number; claimed: number }[];
  specializations: { name: string; n: number }[];
};

export async function SupplyTab() {
  // Aggregate server-side via RPC. A plain .select() caps at PostgREST's
  // 1000-row limit, which previously made total read 1,000 (really 30,740) and
  // every coverage % divide by the wrong denominator. The claim-requests table
  // is tiny, so it is safe to read directly for the velocity chart.
  const [statsRes, claimRates, waAllRes] = await Promise.all([
    supabase.rpc("sg_supply_stats"),
    supabase.from("sg_claim_requests").select("status, created_at"),
    // WhatsApp-number coverage across ALL agents (the RPC only counts WhatsApp
    // for claimed agents). head:true exact count so it never caps at 1000 rows.
    supabase
      .from("sg_agents")
      .select("*", { count: "exact", head: true })
      .not("whatsapp", "is", null)
      .neq("whatsapp", ""),
  ]);

  const s = (statsRes.data ?? {}) as Partial<SupplyStats>;
  const total = s.total ?? 0;
  const claimed = s.claimed ?? 0;
  const paying = s.paying ?? 0;
  const claimPct = total ? Math.round((claimed / total) * 100) : 0;

  const pct = (n: number | undefined) => (total ? Math.round(((n ?? 0) / total) * 100) : 0);
  const pctClaimed = (n: number | undefined) => (claimed ? Math.round(((n ?? 0) / claimed) * 100) : 0);

  const emailPct = pct(s.email);
  const phonePct = pct(s.phone);
  const waNumberPct = pct(waAllRes.count ?? 0);
  const ratingPct = pct(s.google_rating);
  const scorePct = pct(s.score);
  const txnPct = pct(s.txn);

  const photoPct = pctClaimed(s.photo);
  const waPct = pctClaimed(s.whatsapp);
  const bioPct = pctClaimed(s.bio40);
  const messagePct = pctClaimed(s.message20);

  const scoredCount = s.score ?? 0;
  const excellent = s.score_excellent ?? 0;
  const good = s.score_good ?? 0;
  const average = s.score_average ?? 0;
  const basic = s.score_basic ?? 0;

  const topDistricts = s.districts ?? [];
  const topSpecs: [string, number][] = (s.specializations ?? []).map((x) => [x.name, x.n]);

  // Claim velocity (weekly last 8 weeks), from the small claim-requests table.
  const weeklyClaims: number[] = [];
  const now = Date.now();
  for (let w = 7; w >= 0; w--) {
    const from = now - (w + 1) * 7 * 86_400_000;
    const to = now - w * 7 * 86_400_000;
    weeklyClaims.push(
      (claimRates.data ?? []).filter((c) => {
        const t = new Date(c.created_at).getTime();
        return t >= from && t < to && (c.status === "verified" || c.status === "approved");
      }).length
    );
  }

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
          <CompletenessBar label="WhatsApp number" pct={waNumberPct} hint="outreach-kanaal, alle agents" />
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
        <SectionHeading title="Score distribution" hint={`Van ${scoredCount.toLocaleString()} scored agents.`} />
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

      {topSpecs.length > 0 && (
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
      )}
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
