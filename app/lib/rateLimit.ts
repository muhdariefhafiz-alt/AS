// Rate limiting with a Redis backend and a graceful in-memory fallback.
//
// In-memory maps reset on every Vercel cold-start, so per-IP caps are
// effectively decorative in serverless. When UPSTASH_REDIS_REST_URL +
// UPSTASH_REDIS_REST_TOKEN are set, we use Upstash's REST API (INCR + EXPIRE)
// for a durable, cross-instance counter. When they're not set (local dev, or
// before the operator provisions Redis), we fall back to the in-memory map so
// nothing breaks.
//
// Usage:
//   const { limited } = await checkRateLimit(`sell:${ip}`, 5, 3_600_000);
//   if (limited) return 429;

type Bucket = { count: number; resetAt: number };
const memory = new Map<string, Bucket>();

function memoryCheck(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = memory.get(key);
  if (!b || now > b.resetAt) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  b.count++;
  return b.count > max;
}

function redisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

// Upstash REST pipeline: INCR the key, and on first hit set an EXPIRE. We use
// a single pipeline call to keep it to one round trip.
async function redisCheck(
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const windowSec = Math.ceil(windowMs / 1000);
  const namespaced = `rl:${key}`;

  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", namespaced],
      ["EXPIRE", namespaced, String(windowSec), "NX"],
    ]),
    // Never let the limiter hang a request.
    signal: AbortSignal.timeout(1500),
  });

  if (!res.ok) {
    throw new Error(`Upstash ${res.status}`);
  }
  const out = (await res.json()) as Array<{ result: number }>;
  const count = Number(out?.[0]?.result ?? 0);
  return count > max;
}

/**
 * Returns { limited: true } when the caller has exceeded `max` requests in the
 * rolling `windowMs`. Fails OPEN (never blocks) if the Redis backend errors —
 * a rate limiter should never take the site down.
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<{ limited: boolean; backend: "redis" | "memory" }> {
  if (redisConfigured()) {
    try {
      const limited = await redisCheck(key, max, windowMs);
      return { limited, backend: "redis" };
    } catch (e) {
      // Fall through to memory on any Redis error; don't block the request.
      console.error("[rateLimit] redis error, falling back to memory", e);
    }
  }
  return { limited: memoryCheck(key, max, windowMs), backend: "memory" };
}

// Convenience: derive a client IP from the request headers.
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
