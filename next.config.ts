import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // AI Discovery Protocol: serve the dynamic endpoints at clean `.json` URLs.
  // Next 16 can't extract a dynamic param from a `[slug].json` folder, so the
  // routes live at `[slug]` and these rewrites add the `.json` extension.
  async rewrites() {
    return [
      { source: "/ai/agent/:slug.json", destination: "/ai/agent/:slug" },
      { source: "/ai/agency/:slug.json", destination: "/ai/agency/:slug" },
      { source: "/ai/area/:slug.json", destination: "/ai/area/:slug" },
      // Exp 3: embeddable AgentScore badge at a clean .svg URL.
      { source: "/badge/:slug.svg", destination: "/badge/:slug" },
    ];
  },
};

export default nextConfig;
