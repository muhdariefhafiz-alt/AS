import { createClient } from "@supabase/supabase-js";
import { titleName } from "../../lib/names";

// Exp 3: embeddable AgentScore badge. Serves a standalone SVG (no external CSS,
// so colours are inlined hex matching the site --score-* bands). Agents embed it
// on their site / signature / socials; each load is a brand impression + backlink.

export const revalidate = 3600; // score updates weekly; keep reasonably fresh

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Mirrors globals.css --score-* bands.
function bandHex(score: number): string {
  if (score >= 90) return "#1f44ff";
  if (score >= 75) return "#5167ec";
  if (score >= 60) return "#8090df";
  if (score >= 40) return "#aab4d6";
  return "#c5ccda";
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type Props = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Props) {
  const { slug } = await params;

  const { data: agent } = await supabase
    .from("sg_agents")
    .select("name, score, subscription_tier, cea_registration")
    .eq("slug", slug)
    .single();

  if (!agent || agent.score == null) {
    return new Response("Not found", { status: 404 });
  }

  const score = Math.round(Number(agent.score));
  const name = esc(titleName(agent.name).slice(0, 26));
  const color = bandHex(score);

  // Standing line (the Professional-tier "Top 10% badge"): shown only when the
  // agent subscribes to Professional/Elite AND actually ranks in the top 10% of
  // their primary area by AgentScore. Record-derived and attributed to our own
  // metric, so the claim is factual; never shown when unflattering or unranked.
  let standingLine: string | null = null;
  if (["professional", "elite"].includes(String(agent.subscription_tier ?? "")) && agent.cea_registration) {
    const { data: st } = await supabase.rpc("get_agent_standing", { p_reg: agent.cea_registration });
    const row = Array.isArray(st) ? st[0] : st;
    // agent_pct is a percentile standing where HIGHER is better (rank 1 of
    // 9,620 returns 100). "Top 10%" therefore means pct >= 90, mirroring
    // StandingPanel; the displayed figure is 100 - pct, clamped to "Top 1%".
    const pct = row?.agent_pct != null ? Number(row.agent_pct) : null;
    const areaName = row?.area_name ? String(row.area_name) : null;
    if (pct != null && pct >= 90 && areaName) {
      standingLine = esc(`Top ${Math.max(1, Math.ceil(100 - pct))}% in ${titleName(areaName)} · AgentScore`);
    }
  }

  // Fire-and-forget badge_view for the viral-loop metric (referrer = where embedded).
  const referrer = req.headers.get("referer") || null;
  supabase
    .from("sg_funnel_events")
    .insert({ event: "badge_view", agent_slug: slug, source: "badge", metadata: { referrer } })
    .then(() => {}, () => {});

  const body = standingLine
    ? `<text x="96" y="30" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" font-size="10.5" letter-spacing="1.5" fill="#56618a">AGENTSCORE &#183; VERIFIED</text>
  <text x="96" y="50" font-family="Georgia,'Times New Roman',serif" font-size="17" font-weight="700" fill="#0a1733">${name}</text>
  <text x="96" y="68" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" font-size="12" font-weight="700" fill="${color}">${standingLine}</text>
  <text x="96" y="84" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" font-size="11" fill="#1f44ff">fair-comparisons.com</text>`
    : `<text x="96" y="34" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" font-size="10.5" letter-spacing="1.5" fill="#56618a">AGENTSCORE &#183; VERIFIED</text>
  <text x="96" y="56" font-family="Georgia,'Times New Roman',serif" font-size="17" font-weight="700" fill="#0a1733">${name}</text>
  <text x="96" y="76" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" font-size="12" fill="#1f44ff">fair-comparisons.com</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="96" viewBox="0 0 320 96" role="img" aria-label="AgentScore ${score} verified on FairComparisons">
  <rect x="0.5" y="0.5" width="319" height="95" rx="12" fill="#ffffff" stroke="#d7deee"/>
  <circle cx="52" cy="48" r="28" fill="#eef2fb"/>
  <text x="52" y="57" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="28" font-weight="700" fill="${color}">${score}</text>
  ${body}
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
