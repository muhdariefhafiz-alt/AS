import type { ContentBlock } from "./render";
import {
  addressTitle,
  fieldKeysOf,
  fmtDate,
  leaseEndDate,
  money,
  normTermMonths,
  truthy,
  type DocFields,
  type Section,
} from "./schema";

// Residential tenancy agreement, template tenancy_residential_v1.
// Standard, neutral Singapore residential TA. This is a template for the
// agent's review, NOT legal advice. Keep clauses standard; do not add
// advisory or one-sided terms.
//
// Field/section types and the formatting helpers live in schema.ts, shared with
// every other template so the client form renderer stays one implementation.

export const TENANCY_SECTIONS: Section[] = [
  {
    title: "The property",
    fields: [
      { key: "premises_address", label: "Property address", type: "text", required: true, colSpan: 2, placeholder: "Block, street, unit" },
      { key: "premises_postal", label: "Postal code", type: "text", placeholder: "Singapore 000000" },
      { key: "premises_type", label: "Property type", type: "select", required: true, options: ["HDB flat", "Condominium or apartment", "Landed property", "Room in a shared flat"] },
      { key: "furnishing", label: "Furnishing", type: "select", required: true, options: ["Unfurnished", "Partially furnished", "Fully furnished"] },
    ],
  },
  {
    title: "The landlord",
    fields: [
      { key: "landlord_name", label: "Landlord name", type: "text", required: true },
      { key: "landlord_id", label: "NRIC / FIN / UEN", type: "text", hint: "Optional. Only what the agreement needs." },
      { key: "landlord_contact", label: "Contact", type: "text", placeholder: "Phone or email" },
      { key: "landlord_address", label: "Correspondence address", type: "text", colSpan: 2 },
    ],
  },
  {
    title: "The tenant",
    fields: [
      { key: "tenant_name", label: "Tenant name", type: "text", required: true },
      { key: "tenant_id", label: "NRIC / FIN / Passport", type: "text", hint: "Optional." },
      { key: "tenant_contact", label: "Contact", type: "text", placeholder: "Phone or email" },
      { key: "tenant_address", label: "Correspondence address", type: "text", colSpan: 2 },
    ],
  },
  {
    title: "Lease terms",
    fields: [
      { key: "start_date", label: "Start date", type: "date", required: true },
      { key: "term_months", label: "Term (months)", type: "number", required: true, default: "12" },
      { key: "rent_amount", label: "Monthly rent", type: "money", required: true },
      { key: "rent_payment_day", label: "Rent payable on", type: "text", default: "the 1st day of each calendar month" },
      { key: "security_deposit", label: "Security deposit", type: "money", required: true, hint: "Often one month's rent per year of lease." },
      { key: "utility_deposit", label: "Utility deposit", type: "money", hint: "Optional." },
    ],
  },
  {
    title: "Standard clauses",
    fields: [
      { key: "minor_repair_cap", label: "Minor repairs borne by tenant, up to (per item)", type: "money", default: "150" },
      { key: "diplomatic_clause", label: "Include a diplomatic clause", type: "checkbox" },
      { key: "diplomatic_after_months", label: "Earliest the tenant may invoke it (months)", type: "number", default: "12", showIf: { key: "diplomatic_clause", equals: "true" } },
      { key: "option_to_renew", label: "Include an option to renew", type: "checkbox" },
      { key: "renew_notice_days", label: "Renewal notice (days)", type: "number", default: "60", showIf: { key: "option_to_renew", equals: "true" } },
      { key: "inventory", label: "Inventory of furniture and fittings", type: "textarea", colSpan: 2, placeholder: "List the Landlord's items, or write 'See attached inventory'." },
      { key: "special_conditions", label: "Special conditions", type: "textarea", colSpan: 2, placeholder: "Anything specific to this tenancy (optional)." },
    ],
  },
  {
    title: "You (the salesperson)",
    note: "Pre-filled from your profile. Shown on the agreement as the facilitating salesperson.",
    fields: [
      { key: "agent_name", label: "Salesperson", type: "text", required: true, group: "agent" },
      { key: "agent_cea", label: "CEA registration no.", type: "text", required: true, group: "agent" },
      { key: "agency_name", label: "Agency", type: "text", group: "agent" },
      { key: "agent_contact", label: "Contact", type: "text", group: "agent" },
      { key: "agent_represents", label: "You are acting for the", type: "select", options: ["Landlord", "Tenant", "Both parties"], default: "Landlord", group: "agent" },
    ],
  },
];

