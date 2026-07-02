import { createClient } from "@supabase/supabase-js";

// Share of voice in AI answers (Google AI Overview, ChatGPT, Claude,
// Perplexity): is FairComparisons cited/mentioned vs the agencies and portals.
// Reads the sg_ai_tracker_sov_latest view (latest run per query per surface).
// Dormant until DATAFORSEO creds are set and the cron has run.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Row = {
  surface: string;
  brand_domain: string;
  brand_kind: string;
  present_queries: number;
  cited_queries: number;
  mentioned_queries: number;
  total_queries: number;
  presence_pct: number;
};

const SURFACE_LABEL: Record<string, string> = {
  google_aio: "Google AI Overview",
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  claude: "Claude",
};
const SURFACE_ORDER = ["chatgpt", "claude", "perplexity", "google_aio"];

export async function AiSearchTab() {
  const [{ data: sov }, { data: brands }, { count: queryCount }] = await Promise.all([
    supabase.from("sg_ai_tracker_sov_latest").select("*"),
    supabase.from("sg_ai_tracker_brands").select("domain, name, kind"),
    supabase.from("sg_ai_tracker_queries").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);
  const rows = (sov ?? []) as Row[];
  const nameByDomain = new Map<string, string>((brands ?? []).map((b) => [String(b.domain), String(b.name)]));

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-bold text-gray-900">No AI-tracker data yet</h3>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          The tracker is built and seeded with {queryCount ?? 0} queries across Google AI Overview, ChatGPT and
          Perplexity, but dormant. To turn it on: set <code className="rounded bg-gray-100 px-1">DATAFORSEO_LOGIN</code>{" "}
          and <code className="rounded bg-gray-100 px-1">DATAFORSEO_PASSWORD</code> in Vercel, then the Monday cron (or a
          manual GET to <code className="rounded bg-gray-100 px-1">/api/cron/ai-tracker-scan</code>) populates this. Cost
          is capped at <code className="rounded bg-gray-100 px-1">DATAFORSEO_AI_MONTHLY_CAP_USD</code> (default $10) and a
          kill-switch is <code className="rounded bg-gray-100 px-1">DATAFORSEO_AI_DISABLED</code>.
        </p>
      </div>
    );
  }

  const surfaces = SURFACE_ORDER.filter((s) => rows.some((r) => r.surface === s));

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-gray-500">
        Share of voice in AI answers, over the latest run of each tracked query. <strong>Cited</strong> means our domain
        appears in the answer&apos;s sources; <strong>mentioned</strong> means our name appears in the text. FairComparisons
        is highlighted.
      </p>
      {surfaces.map((surface) => {
        const sr = rows.filter((r) => r.surface === surface).sort((a, b) => b.presence_pct - a.presence_pct);
        const total = sr[0]?.total_queries ?? 0;
        return (
          <div key={surface} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex items-baseline justify-between border-b border-gray-100 px-5 py-3">
              <h3 className="text-sm font-bold text-gray-900">{SURFACE_LABEL[surface] ?? surface}</h3>
              <span className="text-xs text-gray-400">latest run, {total} queries</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-2 font-semibold">Brand</th>
                  <th className="px-5 py-2 text-right font-semibold">Present</th>
                  <th className="px-5 py-2 text-right font-semibold">Cited</th>
                  <th className="px-5 py-2 text-right font-semibold">Mentioned</th>
                </tr>
              </thead>
              <tbody>
                {sr.map((r) => {
                  const self = r.brand_kind === "self";
                  return (
                    <tr key={r.brand_domain} className={`border-t border-gray-100 ${self ? "bg-[var(--blue-wash)]" : ""}`}>
                      <td className="px-5 py-2.5">
                        <span className={`font-medium ${self ? "text-[var(--blue-deep)]" : "text-gray-900"}`}>
                          {nameByDomain.get(r.brand_domain) ?? r.brand_domain}
                        </span>
                        <span className="ml-1.5 text-xs text-gray-400">{r.brand_kind}</span>
                      </td>
                      <td className="px-5 py-2.5 text-right font-bold tabular-nums text-gray-900">{r.presence_pct}%</td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-gray-600">{r.cited_queries}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-gray-600">{r.mentioned_queries}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
