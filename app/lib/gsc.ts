import { createSign } from "crypto";

// Homebuilt Google Search Console client (service-account JWT auth). No SDK,
// no Windsor. Pulls impressions / clicks / CTR / position / queries / pages
// for the sc-domain:fair-comparisons.com property.
//
// Setup (one-time, done by an operator):
//   1. Google Cloud: create a service account, enable "Google Search Console API".
//   2. Download its JSON key.
//   3. Search Console -> Settings -> Users and permissions -> add the service
//      account email as a Full or Restricted user on the property.
//   4. Set env: GSC_SA_EMAIL, GSC_SA_PRIVATE_KEY (the key, \n-escaped is fine),
//      GSC_SITE_URL (default sc-domain:fair-comparisons.com).

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export const GSC_SITE_URL = process.env.GSC_SITE_URL || "sc-domain:fair-comparisons.com";

export function gscConfigured(): boolean {
  return !!(process.env.GSC_SA_EMAIL && process.env.GSC_SA_PRIVATE_KEY);
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

async function getAccessToken(): Promise<string> {
  const email = process.env.GSC_SA_EMAIL!;
  const key = (process.env.GSC_SA_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL, exp: now + 3600, iat: now }));
  const signature = b64url(createSign("RSA-SHA256").update(`${header}.${claim}`).sign(key));
  const jwt = `${header}.${claim}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) throw new Error(`GSC token exchange failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("GSC token exchange returned no access_token");
  return json.access_token;
}

export type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

export async function querySearchAnalytics(
  token: string,
  body: { startDate: string; endDate: string; dimensions: string[]; rowLimit?: number }
): Promise<GscRow[]> {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ rowLimit: 1000, ...body }),
  });
  if (!res.ok) throw new Error(`GSC searchAnalytics failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { rows?: GscRow[] };
  return json.rows ?? [];
}

export async function gscAccessToken(): Promise<string> {
  return getAccessToken();
}
