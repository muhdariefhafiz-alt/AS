import type { ContentBlock } from "./render";
import {
  addressTitle,
  fieldKeysOf,
  fmtDate,
  leaseEndDate,
  lines,
  money,
  moneyNumber,
  moneyWords,
  normInt,
  normTermMonths,
  truthy,
  type DocFields,
  type Section,
} from "./schema";

// Letter of Intent (residential lease), template loi_residential_v1.
//
// Structure follows established Singapore agency practice: the LOI is the
// SALESPERSON'S letter, issued over their name and CEA registration, addressed
// to the landlord, conveying the prospective tenant's terms and enclosing a
// good-faith deposit. It is expressed subject to contract and is superseded by
// the tenancy agreement.
//
// Every market convention below is an EDITABLE FIELD with a hint, never fixed
// boilerplate: real agency forms disagree with each other (one converts the
// good-faith deposit into the security deposit, another into the first month's
// advance rental; diplomatic-clause thresholds and repair caps vary). Encoding
// one house's practice as fact would put words in the agent's mouth.
//
// This is a standard template for the agent's review, NOT legal advice, and it
// gives none. Stamp duty is never computed here: lease duty is calculated with
// current IRAS rates by the stamp-duty tool, never by a formula copied off an
// old agency form.

export const LOI_SECTIONS: Section[] = [
  {
    title: "This letter",
    fields: [
      { key: "loi_date", label: "Date of this letter", type: "date", required: true },
      { key: "subject_to_contract", label: "Mark it \"subject to contract\"", type: "checkbox", default: "true", hint: "Standard on an LOI: signals the parties are not yet bound by a lease." },
    ],
  },
  {
    title: "The property",
    fields: [
      { key: "premises_address", label: "Property address", type: "text", required: true, colSpan: 2, placeholder: "Block, street, unit" },
      { key: "premises_postal", label: "Postal code", type: "text", placeholder: "Singapore 000000" },
      { key: "premises_type", label: "Property type", type: "select", options: ["HDB flat", "Condominium or apartment", "Landed property", "Room in a shared flat"] },
      { key: "furnishing", label: "Furnishing", type: "select", options: ["Unfurnished", "Partially furnished", "Fully furnished"] },
    ],
  },
  {
    title: "The landlord",
    note: "The letter is addressed to the landlord.",
    fields: [
      { key: "landlord_name", label: "Landlord name", type: "text", required: true, colSpan: 2 },
      { key: "landlord_id", label: "NRIC / FIN / UEN", type: "text", hint: "Optional. Only if the letter needs it." },
      { key: "landlord_address", label: "Address", type: "text", colSpan: 2 },
    ],
  },
  {
    title: "The tenant",
    fields: [
      { key: "tenant_name", label: "Tenant name", type: "text", required: true },
      { key: "tenant_id", label: "NRIC / FIN / Passport", type: "text", hint: "Optional." },
      { key: "tenant_address", label: "Correspondence address", type: "text", colSpan: 2 },
      { key: "occupiers", label: "Occupier(s)", type: "textarea", colSpan: 2, placeholder: "One name per line. Leave blank if the tenant is the only occupier.", hint: "Agency forms name occupiers separately from the tenant." },
    ],
  },
  {
    title: "Lease terms",
    fields: [
      { key: "start_date", label: "Lease commences on", type: "date", required: true },
      { key: "term_months", label: "Term (months)", type: "number", required: true, default: "12" },
      { key: "term_extra_days", label: "Plus (days)", type: "number", hint: "Optional. For a term such as 24 months and 8 days." },
      { key: "rent_amount", label: "Monthly rent", type: "money", required: true },
      { key: "rent_inclusive", label: "Rent includes fixtures, fittings and maintenance fees", type: "checkbox", default: "true" },
      { key: "option_to_renew", label: "Include an option to renew", type: "checkbox" },
      { key: "renew_months", label: "Renewal term (months)", type: "number", default: "12", showIf: { key: "option_to_renew", equals: "true" } },
      { key: "security_deposit_months", label: "Security deposit (months)", type: "number", default: "1", hint: "Convention: one month per year of lease." },
      { key: "security_deposit", label: "Security deposit amount", type: "money", required: true },
      { key: "advance_rental_months", label: "Advance rental (months)", type: "number", default: "1" },
    ],
  },
  {
    title: "Good-faith deposit",
    note: "The deposit that accompanies this letter, and what happens to it.",
    fields: [
      { key: "deposit_amount", label: "Good-faith deposit", type: "money", required: true, hint: "Convention: one month's rent for a one-year lease, two for two years." },
      { key: "deposit_method", label: "Paid by", type: "select", options: ["Bank transfer", "PayNow", "Cheque", "Cash"], default: "Bank transfer" },
      { key: "deposit_payee", label: "Payable to", type: "text", placeholder: "Landlord's name as on the account", hint: "The landlord or the landlord's account. CEA does not permit a salesperson to hold transaction money." },
      { key: "deposit_account", label: "Account details", type: "text", colSpan: 2, placeholder: "Bank and account number, if the landlord gave them", hint: "Optional." },
      { key: "deposit_converts_to", label: "On signing the tenancy agreement it becomes", type: "select", default: "Part of the security deposit", options: ["Part of the security deposit", "Part of the first month's advance rental"], colSpan: 2, hint: "Agency forms differ on this. Pick what you agreed." },
      { key: "ta_deadline_days", label: "Tenancy agreement to be signed within (days)", type: "number", default: "7" },
    ],
  },
  {
    title: "Standard terms",
    fields: [
      { key: "stamp_duty_by", label: "Stamp duty borne by", type: "select", options: ["Tenant", "Landlord"], default: "Tenant" },
      { key: "utilities_by", label: "Utilities borne by", type: "select", options: ["Tenant", "Landlord"], default: "Tenant" },
      { key: "telecom_by_tenant", label: "Telecoms and internet borne by the tenant", type: "checkbox", default: "true" },
      { key: "cable_by_tenant", label: "Cable television borne by the tenant", type: "checkbox" },
      { key: "aircon_servicing", label: "Tenant services the air-conditioning", type: "checkbox", default: "true" },
      { key: "aircon_frequency", label: "Servicing interval", type: "select", options: ["Monthly", "Quarterly", "Half-yearly"], default: "Quarterly", showIf: { key: "aircon_servicing", equals: "true" } },
      { key: "immigration_clause", label: "Occupants must comply with immigration law", type: "checkbox", default: "true" },
      { key: "minor_repair_cap", label: "Minor repairs borne by tenant, up to (per item)", type: "money", default: "150", hint: "Market range is about S$150 to S$300." },
      { key: "diplomatic_clause", label: "Include a diplomatic clause", type: "checkbox" },
      { key: "diplomatic_after_months", label: "Earliest the tenant may invoke it (months)", type: "number", default: "12", showIf: { key: "diplomatic_clause", equals: "true" } },
      { key: "diplomatic_notice_months", label: "Notice required (months)", type: "number", default: "2", showIf: { key: "diplomatic_clause", equals: "true" } },
      { key: "diplomatic_reimburse", label: "Tenant reimburses pro-rated commission if invoked", type: "checkbox", showIf: { key: "diplomatic_clause", equals: "true" } },
      { key: "handover", label: "Condition on handover", type: "select", options: ["As is, where is", "With the requirements listed below"], default: "With the requirements listed below", colSpan: 2 },
      { key: "tenant_requirements", label: "Tenant's requirements", type: "textarea", colSpan: 2, placeholder: "One per line. For example: professional cleaning before handover; service the air-con units; provide a washer and dryer.", hint: "These are the requests the landlord is agreeing to." },
    ],
  },
  {
    title: "Agency terms",
    note: "Standard protections on an agency LOI. Leave them off if they are not part of your arrangement.",
    fields: [
      { key: "no_parallel_negotiation", label: "Landlord agrees not to negotiate with other tenants meanwhile", type: "checkbox" },
      { key: "landlord_fail_pays_commission", label: "If the landlord walks away, the landlord still pays the agency commission", type: "checkbox" },
      { key: "forfeit_split_agency", label: "If the tenant walks away, a share of the forfeited deposit goes to the agency", type: "checkbox" },
      { key: "forfeit_split_pct", label: "Agency share of the forfeited deposit (%)", type: "number", default: "50", showIf: { key: "forfeit_split_agency", equals: "true" }, hint: "Capped at the total service fee." },
      { key: "commission_clause", label: "State the commission the landlord pays", type: "checkbox" },
      { key: "commission_amount", label: "Commission", type: "money", showIf: { key: "commission_clause", equals: "true" } },
      { key: "commission_gst", label: "Commission stated is GST inclusive", type: "checkbox", default: "true", showIf: { key: "commission_clause", equals: "true" } },
    ],
  },
  {
    title: "You (the salesperson)",
    note: "Pre-filled from your profile. The letter goes out over your name and CEA registration.",
    fields: [
      { key: "agent_name", label: "Salesperson", type: "text", required: true, group: "agent" },
      { key: "agent_cea", label: "CEA registration no.", type: "text", required: true, group: "agent" },
      { key: "agent_designation", label: "Designation", type: "text", placeholder: "Optional", group: "agent" },
      { key: "agency_name", label: "Agency", type: "text", group: "agent" },
      { key: "agent_contact", label: "Contact", type: "text", group: "agent" },
      { key: "agent_represents", label: "You are acting for the", type: "select", options: ["Landlord", "Tenant", "Both parties"], default: "Landlord", group: "agent" },
    ],
  },
];

