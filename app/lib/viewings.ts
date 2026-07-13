import type { SupabaseClient } from "@supabase/supabase-js";
import { normPhone, normEmail } from "./contacts";

// Viewings/Planner reads for the inbox. sg_viewings is keyed by agent_cea_no +
// a free-text attendee_contact (no lead_id/contact_id FK), so joining a viewing
// to a contact is a normalized match, not a SQL join. Service-role only; pass a
// supabaseAdmin() client.

export type AgentViewing = {
  id: string;
  property_label: string | null;
  viewing_at: string | null;
  attendee_name: string | null;
  attendee_contact: string | null;
  message: string | null;
  status: string | null;
  created_at: string | null;
};

export async function listAgentViewings(sb: SupabaseClient, cea: string): Promise<AgentViewing[]> {
  const { data } = await sb
    .from("sg_viewings")
    .select("id, property_label, viewing_at, attendee_name, attendee_contact, message, status, created_at")
    .eq("agent_cea_no", cea)
    .order("viewing_at", { ascending: false });
  return (data ?? []) as AgentViewing[];
}

// The public booking form has a single "Phone or email" field, so
// attendee_contact is EITHER a phone OR an email (raw, never normalized).
// Branch on '@' and compare with the same normalizers used to build the spine.
export function viewingMatchesContact(
  attendeeContact: string | null | undefined,
  keys: { phone_norm?: string | null; email_norm?: string | null },
): boolean {
  const raw = String(attendeeContact ?? "").trim();
  if (!raw) return false;
  if (raw.includes("@")) {
    const e = normEmail(raw);
    return !!e && !!keys.email_norm && e === keys.email_norm;
  }
  const p = normPhone(raw);
  return !!p && !!keys.phone_norm && p === keys.phone_norm;
}
