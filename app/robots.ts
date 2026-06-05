import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/property-agents/", "/insights/", "/guides/", "/for-agents/"],
        // Off-mission sections (lawyers, financial advisors, court stats) are kept
        // crawlable ON PURPOSE so Googlebot can read their noindex (set in each
        // section layout) and drop them from the index. A robots Disallow would
        // block crawl and the noindex would never be seen, leaving them indexed.
        // Keeps the domain's topical signal tight on property agents.
        disallow: ["/api/", "/admin", "/search", "/claim"],
      },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "Applebot", allow: "/" },
    ],
    sitemap: "https://fair-comparisons.com/sitemap.xml",
  };
}
