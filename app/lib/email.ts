/**
 * Transactional email via Resend.
 *
 * Resend is the only provider. Klaviyo was removed 2026-08-06: it never sent
 * anything from this app (sendEmail short-circuited to Resend whenever
 * RESEND_API_KEY was set, which it always is in production), and its 5 Live
 * flows recorded 0 deliveries over 30 days while Resend delivered the same mail.
 *
 * Keeping it as a fallback was the real hazard, not the cost. Klaviyo only fires
 * an EVENT and depends on a per-metric Flow to actually send, so any email whose
 * metric had no live Flow was silently dropped. That is exactly how admin login,
 * claim verification and agent invites broke once before. A rotated or expired
 * Resend key would have silently reverted every send to that behaviour.
 *
 * So there is no fallback now. If Resend is not configured, sending FAILS LOUDLY
 * and returns an error id rather than pretending to have sent.
 *
 * `metric` survives the removal as a human-readable label ("Agent Claimed",
 * "Seller Quote Ready") because ~20 call sites already pass it and it is genuinely
 * useful in logs. `properties` is accepted and ignored; it fed Klaviyo templates
 * and has no Resend equivalent.
 */

export async function sendEmail({
  to,
  subject,
  html,
  metric = "Transactional Email",
}: {
  to: string;
  subject: string;
  html: string;
  metric?: string;
  /** Legacy event properties. Accepted for call-site compatibility, never read. */
  properties?: Record<string, unknown>;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.error(
      `[email] NOT SENT, RESEND_API_KEY is not configured. "${subject}" to ${to} (${metric})`
    );
    return { id: "not-configured", error: "RESEND_API_KEY missing" };
  }
  return sendViaResend({ to, subject, html, metric });
}

// Derive a plain-text alternative from the HTML. A text/plain part is a strong
// deliverability signal (HTML-only mail is a common spam-filter trigger), so we
// always send both. Best-effort conversion: links become "text (url)", block
// tags become newlines, entities and tags are stripped.
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<span[^>]*display:none[\s\S]*?<\/span>/gi, "") // hidden preheader
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<(br|\/p|\/div|\/tr|\/h[1-6]|\/li)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2019;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/^[ \t]+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Direct send via Resend (https://resend.com). Requires RESEND_API_KEY and a
// verified sending domain; RESEND_FROM overrides the default From. We send from
// a real monitored inbox (not "noreply", which mailbox providers penalise) and
// always include a text/plain part alongside the HTML for deliverability.
async function sendViaResend({
  to,
  subject,
  html,
  metric,
}: {
  to: string;
  subject: string;
  html: string;
  metric?: string;
}) {
  const from =
    process.env.RESEND_FROM ?? "FairComparisons <hello@fair-comparisons.com>";
  // Best-effort: never throw. Callers invoke sendEmail fire-and-forget (no
  // await/catch), so a provider failure must not become an unhandled rejection
  // or roll back the caller's request. Failures are logged and returned.
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html, text: htmlToText(html) }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[email/resend] send failed", metric ?? "", res.status, text);
      return { id: "resend-error", error: `Resend ${res.status}` };
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { id: json.id ?? "resend" };
  } catch (err) {
    console.error("[email/resend] send threw", metric ?? "", err);
    return { id: "resend-error", error: String(err) };
  }
}

export async function sendBatchEmails(
  emails: {
    to: string;
    subject: string;
    html: string;
    metric?: string;
    properties?: Record<string, unknown>;
  }[]
) {
  if (!process.env.RESEND_API_KEY) {
    console.error(
      `[email] NOT SENT, RESEND_API_KEY is not configured. ${emails.length} batch emails dropped.`
    );
    return emails.map((e) => ({ to: e.to, ok: false }));
  }

  const results: { to: string; ok: boolean }[] = [];
  const concurrency = 5;
  for (let i = 0; i < emails.length; i += concurrency) {
    const slice = emails.slice(i, i + concurrency);
    const settled = await Promise.all(
      slice.map((e) =>
        sendViaResend({ to: e.to, subject: e.subject, html: e.html, metric: e.metric })
      )
    );
    settled.forEach((r, idx) => {
      results.push({ to: slice[idx].to, ok: !(r as { error?: string }).error });
    });
  }
  return results;
}
