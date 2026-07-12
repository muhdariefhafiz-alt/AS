// AI-drafted seller-lead replies, grounded in the record. The SG-first-mover
// "Inbox" play: housapp's AI drafts mimic writing style; ours open grounded in
// facts housapp cannot have (recent comparable sales, area medians, the agent's
// own verified record). Drafting ONLY: the agent reviews, edits, and sends via
// their own channel. Nothing is auto-sent.
//
// Fail-closed rules baked into the prompt: use ONLY the facts provided; never
// invent transactions, prices or credentials; no CEA-risky claims (guarantees,
// "cheapest", "No. 1"), mirroring app/lib/cea-advert.ts. Gated on
// ANTHROPIC_API_KEY (inert until configured, like WhatsApp/Klaviyo).

export const DRAFT_MODEL = process.env.CLAUDE_DRAFT_MODEL || "claude-sonnet-5";

export type LeadFacts = {
  propertyType: string;
  area: string | null; // town or district label
  bedrooms: number | null;
  estValueLow: number | null;
  estValueHigh: number | null;
  timeline: string | null;
  reason: string | null;
  sellerFirstName: string | null;
};

export type AgentFacts = {
  name: string;
  agency: string;
  score: number | null;
  primaryArea: string | null;
};

export type Comp = { title: string; subtitle: string; price: number | null; event_date: string };

function sgd(n: number): string {
  return `S$${Math.round(n).toLocaleString("en-SG")}`;
}

// Pure and deterministic: everything the model may use is in this string.
export function buildDraftPrompt(lead: LeadFacts, agent: AgentFacts, comps: Comp[]): string {
  const facts: string[] = [];
  facts.push(`Seller enquiry: ${lead.propertyType}${lead.bedrooms ? `, ${lead.bedrooms}-bedroom` : ""}${lead.area ? ` in ${lead.area}` : ""}.`);
  if (lead.estValueLow && lead.estValueHigh) facts.push(`Seller's indicated value range: ${sgd(lead.estValueLow)} to ${sgd(lead.estValueHigh)}.`);
  if (lead.timeline) facts.push(`Selling timeline: ${lead.timeline}.`);
  if (lead.reason) facts.push(`Stated reason: ${lead.reason}.`);
  if (lead.sellerFirstName) facts.push(`Seller first name: ${lead.sellerFirstName}.`);

  facts.push(`Agent: ${agent.name} of ${agent.agency}${agent.score != null ? `, AgentScore ${agent.score} on FairComparisons (computed from official CEA/URA/HDB records)` : ""}${agent.primaryArea ? `, active in ${agent.primaryArea}` : ""}.`);

  const compLines = comps.slice(0, 5).map((c) => `- ${c.title} (${c.subtitle}) sold for ${c.price != null ? sgd(Number(c.price)) : "undisclosed"} in ${c.event_date.slice(0, 7)}`);

  return [
    `You draft a first reply from a Singapore property agent to a seller who shortlisted them on FairComparisons and invited them to quote.`,
    ``,
    `FACTS (the ONLY facts you may use; never invent others):`,
    ...facts.map((f) => `- ${f}`),
    compLines.length ? `\nRecent nearby transactions (official records; cite at most two):\n${compLines.join("\n")}` : `\nNo recent comparable transactions were provided; do not mention any.`,
    ``,
    `RULES:`,
    `- 90 to 140 words, warm and professional, first person, no subject line.`,
    `- Open by thanking them for the invite; reference their property and area specifically.`,
    `- If comparables are provided, ground the reply in one or two of them (address + month + price).`,
    `- Close by proposing a short call or viewing to give a precise valuation.`,
    `- NEVER: guarantee a price or sale, use "cheapest"/"No. 1"/"top 1%"/"100%", invent transactions, credentials or statistics, or promise a commission rate.`,
    `- If a fact you would need is not listed above, write around it rather than inventing it.`,
    `- Output ONLY the reply text, no preamble or notes.`,
  ].join("\n");
}

export async function callClaude(prompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("not_configured");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: DRAFT_MODEL,
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[draft-reply] anthropic error", res.status, text.slice(0, 300));
    throw new Error("api_error");
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const draft = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
  if (!draft) throw new Error("empty_draft");
  return draft;
}
