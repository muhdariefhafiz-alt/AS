import { NextResponse } from "next/server";

// The legacy lawyers vertical (pre property-agent pivot) is taken OFFLINE.
// The underlying data is retained in the sg_lawyers table for a possible future
// relaunch; only the public pages are removed. We serve HTTP 410 Gone (not a
// redirect) so the URLs are dropped from search indexes cleanly and quickly,
// and there is no off-topic content diluting the property-agent domain.
//
// To relaunch later: restore the app/lawyers routes and delete this file (or
// narrow its matcher); the data is still in the database.
const GONE_BODY = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>No longer available</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:36rem;margin:4rem auto;padding:0 1rem;color:#374151;line-height:1.6">
<h1 style="color:#0a1733;font-size:1.5rem">This page is no longer available</h1>
<p>The lawyer directory has been taken offline. Visit <a href="https://fair-comparisons.com" style="color:#1f44ff">FairComparisons</a> to compare Singapore property agents on real CEA transaction data.</p>
</body></html>`;

export function proxy() {
  return new NextResponse(GONE_BODY, {
    status: 410,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex",
      "cache-control": "public, max-age=3600",
    },
  });
}

export const config = {
  matcher: ["/lawyers", "/lawyers/:path*"],
};