export const TENANCY_FIELD_KEYS = fieldKeysOf(TENANCY_SECTIONS);

// Unchanged Phase 1 behaviour, now expressed through the shared helper.
const endDate = (startIso: string | undefined, months: string | undefined) => leaseEndDate(startIso, months);

export function tenancyTitle(f: DocFields): string {
  return addressTitle("TA", f.premises_address, "New tenancy");
}

export function tenancyContent(f: DocFields): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  blocks.push({ kind: "title", text: "TENANCY AGREEMENT" });
  blocks.push({ kind: "subtitle", text: "A standard template prepared for your review. This is not legal advice." });
  blocks.push({
    kind: "para",
    text: "This Tenancy Agreement is made on the date of signing set out below between the Landlord and the Tenant named below. The Landlord agrees to let, and the Tenant agrees to take, the Premises on the terms set out in this Agreement.",
    gap: 8,
  });

  blocks.push({
    kind: "kv",
    heading: "Landlord",
    rows: [
      ["Name", f.landlord_name || "—"],
      ...(f.landlord_id ? [["NRIC/FIN/UEN", f.landlord_id] as [string, string]] : []),
      ["Contact", f.landlord_contact || "—"],
      ...(f.landlord_address ? [["Address", f.landlord_address] as [string, string]] : []),
    ],
  });
  blocks.push({
    kind: "kv",
    heading: "Tenant",
    rows: [
      ["Name", f.tenant_name || "—"],
      ...(f.tenant_id ? [["NRIC/FIN/Passport", f.tenant_id] as [string, string]] : []),
      ["Contact", f.tenant_contact || "—"],
      ...(f.tenant_address ? [["Address", f.tenant_address] as [string, string]] : []),
    ],
  });
  blocks.push({ kind: "rule" });

  let n = 0;
  const type = (f.premises_type || "property").toLowerCase();
  const furn = (f.furnishing || "").toLowerCase();
  blocks.push({
    kind: "clause",
    n: ++n,
    heading: "Premises",
    body: [
      `The Landlord lets and the Tenant takes ${f.premises_address || "____________________"}${f.premises_postal ? `, ${f.premises_postal}` : ""} (the "Premises"), being a ${type}${furn ? `, ${furn}` : ""}.`,
    ],
  });
  blocks.push({
    kind: "clause",
    n: ++n,
    heading: "Term",
    body: [
      `The tenancy is for a fixed term of ${normTermMonths(f.term_months)} months commencing on ${fmtDate(f.start_date)} and ending on ${endDate(f.start_date, f.term_months)} (the "Term").`,
    ],
  });
  blocks.push({
    kind: "clause",
    n: ++n,
    heading: "Rent",
    body: [
      `The Tenant shall pay to the Landlord a monthly rent of ${money(f.rent_amount)}, in advance and without deduction, on ${f.rent_payment_day || "the 1st day of each calendar month"}.`,
    ],
  });
  blocks.push({
    kind: "clause",
    n: ++n,
    heading: "Security deposit",
    body: [
      `The Tenant has paid to the Landlord a security deposit of ${money(f.security_deposit)} (the "Deposit") as security for the due performance of this Agreement. The Deposit shall be refunded to the Tenant within fourteen (14) days after the end of the Term, less any lawful deductions for breach of this Agreement or for damage beyond fair wear and tear.`,
      ...(f.utility_deposit && Number(f.utility_deposit) > 0
        ? [`The Tenant has also paid a utility deposit of ${money(f.utility_deposit)}, refundable on the same basis.`]
        : []),
    ],
  });
  blocks.push({
    kind: "clause",
    n: ++n,
    heading: "Tenant's covenants",
    body: [
      "The Tenant agrees:",
      {
        list: [
          "to pay the rent on the due dates;",
          "to use the Premises for private residential purposes only;",
          "to keep the interior of the Premises in good and tenantable condition, fair wear and tear excepted;",
          `to bear the cost of minor repairs and replacements up to ${money(f.minor_repair_cap || "150")} per item;`,
          "not to make structural alterations without the Landlord's prior written consent;",
          "not to assign or sublet the Premises without the Landlord's prior written consent;",
          "to permit the Landlord or the Landlord's agent to inspect the Premises at reasonable times on prior notice;",
          "to pay for utilities, internet and services consumed at the Premises; and",
          "to deliver up the Premises in a like condition at the end of the Term.",
        ],
      },
    ],
  });
  blocks.push({
    kind: "clause",
    n: ++n,
    heading: "Landlord's covenants",
    body: [
      "The Landlord agrees:",
      {
        list: [
          "to give the Tenant quiet enjoyment of the Premises during the Term;",
          "to keep the structure, exterior and the Landlord's fixtures and fittings in good repair; and",
          "to pay the property tax and any maintenance or management charges payable by the owner.",
        ],
      },
    ],
  });
  if (truthy(f.diplomatic_clause)) {
    blocks.push({
      kind: "clause",
      n: ++n,
      heading: "Diplomatic clause",
      body: [
        `If, after the first ${f.diplomatic_after_months || "12"} months of the Term, the Tenant is required to leave Singapore permanently for reasons beyond the Tenant's control, the Tenant may terminate this Agreement by giving not less than two (2) months' written notice together with reasonable supporting evidence.`,
      ],
    });
  }
  if (truthy(f.option_to_renew)) {
    blocks.push({
      kind: "clause",
      n: ++n,
      heading: "Option to renew",
      body: [
        `The Tenant may renew this Agreement for a further term by giving the Landlord not less than ${f.renew_notice_days || "60"} days' written notice before the end of the Term, at a rent and on terms to be mutually agreed.`,
      ],
    });
  }
  blocks.push({
    kind: "clause",
    n: ++n,
    heading: "Inventory",
    body: [
      f.inventory && f.inventory.trim()
        ? `The Landlord's furniture, fixtures and fittings provided with the Premises are as follows: ${f.inventory.trim()}`
        : "An inventory of the Landlord's furniture and fittings, once agreed and signed by the parties, forms part of this Agreement.",
    ],
  });
  blocks.push({
    kind: "clause",
    n: ++n,
    heading: "Stamp duty",
    body: ["The Tenant shall be responsible for the stamp duty payable on this Agreement and shall pay it within the time prescribed by law."],
  });
  blocks.push({
    kind: "clause",
    n: ++n,
    heading: "Governing law",
    body: ["This Agreement is governed by and construed in accordance with the laws of Singapore, and the parties submit to the jurisdiction of the Singapore courts."],
  });
  if (f.special_conditions && f.special_conditions.trim()) {
    blocks.push({ kind: "clause", n: ++n, heading: "Special conditions", body: [f.special_conditions.trim()] });
  }

  blocks.push({ kind: "spacer", h: 6 });
  const represents = (f.agent_represents || "Landlord").replace("Both parties", "Landlord and the Tenant");
  blocks.push({
    kind: "para",
    text: `This tenancy was facilitated by ${f.agent_name || "____________________"} (CEA Reg. No. ${f.agent_cea || "________"})${f.agency_name ? ` of ${f.agency_name}` : ""}, acting for the ${represents}.`,
    gap: 6,
  });

  blocks.push({
    kind: "signatures",
    blocks: [
      { role: "Signed by the Landlord", name: f.landlord_name || undefined, sub: "Date: ____________________" },
      { role: "Signed by the Tenant", name: f.tenant_name || undefined, sub: "Date: ____________________" },
      { role: "Witnessed by (Salesperson)", name: f.agent_name || undefined, sub: `${f.agent_cea ? `CEA ${f.agent_cea}` : ""}${f.agency_name ? ` · ${f.agency_name}` : ""}` },
    ],
  });

  return blocks;
}
