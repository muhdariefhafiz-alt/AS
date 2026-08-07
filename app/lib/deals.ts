import type { SupabaseClient } from "@supabase/supabase-js";

// The deal spine.
//
// Safe to import from the client: the only server dependency is the injected
// SupabaseClient, which is a type import and erased at build. The stage labels
// and nextAction() are shared with the Pipeline panel deliberately, so the
// vocabulary an agent reads cannot drift from the one the server writes.
//
// Rule that shapes everything here: an agent is never asked to create a deal.
// They book a viewing, or they draw up a letter of intent, and the deal is
// already there when they look. A product that opens with "New deal +" has
// moved its own filing problem onto the person holding the phone.
//
// So every entry point calls attachOrCreateDeal(), which either finds the open
// deal for that property or starts one, and stages advance from real events
// rather than from a dropdown nobody maintains.

export const DEAL_STAGES = ["enquiry", "viewing", "offer", "agreement", "completed", "lost"] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

// Workflow order. Stage never moves backwards automatically: a deal that
// reached Offer does not fall back to Viewing because a second viewing was
// booked, which is a normal thing to do while negotiating.
const RANK: Record<DealStage, number> = {
  enquiry: 0,
  viewing: 1,
  offer: 2,
  agreement: 3,
  completed: 4,
  lost: 4,
};

export const STAGE_LABEL: Record<DealStage, string> = {
  enquiry: "Enquiry",
  viewing: "Viewing",
  offer: "Offer",
  agreement: "Agreement",
  completed: "Completed",
  lost: "Lost",
};

