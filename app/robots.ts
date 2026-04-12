import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/property-agents/", "/lawyers/", "/insights/", "/financial-advisors/"],
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
