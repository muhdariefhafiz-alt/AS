"use client";

import Link from "next/link";
import { useState } from "react";
import AgentProof from "./AgentProof";
import Timeline from "./Timeline";
import ContactHeader from "./ContactHeader";
import AssignmentForm from "./AssignmentForm";

type Lead = {
  id: number;
  token: string;
  status: string;
  property_type: string;
  town: string | null;
  district_code: string | null;
  bedrooms: number | null;
  est_value_low: number | null;
  est_value_high: number | null;
  timeline: string | null;
  reason: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  created_at: string | null;
  contact_id: number | null;
};

type Shortlist = {
  id: number;
  status: string;
  invited_at: string | null;
  quoted_at: string | null;
  picked_at: string | null;
  first_reply_at: string | null;
};

type Contact = {
  id: number;
  phone_norm: string | null;
  email_norm: string | null;
  whatsapp_norm: string | null;
  full_name: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
};

type Agent = {
  id: number;
  cea_registration: string;
  slug: string | null;
  name: string | null;
  agency: string | null;
  agentscore: number;
};

type TimelineEvent = {
  id: number;
  event_type: string;
  meta: Record<string, unknown> | null;
  created_at: string | null;
};

type Props = {
  shortlist: Shortlist;
  lead: Lead;
  contact: Contact | null;
  timeline: TimelineEvent[];
  agent: Agent;
};

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  HDB: "HDB",
  CONDO: "Condo",
  EC: "EC",
  LANDED: "Landed",
};

const TIMELINE_LABEL: Record<string, string> = {
  asap: "ASAP",
  "1_3m": "1–3 months",
  "3_6m": "3–6 months",
  "6_12m": "6–12 months",
  exploring: "Exploring",
};

function ageHours(from: string | null): number | null {
  if (!from) return null;
  const ms = Date.now() - new Date(from).getTime();
  return ms / (1000 * 60 * 60);
}

function slaOf(ageHours: number | null): "fresh" | "aging" | "overdue" | null {
  if (ageHours === null) return null;
  if (ageHours >= 24) return "overdue";
  if (ageHours >= 4) return "aging";
  return "fresh";
}

function slaLabel(sla: "fresh" | "aging" | "overdue" | null, ageHours: number | null): string {
  if (sla === "overdue") return `Overdue ${ageHours !== null ? formatAge(ageHours) : ""}`;
  if (sla === "aging") return `Aging ${ageHours !== null ? formatAge(ageHours) : ""}`;
  return "New";
}

function formatAge(hours: number): string {
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}

function slaClass(sla: "fresh" | "aging" | "overdue" | null): string {
  if (sla === "overdue") return "bg-red-100 text-red-700";
  if (sla === "aging") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-700";
}

export default function ContactDetail(props: Props) {
  const { shortlist, lead, contact, timeline, agent } = props;
  const [showAssignment, setShowAssignment] = useState(false);

  const age = ageHours(shortlist.invited_at);
  const sla = slaOf(age);
  const needsReply = shortlist.status === "invited" && !shortlist.first_reply_at;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
            ← Back to Inbox
          </Link>
          <button
            onClick={() => setShowAssignment(true)}
            className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          >
            Assign
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Contact Header */}
        <ContactHeader
          lead={lead}
          shortlist={shortlist}
          sla={sla}
          ageHours={age}
          needsReply={needsReply}
          slaLabel={slaLabel(sla, age)}
          slaClass={slaClass(sla)}
        />

        {/* Agent Proof */}
        <AgentProof agent={agent} lead={lead} />

        {/* Timeline */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Timeline
          </h2>
          <Timeline events={timeline} />
        </div>

        {/* Score Impact (placeholder for Phase 2) */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Your score impact
          </h3>
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <span className="font-medium">+0.5 points</span> (fast reply within SLA) ✓
            </div>
            <div>
              <span className="font-medium">+1.0 points</span> (contact completed){" "}
              {shortlist.status === "picked" ? " ✓" : " [pending outcome]"}
            </div>
            <div className="pt-2 text-xs text-gray-600 dark:text-gray-400">
              Responsiveness: <span className="font-semibold">0.95</span> (95th percentile,{" "}
              {lead.town} solo agents)
            </div>
          </div>
        </div>
      </main>

      {/* Assignment Modal */}
      {showAssignment && (
        <AssignmentForm
          shortlistId={shortlist.id}
          sellerName={lead.full_name}
          onClose={() => setShowAssignment(false)}
        />
      )}
    </div>
  );
}
