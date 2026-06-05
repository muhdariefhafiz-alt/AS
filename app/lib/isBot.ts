// Single source of truth for filtering non-human traffic out of page_views.
// Imported by BOTH the client PageTracker and the server /api/track route so
// the two filters can never drift. Tests against a lowercased user-agent.
//
// Three buckets, none of which are human visitors:
//  1. Generic crawlers / scrapers / monitoring (search engines, uptime, libs).
//  2. Headless / QA automation (HeadlessChrome, Playwright, Puppeteer).
//  3. AI / LLM crawlers — BOTH dataset-training scrapers (GPTBot, ClaudeBot,
//     CCBot, anthropic-ai, cohere-ai, Bytespider...) AND real-time "answer
//     engine" fetchers that pull a page when a user asks an assistant
//     (ChatGPT-User, OAI-SearchBot, Perplexity-User/Bot, Claude-Web,
//     Meta-ExternalAgent, GoogleOther, DuckAssistBot). Many contain "bot"
//     and are caught by the generic group; the explicit tokens below cover
//     the ones that do NOT (ChatGPT-User, Perplexity-User, anthropic-ai...).
export const BOT_UA_RE =
  /bot|crawl|spider|slurp|headless|playwright|puppeteer|lighthouse|pingdom|gtmetrix|node-fetch|python-requests|curl\/|wget|axios|facebookexternalhit|embedly|bingpreview|gptbot|oai-search|chatgpt|openai|anthropic|claude|perplexity|cohere|ccbot|bytespider|amazonbot|applebot|meta-external|diffbot|youbot|ai2bot|petalbot|duckassist|google-extended|googleother|img2dataset|omgili|timpibot|imagesift|dataforseo|gemini|bardbot|webzio|semrush|ahrefs|mj12bot/;

export function isBotUA(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return BOT_UA_RE.test(ua.toLowerCase());
}
