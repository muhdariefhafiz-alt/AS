import { isWhatsAppLive } from "./whatsapp";

// Single source of truth for "can an invite actually be delivered to this
// agent". Used by the shortlist builder, the shortlist page and the invite
// route so they can never disagree.
//
// Email grades come from the MX sweep (scripts/email-mx-sweep.mjs) and the
// Resend webhook: no_mx / bounced / complained mean a send is guaranteed to
// fail or harm sender reputation, so a graded-dead address is NOT a channel.
// Ungraded (null) addresses are assumed usable until data says otherwise.
const DEAD_EMAIL_GRADES = new Set(["no_mx", "bounced", "complained"]);

export function isEmailUsable(
  email: string | null | undefined,
  emailStatus: string | null | undefined
): boolean {
  if (!email) return false;
  return !DEAD_EMAIL_GRADES.has(emailStatus ?? "");
}

// WhatsApp is an AUTOMATED channel only when the agent opted in (claimed +
// consented + provided their own number, recorded as whatsapp_opt_in_at) AND
// the API is provisioned. A scraped number without opt-in is NOT auto-reachable
// (the WhatsApp Business Policy forbids messaging non-opted-in users); it stays
// manual-operator-only via the admin wa.me digest.
export function isWhatsAppAutoReachable(a: {
  whatsapp?: string | null;
  whatsapp_opt_in_at?: string | null;
}): boolean {
  return Boolean(a.whatsapp) && Boolean(a.whatsapp_opt_in_at) && isWhatsAppLive();
}

export function isAgentReachable(a: {
  email?: string | null;
  email_status?: string | null;
  whatsapp?: string | null;
  whatsapp_opt_in_at?: string | null;
}): boolean {
  return isEmailUsable(a.email, a.email_status) || isWhatsAppAutoReachable(a);
}
