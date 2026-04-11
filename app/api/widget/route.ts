import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Returns an embeddable HTML widget for an agent's score card.
 * Usage: <iframe src="https://fair-comparisons.com/api/widget?reg=R007253F" width="320" height="200" frameborder="0"></iframe>
 * Or: <script src="https://fair-comparisons.com/api/widget?reg=R007253F&format=js"></script>
 */
export async function GET(req: NextRequest) {
  const reg = req.nextUrl.searchParams.get("reg");
  const format = req.nextUrl.searchParams.get("format") || "html";

  if (!reg) {
    return new NextResponse("Missing reg parameter", { status: 400 });
  }

  const { data: agent } = await supabase
    .from("sg_agents")
    .select("name, slug, cea_registration, agency_name, score, transaction_count, specialization, primary_area")
    .eq("cea_registration", reg)
    .single();

  if (!agent) {
    return new NextResponse("Agent not found", { status: 404 });
  }

  const score = agent.score ? Math.round(Number(agent.score)) : null;
  const spec = (agent.specialization || "")
    .replace("CONDOMINIUM_APARTMENTS", "Condo")
    .replace("HDB", "HDB")
    .replace("LANDED_PROPERTIES", "Landed")
    .replace("_", " ");
  const area = agent.primary_area || "";
  const txns = agent.transaction_count || 0;
  const profileUrl = `https://fair-comparisons.com/property-agents/agent/${agent.slug}`;

  const scoreColor = score && score >= 70 ? "#0A6B5E" : score && score >= 50 ? "#0D8B78" : "#94a3b8";
  const scoreBg = score && score >= 70 ? "#f0f9ff" : score && score >= 50 ? "#f0f9ff" : "#f8fafc";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:transparent}
.card{border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#fff;max-width:320px;cursor:pointer;transition:border-color .2s}
.card:hover{border-color:#0D8B78}
.top{display:flex;align-items:center;gap:12px}
.score-circle{width:52px;height:52px;border-radius:50%;background:${scoreBg};border:2px solid ${scoreColor};display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0}
.score-num{font-size:20px;font-weight:800;color:${scoreColor};line-height:1}
.score-label{font-size:7px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-top:1px}
.info{flex:1;min-width:0}
.name{font-size:14px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.agency{font-size:11px;color:#64748b;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stats{display:flex;gap:12px;margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9}
.stat{flex:1}
.stat-val{font-size:13px;font-weight:700;color:#0f172a}
.stat-lbl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-top:1px}
.footer{display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:1px solid #f1f5f9}
.powered{font-size:9px;color:#cbd5e1}
.powered a{color:#0D8B78;text-decoration:none}
.verify{font-size:9px;color:#0D8B78;text-decoration:none;font-weight:600}
</style>
</head>
<body>
<a href="${profileUrl}" target="_blank" rel="noopener" style="text-decoration:none">
<div class="card">
<div class="top">
${score ? `<div class="score-circle"><span class="score-num">${score}</span><span class="score-label">Score</span></div>` : ""}
<div class="info">
<div class="name">${agent.name}</div>
<div class="agency">CEA ${agent.cea_registration} · ${agent.agency_name}</div>
</div>
</div>
<div class="stats">
<div class="stat"><div class="stat-val">${txns}</div><div class="stat-lbl">Transactions</div></div>
${spec ? `<div class="stat"><div class="stat-val">${spec}</div><div class="stat-lbl">Specialization</div></div>` : ""}
${area ? `<div class="stat"><div class="stat-val" style="font-size:11px">${area}</div><div class="stat-lbl">Primary Area</div></div>` : ""}
</div>
<div class="footer">
<span class="powered">Verified by <a href="https://fair-comparisons.com" target="_blank">FairComparisons</a></span>
<a href="${profileUrl}" target="_blank" class="verify">View full profile →</a>
</div>
</div>
</a>
</body>
</html>`;

  if (format === "js") {
    const js = `(function(){var d=document,s=d.currentScript,f=d.createElement('iframe');f.src='https://fair-comparisons.com/api/widget?reg=${reg}';f.width='320';f.height='200';f.style.border='none';f.style.borderRadius='12px';s.parentNode.insertBefore(f,s)})();`;
    return new NextResponse(js, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
      "X-Frame-Options": "ALLOWALL",
    },
  });
}