export type Deal = {
  id: string;
  agent_id: number;
  stage: DealStage;
  property_label: string;
  property_key: string;
  postal_code: string | null;
  property_type: string | null;
  counterparty_name: string | null;
  counterparty_contact: string | null;
  side: string | null;
  rent_or_price: string | null;
  source: string;
  stage_set_manually_at: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

/**
 * Normalised property identity. Two records belong to the same deal when an
 * agent would say they are the same flat, which is a looser test than string
 * equality: "18 Sample Gardens #08-08" and "18 SAMPLE GARDENS  #08-08," are one
 * property. Punctuation and case go, whitespace collapses, and the common
 * Singapore unit prefixes are normalised so "#08-08" and "08-08" agree.
 */
export function propertyKey(label: string): string {
  return String(label ?? "")
    .toLowerCase()
    .replace(/[#,.]/g, " ")
    .replace(/\bblk\b/g, "block")
    .replace(/\bunit\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Exported: the Today worklist reads the same definition of "still work".
export const OPEN_STAGES: DealStage[] = ["enquiry", "viewing", "offer", "agreement"];

type AttachInput = {
  agentId: number;
  propertyLabel: string;
  // The stage a NEWLY created deal starts at. It is never applied to a deal
  // that already exists: opening a blank form is not evidence that a stage
  // happened, and a deal that jumped to Offer because someone tapped a button
  // would make "reached agreement" a count of button taps.
  createStage: DealStage;
  source: string;
  trigger: string;
  postalCode?: string | null;
  propertyType?: string | null;
  counterpartyName?: string | null;
  counterpartyContact?: string | null;
  side?: string | null;
  rentOrPrice?: string | null;
  // A won seller lead is a distinct INSTRUCTION, not just a property. Set this
  // and the deal is keyed on the lead and stamped with it.
  linkLeadId?: number | null;
  // False when propertyLabel is a category fallback rather than an address
  // ("CONDO", "HDB flat in Tampines"). The seller form makes the street address
  // optional, and it only offers the town select for HDB, so an address-less
  // condo produced the bare label "CONDO" for every district on the island.
  // Two such wins by one agent normalised to the same property_key and merged
  // into ONE pipeline row carrying only the first seller's name and contact,
  // with no signal that a second listing had arrived. A category is not a
  // property and must never merge two counterparties.
  labelIsAddress?: boolean;
};

/**
 * Find the open deal for this property, or start one. Returns the deal id, or
 * null when the property is unusable (a document started with no address yet)
 * so callers can carry on without a deal rather than failing.
 */
export async function attachOrCreateDeal(sb: SupabaseClient, input: AttachInput): Promise<string | null> {
  const label = String(input.propertyLabel ?? "").trim();
  const key = propertyKey(label);
  // No address yet is a normal state: an agent can start a letter of intent
  // before typing the unit. The deal appears when the property does.
  if (!key) return null;

  const SELECT = "id, stage, counterparty_name, counterparty_contact, postal_code, property_type, rent_or_price, side";

  // A lead-keyed deal wins over a label match: the same instruction must always
  // resolve to the same deal, whatever the label says.
  let existing = null as Record<string, unknown> | null;
  if (input.linkLeadId) {
    const { data: byLead } = await sb
      .from("sg_deals")
      .select(SELECT)
      .eq("agent_id", input.agentId)
      .eq("linked_lead_id", input.linkLeadId)
      .limit(1)
      .maybeSingle();
    if (byLead) existing = byLead;
  }

  // Only match by property when the label IS a property. For a lead carrying a
  // category label, skipping this is the whole fix: it forces a new deal rather
  // than folding a second seller into the first seller's row.
  const labelCanMatch = !(input.linkLeadId && input.labelIsAddress === false);
  if (!existing && labelCanMatch) {
    const { data: byKey } = await sb
      .from("sg_deals")
      .select(SELECT)
      .eq("agent_id", input.agentId)
      .eq("property_key", key)
      .in("stage", OPEN_STAGES)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byKey) existing = byKey;
  }

  if (existing) {
    // Fill in blanks the new context knows about, never overwrite what the
    // agent has already put there.
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (!existing.counterparty_name && input.counterpartyName) patch.counterparty_name = input.counterpartyName;
    if (!existing.counterparty_contact && input.counterpartyContact) patch.counterparty_contact = input.counterpartyContact;
    if (!existing.postal_code && input.postalCode) patch.postal_code = input.postalCode;
    if (!existing.property_type && input.propertyType) patch.property_type = input.propertyType;
    if (!existing.rent_or_price && input.rentOrPrice) patch.rent_or_price = input.rentOrPrice;
    if (!existing.side && input.side) patch.side = input.side;
    await sb.from("sg_deals").update(patch).eq("id", existing.id);
    return String(existing.id);
  }

  const { data: created, error } = await sb
    .from("sg_deals")
    .insert({
      agent_id: input.agentId,
      stage: input.createStage,
      property_label: label,
      property_key: key,
      postal_code: input.postalCode ?? null,
      property_type: input.propertyType ?? null,
      counterparty_name: input.counterpartyName ?? null,
      counterparty_contact: input.counterpartyContact ?? null,
      side: input.side ?? null,
      rent_or_price: input.rentOrPrice ?? null,
      source: input.source,
      linked_lead_id: input.linkLeadId ?? null,
    })
    .select("id")
    .maybeSingle();

  // supabase-js resolves with an error rather than throwing, so an unchecked
  // insert would make a broken spine look like an unused feature.
  if (error || !created) {
    console.error("[deals] create failed", error);
    return null;
  }

  await sb.from("sg_deal_events").insert({
    deal_id: created.id,
    agent_id: input.agentId,
    from_stage: null,
    to_stage: input.createStage,
    trigger: input.trigger,
  });

  return String(created.id);
}

/**
 * Move a deal forward. Never backwards, never past a manual override, never
 * out of a closed stage. Records the transition so dwell time is measured from
 * fact rather than guessed from updated_at.
 */
export async function advanceStage(
  sb: SupabaseClient,
  dealId: string,
  to: DealStage,
  trigger: string,
): Promise<void> {
  const { data: deal } = await sb
    .from("sg_deals")
    .select("id, agent_id, stage, stage_set_manually_at")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return;

  const from = deal.stage as DealStage;
  // A closed deal is the agent's word and nothing reopens it automatically.
  // A manual stage anywhere else is a correction, not a lock: if the agent then
  // finalises a letter of intent, that IS evidence of an offer and the deal
  // should follow. The first version blocked every later move, which quietly
  // froze a deal forever after one correction.
  if (from === "completed" || from === "lost") return;
  if (RANK[to] <= RANK[from]) return;

  const { error } = await sb
    .from("sg_deals")
    .update({ stage: to, updated_at: new Date().toISOString() })
    .eq("id", dealId);
  if (error) {
    console.error("[deals] stage update rejected", error);
    return;
  }

  await sb.from("sg_deal_events").insert({
    deal_id: dealId,
    agent_id: deal.agent_id,
    from_stage: from,
    to_stage: to,
    trigger,
  });
}

/**
 * The single next action for a deal, phrased as the thing the agent would say
 * they are about to do. This is what makes a pipeline row readable at a glance
 * rather than a stage badge the agent has to translate.
 */
export function nextAction(stage: DealStage, has: { viewing: boolean; loi: boolean; ta: boolean }): string {
  switch (stage) {
    case "enquiry":
      if (has.viewing) return "Confirm the viewing";
      // A deal with a draft already open is not waiting on a viewing; it is
      // waiting on the agent to finish what they started. Nothing in the
      // dashboard books a viewing on their behalf, so when there is nothing
      // open the action names the two things they can actually do.
      if (has.loi || has.ta) return "Finish the paperwork you started";
      return "Share your booking link, or start the paperwork";
    case "viewing":
      return has.loi ? "Finish the letter of intent" : "Issue a letter of intent";
    case "offer":
      if (has.ta) return "Finish the tenancy agreement";
      // Only a rental offer chains into a tenancy agreement. A deal that
      // reached Offer without a letter of intent is something else (a sale, or
      // a deal the agent staged by hand) and must not be told to write a lease.
      return has.loi ? "Create the tenancy agreement" : "Add the paperwork for this deal";
    case "agreement":
      return "Mark it completed when the lease starts";
    case "completed":
      return "Done";
    case "lost":
      return "Closed";
  }
}

/**
 * Mark a deal as touched. Work on a document is work on its deal, and without
 * this an agent grinding through a tenancy agreement for six weeks would see
 * their busiest deal flagged as sitting untouched.
 */
export async function touchDeal(sb: SupabaseClient, dealId: string): Promise<void> {
  await sb.from("sg_deals").update({ updated_at: new Date().toISOString() }).eq("id", dealId);
}