export const LOI_FIELD_KEYS = fieldKeysOf(LOI_SECTIONS);

export function loiTitle(f: DocFields): string {
  return addressTitle("LOI", f.premises_address, "New letter of intent");
}

// Term as agency letters phrase it: "Twelve (12) months", optionally with the
// odd days that real leases carry.
function termPhrase(f: DocFields): string {
  const months = normTermMonths(f.term_months);
  const days = normInt(f.term_extra_days, 0, 0, 365);
  const monthWords = moneyWords(String(months)).replace(/ Only$/, "");
  const base = `${monthWords} (${months}) months`;
  if (!days) return base;
  const dayWords = moneyWords(String(days)).replace(/ Only$/, "");
  return `${base} and ${dayWords} (${days}) days`;
}

function amountPhrase(v: string | undefined): string {
  const words = moneyWords(v);
  return words ? `Singapore Dollars ${words} (${money(v)})` : money(v);
}

// "1 month's" / "2 months'": the apostrophe moves with the number.
function monthsPossessive(n: number): string {
  return n === 1 ? "1 month's" : `${n} months'`;
}

// Semicolons between clauses, a full stop on the last one.
function punctuate(items: string[]): string[] {
  return items.map((s, i) => {
    const body = s.replace(/[.;]+$/, "");
    return i === items.length - 1 ? `${body}.` : `${body};`;
  });
}

