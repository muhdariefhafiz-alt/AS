import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/property-agents/", "/insights/", "/guides/", "/for-agents/"],
        disallow: ["/api/", "/admin", "/search", "/claim", "/lawyers", "/financial-advisors", "/insights/court-case-statistics"],
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
