import { titleName, cleanAgency } from "../names";
import { docTypeByKey } from "./index";
import type { DocFields } from "./schema";

// Build the initial field values for a new document.
//
// Two sources, in order:
// 1. Every schema `default` declared on the doc type. Seeding these matters:
//    the form shows a default the moment it renders, so if the stored fields
//    did not carry it, a toggle the agent never touched would read ON in the UI
//    and be MISSING from the PDF. Seeding keeps the form and the document
//    telling the same story.
// 2. The agent block, from their own profile. This is the part no
//    no-account tool can do: the LOI goes out on the salesperson's name and CEA
//    registration, so a generator that does not know who the agent is cannot
//    produce a usable letter.
//
// Property, parties and commercial terms are typed once, on the first document
// of a deal, and carried across by the chain (see LOI_TO_TENANCY).

type AgentRow = {
  name: string | null;
  marketing_name: string | null;
  marketing_name_status: string | null;
  cea_registration: string | null;
  agency_name: string | null;
  whatsapp: string | null;
  claimed_email: string | null;
};

// Today in Singapore, as YYYY-MM-DD for a date input.
export function todaySg(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}

function schemaDefaults(docType: string): DocFields {
  const dt = docTypeByKey(docType);
  const out: DocFields = {};
  for (const section of dt?.sections ?? []) {
    for (const f of section.fields) {
      if (f.default !== undefined) out[f.key] = f.default;
    }
  }
  return out;
}

// The identity a document is ISSUED UNDER. These are pinned from the agent's
// own profile on every write and can never be supplied by the caller: a
// document carrying someone else's name and CEA registration is a forgery, and
// the only thing standing between the tool and one is this list.
export const LETTERHEAD_KEYS = ["agent_name", "agent_cea", "agency_name"] as const;

export function agentBlock(agent: AgentRow): DocFields {
  const agentName =
    agent.marketing_name_status === "approved" && agent.marketing_name
      ? agent.marketing_name.trim()
      : titleName(agent.name ?? "");

  return {
    agent_name: agentName,
    agent_cea: agent.cea_registration ?? "",
    agency_name: agent.agency_name ? cleanAgency(agent.agency_name) : "",
    agent_contact: agent.whatsapp || agent.claimed_email || "",
    agent_represents: "Landlord",
  };
}

// Just the pinned identity, for re-applying after any merge.
export function pinnedLetterhead(agent: AgentRow): DocFields {
  const block = agentBlock(agent);
  return Object.fromEntries(LETTERHEAD_KEYS.map((k) => [k, block[k] ?? ""]));
}

export function buildPrefill(agent: AgentRow, docType: string): DocFields {
  const fields: DocFields = { ...schemaDefaults(docType), ...agentBlock(agent) };
  // A letter is dated the day it is written.
  if (docType === "loi") fields.loi_date = todaySg();
  return fields;
}
