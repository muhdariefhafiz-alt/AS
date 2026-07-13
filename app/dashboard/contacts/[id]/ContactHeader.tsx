"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Lead = {
  id: number;
  property_type: string;
  town: string | null;
  district_code: string | null;
  bedrooms: number | null;
  est_value_low: number | null;
  est_value_high: number | null;
  timeline: string | null;
  full_name: string | null;
};

type Shortlist = {
  id: number;
  status: string;
  invited_at: string | null;
  first_reply_at: string | null;
};

type Props = {
  lead: Lead;
  shortlist: Shortlist;
  sla: "fresh" | "aging" | "overdue" | null;
  ageHours: number | null;
  needsReply: boolean;
  slaLabel: string;
  slaClass: string;
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

export default function ContactHeader(props: Props) {
  const { lead, shortlist, slaLabel, slaClass, needsReply } = props;
  const router = useRouter();
  const [marking, setMarking] = useState(false);

  const propType = PROPERTY_TYPE_LABEL[lead.property_type] || lead.property_type;
  const askingLow = lead.est_value_low ? `S$${(lead.est_value_low / 1000).toFixed(0)}k` : null;
  const askingHigh = lead.est_value_high ? `S$${(lead.est_value_high / 1000).toFixed(0)}k` : null;
  const askingRange =
    askingLow && askingHigh ? `${askingLow}–${askingHigh}` : askingLow || askingHigh || "—";
  const timeline = TIMELINE_LABEL[lead.timeline || ""] || lead.timeline || "—";

  async function markReplied() {
    setMarking(true);
    try {
      const res = await fetch("/api/dashboard/leads/reply-sent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlist_id: shortlist.id }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {lead.full_name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {propType} in {lead.town || "—"}
          </p>
        </div>
        <div className={`px-3 py-2 rounded-full text-sm font-medium ${slaClass}`}>
          {slaLabel}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            Asking
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {askingRange}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            Timeline
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{timeline}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            Bedrooms
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {lead.bedrooms || "—"}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            Status
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
            {shortlist.status}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {needsReply && (
          <button
            onClick={markReplied}
            disabled={marking}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium disabled:opacity-50"
          >
            {marking ? "Marking..." : "Mark as replied"}
          </button>
        )}
        {shortlist.first_reply_at && (
          <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
            ✓ Replied {new Date(shortlist.first_reply_at).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
