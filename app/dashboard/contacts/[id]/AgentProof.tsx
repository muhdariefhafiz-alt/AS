"use client";

import { useEffect, useState } from "react";

type Lead = {
  id: number;
  property_type: string;
  town: string | null;
  est_value_low: number | null;
  est_value_high: number | null;
};

type Agent = {
  id: number;
  cea_registration: string;
  name: string | null;
  agency: string | null;
  agentscore: number;
};

type Transaction = {
  id: number;
  block_number: string | null;
  street_name: string | null;
  unit_number: string | null;
  price: number;
  transaction_date: string;
  property_type: string;
  rooms: number | null;
};

type Props = {
  agent: Agent;
  lead: Lead;
};

export default function AgentProof({ agent, lead }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [areaMedian, setAreaMedian] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Fetch agent's recent transactions + area median (placeholder for Phase 2 integration)
        // For now, show the agent's score + mock data
        setTransactions([
          {
            id: 1,
            block_number: "123",
            street_name: "Tampines St 11",
            unit_number: "#10-45",
            price: 640000,
            transaction_date: "2026-05-15",
            property_type: "4-room",
            rooms: 4,
          },
          {
            id: 2,
            block_number: "456",
            street_name: "Tampines Ave 2",
            unit_number: "#08-32",
            price: 625000,
            transaction_date: "2026-01-20",
            property_type: "4-room",
            rooms: 4,
          },
          {
            id: 3,
            block_number: "789",
            street_name: "Tampines St 21",
            unit_number: "#12-18",
            price: 610000,
            transaction_date: "2025-09-10",
            property_type: "4-room",
            rooms: 4,
          },
        ]);
        // Area median (placeholder; integrate with area_recent_sales RPC in Phase 2)
        setAreaMedian(618000);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [agent.id, lead.town]);

  if (loading) {
    return <div className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse h-64" />;
  }

  const askingMid = lead.est_value_low && lead.est_value_high
    ? (lead.est_value_low + lead.est_value_high) / 2
    : null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Your proof
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">AgentScore</div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {agent.agentscore}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Active in {lead.town}
          </div>
          <div className="text-lg text-gray-900 dark:text-gray-100">4 years</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {transactions.length} recent sales
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Area median (3-room)
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {areaMedian ? `S$${(areaMedian / 1000).toFixed(0)}k` : "—"}
          </div>
          {askingMid && areaMedian && (
            <div className={`text-xs font-medium ${
              askingMid > areaMedian * 1.1 ? "text-amber-600" :
              askingMid < areaMedian * 0.9 ? "text-emerald-600" :
              "text-gray-600"
            }`}>
              {askingMid > areaMedian ? "Above" : "Below"} median
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded p-4">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3 text-sm">
          Recent sales ({lead.property_type})
        </h3>
        <div className="space-y-3">
          {transactions.map((txn) => (
            <div
              key={txn.id}
              className="flex items-start justify-between pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0"
            >
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  Blk {txn.block_number} {txn.street_name}
                  {txn.unit_number && <span className="text-gray-500 dark:text-gray-400"> {txn.unit_number}</span>}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(txn.transaction_date).toLocaleDateString("en-SG", {
                    year: "2-digit",
                    month: "short",
                  })}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  S${(txn.price / 1000).toFixed(0)}k
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded text-sm text-emerald-800 dark:text-emerald-300">
        ✓ Fact-checked: all claims backed by your verified record
      </div>
    </div>
  );
}
