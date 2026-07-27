import { titleName, cleanAgency } from "../names";
import type { DocFields } from "./tenancy";

// Build the initial field values for a new document.
//
// Honest scope for Phase 1: only the AGENT block pre-fills (the agent's own
// profile) plus sensible defaults for the standard clauses. Our structured
// property data lives on sg_leads, which is the SELLER/valuation funnel and is
// the wrong object to hydrate a rental tenancy; sg_viewings carries only a
// free-text label. So property, parties and commercial terms are typed in v1.
// Cross-document reuse (LOI -> TA chaining) is the follow-up that makes "typed
// once, reused" true; it is not claimed here.

type AgentRow = {
  name: string | null;
  marketing_name: string | null;
  marketing_name_status: string | null;
  cea_registration: string | null;
  agency_name: string | null;
  whatsapp: string | null;
  claimed_email: string | null;
};

export function buildPrefill(agent: AgentRow): DocFields {
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
    // sensible defaults for the standard clauses (agent can change any of them)
    term_months: "12",
    rent_payment_day: "the 1st day of each calendar month",
    minor_repair_cap: "150",
  };
}
