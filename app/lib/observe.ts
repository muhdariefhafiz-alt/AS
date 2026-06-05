// Lightweight error/event reporting shim for the seller funnel.
//
// Today it logs structured JSON to the console (captured by Vercel's log
// drains). It is shaped so that swapping in @sentry/nextjs later is a 2-line
// change inside captureError / captureEvent — call sites don't change.
//
// To upgrade to Sentry:
//   1. npm i @sentry/nextjs && npx @sentry/wizard@latest -i nextjs
//   2. set SENTRY_DSN in Vercel
//   3. in captureError/captureEvent below, call Sentry.captureException /
//      Sentry.captureMessage with the same tags.

type Tags = Record<string, string | number | null | undefined>;

function redact(tags: Tags): Tags {
  // Never let raw PII into logs. Emails/phones are hashed-or-dropped upstream;
  // this is a backstop for accidental inclusion.
  const out: Tags = {};
  for (const [k, v] of Object.entries(tags)) {
    if (typeof v === "string" && /@|\+?\d{8,}/.test(v) && k !== "route") {
      out[k] = "[redacted]";
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function captureError(
  err: unknown,
  context: { route: string } & Tags
): void {
  const tags = redact(context);
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(
    JSON.stringify({
      level: "error",
      message,
      stack,
      ...tags,
      ts: new Date().toISOString(),
    })
  );
  // SENTRY: Sentry.captureException(err, { tags });
}

export function captureEvent(
  name: string,
  context: { route: string } & Tags
): void {
  const tags = redact(context);
  console.log(
    JSON.stringify({
      level: "info",
      event: name,
      ...tags,
      ts: new Date().toISOString(),
    })
  );
  // SENTRY: Sentry.captureMessage(name, { level: "info", tags });
}
