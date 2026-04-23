/**
 * Klaviyo wrapper for transactional + marketing sends.
 *
 * Klaviyo's model differs from Resend: instead of sending HTML directly,
 * we (1) upsert a Profile, (2) track an Event with the email payload as
 * properties, then a Klaviyo Flow listening on that metric sends the email
 * using a template that pulls {{ event.subject }} / {{ event.html }}.
 *
 * Required Klaviyo setup (one-time, in dashboard):
 *   - Flow trigger: Metric = "Weekly Digest"        → template uses event vars
 *   - Flow trigger: Metric = "Agent Notification"   → template uses event vars
 *   - Flow trigger: Metric = "Transactional Email"  → generic fallback
 */

const KLAVIYO_API = "https://a.klaviyo.com/api";
const REVISION = "2024-10-15";

function getKey() {
  return process.env.KLAVIYO_API_KEY;
}

function headers() {
  return {
    Authorization: `Klaviyo-API-Key ${getKey()}`,
    "Content-Type": "application/json",
    accept: "application/json",
    revision: REVISION,
  };
}

async function upsertProfile(email: string) {
  const res = await fetch(`${KLAVIYO_API}/profiles/`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      data: { type: "profile", attributes: { email } },
    }),
  });
  // 409 = profile already exists, that's fine
  if (!res.ok && res.status !== 409) {
    const text = await res.text();
    console.error("[klaviyo-profile-error]", res.status, text);
  }
}

async function trackEvent(
  email: string,
  metric: string,
  properties: Record<string, unknown>
) {
  const res = await fetch(`${KLAVIYO_API}/events/`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      data: {
        type: "event",
        attributes: {
          properties,
          metric: { data: { type: "metric", attributes: { name: metric } } },
          profile: { data: { type: "profile", attributes: { email } } },
        },
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[klaviyo-event-error]", res.status, text);
    throw new Error(`Klaviyo event failed: ${res.status}`);
  }
}

export async function sendEmail({
  to,
  subject,
  html,
  metric = "Transactional Email",
  properties = {},
}: {
  to: string;
  subject: string;
  html: string;
  metric?: string;
  properties?: Record<string, unknown>;
}) {
  if (!getKey()) {
    console.log(`[email-skip] No KLAVIYO_API_KEY. Would send to ${to}: ${subject}`);
    return { id: "dry-run" };
  }

  await upsertProfile(to);
  await trackEvent(to, metric, { subject, html, ...properties });
  return { id: "klaviyo-event-queued" };
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
  if (!getKey()) {
    console.log(`[email-skip] No KLAVIYO_API_KEY. Would send ${emails.length} emails.`);
    return [];
  }

  // Klaviyo has no true "batch send" REST endpoint for arbitrary HTML;
  // we fan out events sequentially with light concurrency.
  const results: { to: string; ok: boolean }[] = [];
  const concurrency = 5;
  for (let i = 0; i < emails.length; i += concurrency) {
    const slice = emails.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      slice.map(async (e) => {
        await upsertProfile(e.to);
        await trackEvent(e.to, e.metric ?? "Transactional Email", {
          subject: e.subject,
          html: e.html,
          ...(e.properties ?? {}),
        });
        return e.to;
      })
    );
    settled.forEach((r, idx) =>
      results.push({ to: slice[idx].to, ok: r.status === "fulfilled" })
    );
  }
  return results;
}
