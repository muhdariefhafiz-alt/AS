import { supabaseAdmin } from "./supabase";

/**
 * DataForSEO AI-answer tracking for SG. Same cost discipline as the NL sibling
 * (kill-switch + monthly cap + real-cost ledger in the shared dataforseo_usage
 * table). Three surfaces:
 *   - google_aio : SERP organic live/advanced + load_async_ai_overview. Citations
 *     in items[].references[] (.domain/.url), text in items[].markdown. Logged as
 *     api='serp_ai'.
 *   - chatgpt / perplexity : AI Optimization LLM Responses live. Answer in
 *     result[].items[].sections[].text, citations in sections[].annotations[].url
 *     (ChatGPT needs web_search; Perplexity is grounded by default). Logged as
 *     api='ai_optimization'.
 *
 * SG spend is scoped by job='sg_ai_tracker' so the cap is per-app even though the
 * ledger is shared with NL.
 */

const DFS_LOGIN = process.env.DATAFORSEO_LOGIN;
const DFS_PASSWORD = process.env.DATAFORSEO_PASSWORD;
const JOB = "sg_ai_tracker";

export const AI_TRACKER_DISABLED = process.env.DATAFORSEO_AI_DISABLED === "true";
export const AI_MONTHLY_CAP_USD = Number(process.env.DATAFORSEO_AI_MONTHLY_CAP_USD || 10);
export const AI_SURFACES = ["google_aio", "chatgpt", "perplexity"] as const;

export class AiBudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiBudgetError";
  }
}

export function aiCredsConfigured(): boolean {
  return Boolean(DFS_LOGIN && DFS_PASSWORD);
}

/** Month-to-date SG AI-tracker spend. */
export async function monthToDateAiSpend(): Promise<number> {
  const since = new Date();
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);
  const { data } = await supabaseAdmin()
    .from("dataforseo_usage")
    .select("cost_usd")
    .eq("job", JOB)
    .gte("ts", since.toISOString());
  return (data ?? []).reduce((sum, r) => sum + Number(r.cost_usd || 0), 0);
}

export type AiSurfaceResult = {
  present: boolean;
  answerText: string;
  references: Array<{ domain: string; url: string }>;
  cost: number;
};

function authHeader(): string {
  return "Basic " + Buffer.from(`${DFS_LOGIN}:${DFS_PASSWORD}`).toString("base64");
}

function hostFromUrl(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

async function guard(): Promise<void> {
  if (AI_TRACKER_DISABLED) throw new AiBudgetError("DATAFORSEO_AI_DISABLED is set");
  if (!DFS_LOGIN || !DFS_PASSWORD) throw new Error("DATAFORSEO credentials not configured");
  const spent = await monthToDateAiSpend();
  if (spent >= AI_MONTHLY_CAP_USD) {
    throw new AiBudgetError(`AI-tracker monthly cap reached: $${spent.toFixed(4)} >= $${AI_MONTHLY_CAP_USD}`);
  }
}

async function logUsage(api: string, endpoint: string, cost: number): Promise<void> {
  await supabaseAdmin().from("dataforseo_usage").insert({
    api,
    endpoint,
    cost_usd: cost,
    rows: 1,
    target_count: 1,
    job: JOB,
  });
}

type SerpItem = {
  type?: string;
  markdown?: string;
  items?: Array<{ text?: string }>;
  references?: Array<Record<string, unknown>>;
};

/** Google AI Overview for one keyword (Singapore / English). */
export async function fetchAiOverview(keyword: string): Promise<AiSurfaceResult> {
  await guard();
  const task = [
    {
      keyword,
      location_code: 2702, // Singapore
      language_code: "en",
      device: "desktop",
      depth: 10,
      load_async_ai_overview: true,
      tag: "sg-ai-tracker",
    },
  ];
  const res = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/advanced", {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error(`DataForSEO serp/ai_overview: ${res.status} ${await res.text().catch(() => "")}`);
  const json = (await res.json()) as { cost?: number; tasks?: Array<{ result?: Array<{ items?: SerpItem[] }> | null }> };
  const cost = Number(json.cost || 0);
  await logUsage("serp_ai", "serp/google/organic/live/advanced", cost);

  const items = json.tasks?.[0]?.result?.[0]?.items ?? [];
  const aio = items.find((it) => it.type === "ai_overview");
  if (!aio) return { present: false, answerText: "", references: [], cost };

  const parts: string[] = [];
  if (typeof aio.markdown === "string") parts.push(aio.markdown);
  for (const seg of aio.items ?? []) if (typeof seg.text === "string") parts.push(seg.text);

  const references = (aio.references ?? [])
    .map((r) => ({ domain: String(r.domain ?? "").toLowerCase(), url: String(r.url ?? "") }))
    .filter((r) => r.domain || r.url);

  return { present: true, answerText: parts.join("\n"), references, cost };
}

type LlmSection = { text?: string; annotations?: Array<Record<string, unknown>> | null };
type LlmItem = { sections?: LlmSection[] };

/** ChatGPT / Perplexity answer (web-grounded) for one prompt, SG. */
export async function fetchLlmResponse(
  platform: "chat_gpt" | "perplexity",
  prompt: string
): Promise<AiSurfaceResult> {
  await guard();
  const task: Record<string, unknown> = {
    user_prompt: prompt.slice(0, 500),
    model_name: platform === "perplexity" ? "sonar" : "gpt-4o",
    web_search_country_iso_code: "SG",
    max_output_tokens: 1024,
    tag: "sg-ai-tracker",
  };
  if (platform === "chat_gpt") task.web_search = true;

  const res = await fetch(`https://api.dataforseo.com/v3/ai_optimization/${platform}/llm_responses/live`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify([task]),
  });
  if (!res.ok) throw new Error(`DataForSEO ${platform}/llm_responses: ${res.status} ${await res.text().catch(() => "")}`);
  const json = (await res.json()) as {
    cost?: number;
    tasks?: Array<{ result?: Array<{ items?: LlmItem[]; money_spent?: number }> | null }>;
  };
  const result = json.tasks?.[0]?.result?.[0];
  const cost = Number(json.cost || result?.money_spent || 0);
  await logUsage("ai_optimization", `${platform}/llm_responses/live`, cost);

  const parts: string[] = [];
  const references: Array<{ domain: string; url: string }> = [];
  for (const item of result?.items ?? []) {
    for (const section of item.sections ?? []) {
      if (typeof section.text === "string") parts.push(section.text);
      for (const ann of section.annotations ?? []) {
        const url = String((ann as Record<string, unknown>).url ?? "");
        if (url) references.push({ domain: hostFromUrl(url), url });
      }
    }
  }
  const answerText = parts.join("\n");
  return { present: answerText.length > 0, answerText, references, cost };
}

/** Dispatcher on the surface name stored in sg_ai_tracker_runs.surface. */
export async function fetchSurface(surface: string, query: string): Promise<AiSurfaceResult> {
  if (surface === "google_aio") return fetchAiOverview(query);
  if (surface === "chatgpt") return fetchLlmResponse("chat_gpt", query);
  if (surface === "perplexity") return fetchLlmResponse("perplexity", query);
  throw new Error(`Unknown surface: ${surface}`);
}
