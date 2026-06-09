import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      // Sunset the legacy lawyers vertical (pre property-agent pivot). 301 to
      // home so these off-topic URLs drop from Google's index and topical
      // authority stays on the property-agent platform.
      { source: "/lawyers", destination: "/", permanent: true },
      { source: "/lawyers/:path*", destination: "/", permanent: true },
    ];
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
