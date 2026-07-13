import type { SupabaseClient } from "@supabase/supabase-js";

// Contact identity resolution (the sg_contacts spine, Unified Inbox Phase 0).
// One row per real person, resolved across leads by normalized phone/email.
// Phone-first, then email, mirroring the backfill in the Phase-0 migration.
// Service-role only: callers pass a supabaseAdmin() client.

// SG local number = last 8 digits (drops +65 / 65 country code, spaces, dashes).
export function normPhone(raw?: string | null): string | null {
  if (!raw) return null;
  const d = String(raw).replace(/\D/g, "");
  if (!d) return null;
  return d.length > 8 ? d.slice(-8) : d;
}

export function normEmail(raw?: string | null): string | null {
  if (!raw) return null;
  const e = String(raw).trim().toLowerCase();
  return e || null;
}

type ResolveInput = {
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  fullName?: string | null;
  seenAt?: string; // ISO; defaults to now
};

// Resolve (or create) the contact for a lead's details and return its id.
// Best-effort: returns null when there is no usable key or on unrecoverable
// error. Never throws to the caller's happy path.
export async function resolveContactId(sb: SupabaseClient, input: ResolveInput): Promise<number | null> {
  const phone_norm = normPhone(input.phone) ?? normPhone(input.whatsapp);
  const email_norm = normEmail(input.email);
  const whatsapp_norm = input.whatsapp ? String(input.whatsapp).replace(/\D/g, "") || null : null;
  if (!phone_norm && !email_norm) return null;

  const nowIso = input.seenAt ?? new Date().toISOString();

  const find = async (): Promise<number | null> => {
    if (phone_norm) {
      const { data } = await sb.from("sg_contacts").select("id").eq("phone_norm", phone_norm).maybeSingle();
      if (data?.id) return Number(data.id);
    }
    if (email_norm) {
      const { data } = await sb.from("sg_contacts").select("id").eq("email_norm", email_norm).maybeSingle();
      if (data?.id) return Number(data.id);
    }
    return null;
  };

  try {
    const existing = await find();
    if (existing) {
      const upd: Record<string, unknown> = { last_seen_at: nowIso, updated_at: nowIso };
      if (input.fullName) upd.full_name = input.fullName;
      await sb.from("sg_contacts").update(upd).eq("id", existing);
      return existing;
    }

    const { data, error } = await sb
      .from("sg_contacts")
      .insert({
        phone_norm,
        email_norm,
        whatsapp_norm,
        full_name: input.fullName ?? null,
        first_seen_at: nowIso,
        last_seen_at: nowIso,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      // Unique-violation race: a concurrent request created the same contact.
      // Re-find and use theirs.
      return await find();
    }
    return data?.id ? Number(data.id) : null;
  } catch (e) {
    console.error("[contacts] resolveContactId failed", e);
    return null;
  }
}
