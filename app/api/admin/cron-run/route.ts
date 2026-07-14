import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/admin-auth";

/**
 * Manual cron trigger. Lets an operator run a scheduled job now, on demand,
 * without waiting for its cron time (core operability during incidents and
 * after data loads).
 *
 * The endpoint is a thin, admin-gated proxy: it re-issues the SAME request the
 * Vercel cron scheduler would, hitting the cron route on this deployment's own
 * origin with the CRON_SECRET bearer token. It never calls an arbitrary URL:
 * the requested path is validated against a fixed whitelist of the real cron
 * paths (sourced from vercel.json), so this cannot be turned into an SSRF /
 * open-fetch primitive.
 *
 * Body: { path: string, dry?: boolean }
 *   path  - must be one of ALLOWED_CRON_PATHS (query string allowed, e.g.
 *           "/api/cron/ai-tracker-scan?surface=chatgpt"); only the pathname is
 *           matched against the whitelist.
 *   dry   - when true, "?dry=1" is appended so dry-run-aware crons build but do
 *           not send / write.
 *
 * Returns { ok, status, body } (body = the cron's JSON, or raw text fallback).
 * Never throws: transport failures return { ok:false, error }. If CRON_SECRET
 * is unset it returns { ok:false, error } with HTTP 200 so the UI shows it.
 */

// Real cron paths, from vercel.json (single source of truth). The four
// ai-tracker-scan schedules differ only by ?surface=, so the base pathname is
// whitelisted once and the query string is allowed through.
const ALLOWED_CRON_PATHS = new Set<string>([
  "/api/cron/refresh-scores",
  "/api/cron/revalidate",
  "/api/cron/ping-google",
  "/api/cron/outreach",
  "/api/cron/agent-activation",
  "/api/cron/weekly-digest",
  "/api/cron/agent-notifications",
  "/api/cron/scrape-contacts",
  "/api/cron/mop-alerts",
  "/api/cron/review-requests",
  "/api/cron/verify-completions",
  "/api/cron/expire-leads",
  "/api/cron/avm-updates",
  "/api/cron/gsc-sync",
  "/api/cron/ai-tracker-scan",
  "/api/cron/standing-digest",
  "/api/cron/hdb-sync",
  "/api/cron/ops-digest",
]);

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let path = "";
  let dry = false;
  try {
    const body = await req.json();
    path = typeof body?.path === "string" ? body.path : "";
    dry = body?.dry === true;
  } catch {
    // fall through to validation below
  }

  if (!path) {
    return NextResponse.json({ ok: false, error: "path required" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;

  // Resolve the requested path against our own origin. An absolute URL in
  // `path` would resolve to its own origin, which we then reject below, so
  // this cannot escape the deployment.
  let target: URL;
  try {
    target = new URL(path, origin);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid path" }, { status: 400 });
  }

  if (target.origin !== origin || !ALLOWED_CRON_PATHS.has(target.pathname)) {
    return NextResponse.json(
      { ok: false, error: `path not in cron whitelist: ${target.pathname}` },
      { status: 400 }
    );
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" });
  }

  if (dry) target.searchParams.set("dry", "1");

  try {
    const res = await fetch(target.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    const text = await res.text();
    let responseBody: unknown = text;
    try {
      responseBody = JSON.parse(text);
    } catch {
      // non-JSON cron response: keep the raw text
    }
    return NextResponse.json({ ok: res.ok, status: res.status, body: responseBody });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "cron fetch failed",
    });
  }
}