export function loiContent(f: DocFields): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const agency = (f.agency_name || "").trim();

  // The letterhead. Every real agency LOI we studied is issued on one, with the
  // agency and the salesperson's CEA registration at the top, because that is
  // what tells the landlord who is writing to them. Without this block the
  // document is a template; with it, it is the agent's letter.
  const letterhead = [f.agent_name, f.agent_designation].filter(Boolean).join(", ");
  if (agency || letterhead) {
    if (agency) blocks.push({ kind: "para", text: agency.toUpperCase(), gap: 2 });
    if (letterhead) {
      blocks.push({
        kind: "para",
        text: `${letterhead}${f.agent_cea ? ` · CEA Reg. No. ${f.agent_cea}` : ""}${f.agent_contact ? ` · ${f.agent_contact}` : ""}`,
        gap: 4,
      });
    }
    blocks.push({ kind: "rule" });
  }

  blocks.push({ kind: "title", text: "LETTER OF INTENT" });
  blocks.push({ kind: "subtitle", text: "Residential lease. A standard template prepared for your review. This is not legal advice." });

  blocks.push({
    kind: "kv",
    rows: [
      ["Date", fmtDate(f.loi_date)],
      ["To", f.landlord_name || "The Landlord"],
      ...(f.landlord_id ? [["NRIC/FIN/UEN", f.landlord_id] as [string, string]] : []),
      ...(f.landlord_address ? [["Address", f.landlord_address] as [string, string]] : []),
    ],
  });

  // "Subject to contract" cannot be blanket: the deposit and agency paragraphs
  // below are meant to bite. Saying the whole letter is subject to contract
  // would hand both sides an argument that none of it does, including the
  // forfeit and refund mechanics the deposit depends on. So the legend is
  // scoped to the lease terms and the intention is stated explicitly.
  if (truthy(f.subject_to_contract)) {
    blocks.push({ kind: "para", text: "SUBJECT TO CONTRACT (as to the terms of the lease)", gap: 4 });
  }

  blocks.push({
    kind: "para",
    text: `Dear Sir or Madam,`,
    gap: 4,
  });
  blocks.push({
    kind: "para",
    text: `RE: PROPERTY KNOWN AS ${(f.premises_address || "").toUpperCase()}${f.premises_postal ? `, ${f.premises_postal.toUpperCase()}` : ""}`,
    gap: 6,
  });
  blocks.push({
    kind: "para",
    // Who the salesperson acts for changes whose prospect this is. Calling the
    // tenant "our prospective tenant" in a letter written for the landlord
    // reads as acting for both sides, which is not what the agent selected.
    text:
      f.agent_represents === "Tenant"
        ? "We act for the prospective tenant named below, who has expressed the intention to lease the above premises on the following terms and conditions, subject to a tenancy agreement to be signed by the parties."
        : f.agent_represents === "Both parties"
          ? "We act for both parties in this transaction. The prospective tenant named below has expressed the intention to lease the above premises on the following terms and conditions, subject to a tenancy agreement to be signed by the parties."
          : "We write to confirm that a prospective tenant has expressed the intention to lease the above premises on the following terms and conditions, subject to a tenancy agreement to be signed by the parties.",
    gap: 8,
  });

  const occupierList = lines(f.occupiers);
  blocks.push({
    kind: "kv",
    rows: [
      ["Tenant", f.tenant_name || "-"],
      ...(f.tenant_id ? [["NRIC/FIN/Passport", f.tenant_id] as [string, string]] : []),
      ...(f.tenant_address ? [["Address", f.tenant_address] as [string, string]] : []),
      ["Occupier(s)", occupierList.length ? occupierList.join("; ") : f.tenant_name || "-"],
    ],
  });
  blocks.push({ kind: "rule" });

  let n = 0;

  const renew = truthy(f.option_to_renew)
    ? ` The Tenant shall have the option to renew for a further ${normTermMonths(f.renew_months)} months at the prevailing market rent, to be mutually agreed between the Landlord and the Tenant.`
    : "";
  blocks.push({
    kind: "clause",
    n: ++n,
    heading: "Term of lease",
    body: [
      `${termPhrase(f)} commencing on ${fmtDate(f.start_date)} and expiring on ${leaseEndDate(f.start_date, f.term_months, normInt(f.term_extra_days, 0, 0, 365))}.${renew}`,
    ],
  });

  const furnishing = (f.furnishing || "").toLowerCase();
  blocks.push({
    kind: "clause",
    n: ++n,
    heading: "Monthly rent",
    body: [
      `${amountPhrase(f.rent_amount)} per month, payable monthly in advance${
        truthy(f.rent_inclusive) ? ", inclusive of the fixtures, fittings and maintenance fees" : ""
      }${furnishing ? `. The premises are let ${furnishing}` : ""}.`,
    ],
  });

  const depMonths = normInt(f.security_deposit_months, 1, 0, 24);
  const advMonths = normInt(f.advance_rental_months, 1, 0, 24);
  blocks.push({
    kind: "clause",
    n: ++n,
    heading: "Security deposit",
    body: [
      `${monthsPossessive(depMonths)} security deposit of ${amountPhrase(f.security_deposit)}${
        advMonths ? `, together with ${monthsPossessive(advMonths)} advance rental` : ""
      }, payable upon signing of the tenancy agreement${
        // Say plainly that the deposit already handed over counts towards this,
        // or the tenant reads it as owing the full amount twice.
        f.deposit_converts_to === "Part of the first month's advance rental"
          ? ", the advance rental being payable less the good-faith deposit already paid"
          : ", the security deposit being payable less the good-faith deposit already paid"
      }. The security deposit is refundable at the end of the term, less any lawful deductions.`,
    ],
  });

  blocks.push({
    kind: "clause",
    n: ++n,
    heading: "Stamp duty",
    body: [
      `The stamp duty on the tenancy agreement shall be borne by the ${(f.stamp_duty_by || "Tenant").toLowerCase()}, and stamped within the time prescribed by law.`,
    ],
  });

  const utilBy = (f.utilities_by || "Tenant").toLowerCase();
  const chargeItems: string[] = [`the supply of water, electricity and gas shall be borne by the ${utilBy}`];
  if (truthy(f.telecom_by_tenant)) chargeItems.push("telecommunication and internet charges shall be borne by the Tenant");
  if (truthy(f.cable_by_tenant)) chargeItems.push("cable television charges shall be borne by the Tenant");
  if (truthy(f.aircon_servicing)) {
    chargeItems.push(
      `the Tenant shall service the air-conditioning units ${(f.aircon_frequency || "Quarterly").toLowerCase()} at the Tenant's expense and forward the service records to the Landlord`
    );
  }
  blocks.push({
    kind: "clause",
    n: ++n,
    heading: "Utilities and charges",
    body: ["During the term:", { list: punctuate(chargeItems) }],
  });

  blocks.push({
    kind: "clause",
    n: ++n,
    heading: "Minor repairs",
    body: [
      `The Tenant shall bear the cost of minor repairs and replacements up to ${money(f.minor_repair_cap || "150")} per item per incident. Any expenditure in excess of that amount shall be borne by the Landlord.`,
    ],
  });

  if (truthy(f.immigration_clause)) {
    blocks.push({
      kind: "clause",
      n: ++n,
      heading: "Immigration requirements",
      body: [
        "The Tenant shall at all times ensure that all occupants of the premises comply with the applicable laws for entering and remaining in Singapore.",
      ],
    });
  }

  if (truthy(f.diplomatic_clause)) {
    const after = normInt(f.diplomatic_after_months, 12, 1, 120);
    const notice = normInt(f.diplomatic_notice_months, 2, 1, 12);
    blocks.push({
      kind: "clause",
      n: ++n,
      heading: "Diplomatic clause",
      body: [
        // Disjunctive, as the market standard is: a transfer out of Singapore
        // is the paradigm case and a conjunctive trigger would quietly exclude
        // it, making a template sold as standard narrower than standard.
        `After the first ${after} months of the term, if the Tenant is transferred out of Singapore or otherwise ceases to be employed in Singapore, and is required to leave Singapore, the Tenant may terminate the tenancy by giving the Landlord not less than ${notice} month${notice === 1 ? "" : "s"}' written notice, together with reasonable supporting evidence.${
          truthy(f.diplomatic_reimburse)
            ? ` If the tenancy is terminated in this way before the expiry of the term, the Tenant shall reimburse the Landlord the pro-rated commission paid by the Landlord${agency ? ` to ${agency}` : ""}.`
            : ""
        }`,
      ],
    });
  }

  const reqs = lines(f.tenant_requirements);
  if (f.handover === "As is, where is") {
    blocks.push({
      kind: "clause",
      n: ++n,
      heading: "Condition of the premises",
      body: ["The premises shall be taken over by the Tenant on an as is, where is basis."],
    });
  } else if (reqs.length) {
    blocks.push({
      kind: "clause",
      n: ++n,
      heading: "Tenant's requirements",
      body: ["The Landlord agrees to the following, prior to or upon handover:", { list: punctuate(reqs) }],
    });
  }

  blocks.push({ kind: "rule" });

  const converts =
    f.deposit_converts_to === "Part of the first month's advance rental"
      ? "shall be treated as part of the first month's advance rental"
      : "shall form part of the security deposit";
  const payee = (f.deposit_payee || f.landlord_name || "").trim();
  blocks.push({
    kind: "para",
    text: `Enclosed is a good-faith deposit of ${amountPhrase(f.deposit_amount)}${payee ? `, made payable to ${payee}` : ""} by ${(f.deposit_method || "bank transfer").toLowerCase()}${f.deposit_account ? ` (${f.deposit_account})` : ""}. Upon the successful signing of the tenancy agreement, the good-faith deposit ${converts}.`,
    gap: 6,
  });

  const days = normInt(f.ta_deadline_days, 7, 1, 60);
  blocks.push({
    kind: "para",
    text: `The Landlord and the Tenant shall sign a tenancy agreement, on terms to be agreed, within ${days} day${days === 1 ? "" : "s"} from the date of this letter, unless extended by mutual agreement in writing.`,
    gap: 6,
  });

  blocks.push({
    kind: "para",
    text: `If the terms of the tenancy agreement cannot be agreed within that period, the Landlord shall return the good-faith deposit to the Tenant in full, without interest or deduction, and neither party shall have any claim against the other for costs, damages or compensation.`,
    gap: 6,
  });

  blocks.push({
    kind: "para",
    // A clause directing money to "the Agency" names no payee: it is only
    // rendered when the letter actually carries the agency's name.
    text: `If the Landlord declines to sign the tenancy agreement after the terms have been agreed, the Landlord shall refund the good-faith deposit to the Tenant immediately${
      truthy(f.landlord_fail_pays_commission) && agency
        ? `, and shall pay ${agency} the commission payable for services rendered`
        : ""
    }. This letter shall then lapse and neither party shall have any claim against the other.`,
    gap: 6,
  });

  const pct = normInt(f.forfeit_split_pct, 50, 0, 100);
  blocks.push({
    kind: "para",
    text: `If the Tenant declines to sign the tenancy agreement after the terms have been agreed, the Landlord shall be at liberty to lease the premises to another tenant and the good-faith deposit shall be forfeited to the Landlord.${
      truthy(f.forfeit_split_agency) && agency
        ? ` In that event, ${pct}% of the forfeited good-faith deposit shall be paid to ${agency}, provided that amount does not exceed the total service fee.`
        : ""
    }`,
    gap: 6,
  });

  if (truthy(f.no_parallel_negotiation)) {
    blocks.push({
      kind: "para",
      text: "The Landlord agrees not to conduct parallel negotiations with any alternative tenant while the tenancy agreement is being concluded.",
      gap: 6,
    });
  }

  if (truthy(f.commission_clause) && moneyNumber(f.commission_amount) > 0 && agency) {
    blocks.push({
      kind: "para",
      text: `The Landlord shall pay ${agency} a commission of ${money(f.commission_amount)}${
        truthy(f.commission_gst) ? " (inclusive of GST)" : " plus GST"
      } for securing the Tenant.`,
      gap: 6,
    });
  }

  if (truthy(f.subject_to_contract)) {
    blocks.push({
      kind: "para",
      text: "The terms of the lease set out above are subject to and will be superseded by the tenancy agreement, and neither party is bound to the lease until that agreement is signed. The parties do, however, intend the paragraphs dealing with the good-faith deposit and its refund or forfeiture to take effect from the date of this letter.",
      gap: 6,
    });
  }

  blocks.push({
    kind: "para",
    text: "Where the Landlord or the Tenant comprises two or more persons, all covenants and agreements given by them shall be deemed to have been given jointly and severally.",
    gap: 6,
  });

  blocks.push({
    kind: "para",
    text: "Kindly sign and return the duplicate of this letter to acknowledge receipt of this Letter of Intent and the good-faith deposit, and to indicate your agreement to the terms above.",
    gap: 8,
  });

  const represents = (f.agent_represents || "Landlord").replace("Both parties", "Landlord and the Tenant");
  blocks.push({
    kind: "para",
    text: `Yours faithfully,`,
    gap: 4,
  });
  blocks.push({
    kind: "para",
    text: `${f.agent_name || "____________________"}${f.agent_designation ? `, ${f.agent_designation}` : ""}${
      f.agent_cea ? ` (CEA Reg. No. ${f.agent_cea})` : ""
    }${agency ? ` of ${agency}` : ""}, acting for the ${represents}.${f.agent_contact ? ` Contact: ${f.agent_contact}.` : ""}`,
    gap: 8,
  });

  blocks.push({
    kind: "signatures",
    blocks: [
      { role: "Signed by the Tenant", name: f.tenant_name || undefined, sub: "Date: ____________________" },
      { role: "Signed by the Landlord", name: f.landlord_name || undefined, sub: "Date: ____________________" },
      { role: "Witnessed by (Salesperson)", name: f.agent_name || undefined, sub: `${f.agent_cea ? `CEA ${f.agent_cea}` : ""}${agency ? ` · ${agency}` : ""}` },
    ],
  });

  return blocks;
}

// LOI -> tenancy agreement chaining. Only keys that mean the same thing in both
// templates are carried over; anything LOI-specific (deposits in transit, the
// agency's protections, the letter's own deadline) is deliberately dropped.
export const LOI_TO_TENANCY: Record<string, string> = {
  premises_address: "premises_address",
  premises_postal: "premises_postal",
  premises_type: "premises_type",
  furnishing: "furnishing",
  landlord_name: "landlord_name",
  landlord_id: "landlord_id",
  landlord_address: "landlord_address",
  tenant_name: "tenant_name",
  tenant_id: "tenant_id",
  tenant_address: "tenant_address",
  start_date: "start_date",
  term_months: "term_months",
  rent_amount: "rent_amount",
  security_deposit: "security_deposit",
  minor_repair_cap: "minor_repair_cap",
  diplomatic_clause: "diplomatic_clause",
  diplomatic_after_months: "diplomatic_after_months",
  // Carried so the tenancy agreement cannot contradict the letter it came from:
  // an LOI putting stamp duty or utilities on the landlord, or giving three
  // months' notice, must not become a TA that silently says otherwise.
  diplomatic_notice_months: "diplomatic_notice_months",
  stamp_duty_by: "stamp_duty_by",
  utilities_by: "utilities_by",
  option_to_renew: "option_to_renew",
  agent_name: "agent_name",
  agent_cea: "agent_cea",
  agency_name: "agency_name",
  agent_contact: "agent_contact",
  agent_represents: "agent_represents",
};
