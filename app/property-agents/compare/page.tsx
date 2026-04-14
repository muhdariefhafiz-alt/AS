"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

type Agent = {
  id: number;
  name: string;
  slug: string;
  cea_registration: string;
  agency_name: string;
  score: number | null;
  score_breakdown: Record<string, number> | null;
  transaction_count: number;
  specialization: string | null;
  primary_area: string | null;
  google_rating: number | null;
};

const DIMS = [
  { key: "volume", label: "Volume", max: 30 },
  { key: "recency", label: "Recency", max: 25 },
  { key: "diversity", label: "Diversity", max: 15 },
  { key: "experience", label: "Experience", max: 15 },
];

export default function ComparePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<Agent[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("sg_agents")
        .select("id, name, slug, cea_registration, agency_name, score, score_breakdown, transaction_count, specialization, primary_area, google_rating")
        .ilike("name", `%${query}%`)
        .not("score", "is", null)
        .order("score", { ascending: false })
        .limit(8);
      setResults(data ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function addAgent(a: Agent) {
    if (selected.length >= 3) return;
    if (selected.find((s) => s.id === a.id)) return;
    setSelected([...selected, a]);
    setQuery("");
    setResults([]);
  }

  function removeAgent(id: number) {
    setSelected(selected.filter((s) => s.id !== id));
  }

  return (
    <>
      <nav className="border-b border-gray-100">
        <div className="mx-auto max-w-[1120px] px-5 py-2.5 text-xs text-gray-400 md:px-8">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">Compare Agents</span>
        </div>
      </nav>

      <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Compare Property Agents</h1>
        <p className="mt-2 text-gray-500">Select up to 3 agents to compare side by side on AgentScore, transactions, specialization, and area expertise.</p>

        {/* Search */}
        {selected.length < 3 && (
          <div className="relative mt-6">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search agent by name..."
              className="w-full rounded-xl border border-gray-200 px-5 py-4 text-[15px] shadow-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
            {results.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg">
                {results.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => addAgent(a)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-teal-50 first:rounded-t-xl last:rounded-b-xl"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                      {a.score ? Math.round(Number(a.score)) : "--"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{a.name}</p>
                      <p className="text-xs text-gray-500">{a.agency_name} · {a.transaction_count} transactions</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searching && <p className="mt-2 text-xs text-gray-400">Searching...</p>}
          </div>
        )}

        {/* Selected agents pills */}
        {selected.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selected.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm">
                <span className="font-medium text-teal-700">{a.name}</span>
                <button onClick={() => removeAgent(a.id)} className="text-teal-400 hover:text-teal-600">&times;</button>
              </span>
            ))}
            {selected.length < 3 && <span className="text-xs text-gray-400 self-center">Add up to {3 - selected.length} more</span>}
          </div>
        )}

        {/* Comparison table */}
        {selected.length >= 2 && (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Metric</th>
                  {selected.map((a) => (
                    <th key={a.id} className="pb-3 px-4 text-center">
                      <Link href={`/property-agents/agent/${a.slug}`} className="text-teal-600 hover:underline font-semibold text-sm">{a.name}</Link>
                      <p className="text-xs text-gray-400 font-normal mt-0.5">{a.agency_name}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* AgentScore */}
                <tr>
                  <td className="py-4 pr-4 font-medium text-gray-900">AgentScore</td>
                  {selected.map((a) => {
                    const best = Math.max(...selected.map((s) => Number(s.score ?? 0)));
                    const isBest = Number(a.score) === best;
                    return (
                      <td key={a.id} className="py-4 px-4 text-center">
                        <span className={`text-2xl font-extrabold ${isBest ? "text-teal-600" : "text-gray-400"}`}>
                          {a.score ? Math.round(Number(a.score)) : "--"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                {/* Score dimensions */}
                {DIMS.map((dim) => (
                  <tr key={dim.key}>
                    <td className="py-3 pr-4 text-gray-600">{dim.label} <span className="text-gray-400">/{dim.max}</span></td>
                    {selected.map((a) => {
                      const val = Number(a.score_breakdown?.[dim.key] ?? 0);
                      const pct = Math.round((val / dim.max) * 100);
                      const best = Math.max(...selected.map((s) => Number(s.score_breakdown?.[dim.key] ?? 0)));
                      const isBest = val === best && val > 0;
                      return (
                        <td key={a.id} className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-gray-100">
                              <div className={`h-1.5 rounded-full ${isBest ? "bg-teal-500" : "bg-gray-300"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`text-xs font-medium ${isBest ? "text-teal-600" : "text-gray-500"}`}>{val}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Transactions */}
                <tr>
                  <td className="py-3 pr-4 font-medium text-gray-900">Transactions</td>
                  {selected.map((a) => {
                    const best = Math.max(...selected.map((s) => s.transaction_count ?? 0));
                    const isBest = a.transaction_count === best;
                    return (
                      <td key={a.id} className={`py-3 px-4 text-center font-medium ${isBest ? "text-teal-600" : "text-gray-600"}`}>
                        {a.transaction_count?.toLocaleString() ?? 0}
                      </td>
                    );
                  })}
                </tr>
                {/* Specialization */}
                <tr>
                  <td className="py-3 pr-4 text-gray-600">Specialization</td>
                  {selected.map((a) => (
                    <td key={a.id} className="py-3 px-4 text-center text-xs text-gray-600">
                      {a.specialization?.replace("_", " ").replace("CONDOMINIUM APARTMENTS", "Condo").replace("LANDED PROPERTIES", "Landed") ?? "N/A"}
                    </td>
                  ))}
                </tr>
                {/* Primary Area */}
                <tr>
                  <td className="py-3 pr-4 text-gray-600">Primary Area</td>
                  {selected.map((a) => (
                    <td key={a.id} className="py-3 px-4 text-center text-xs text-gray-600">
                      {a.primary_area ?? "N/A"}
                    </td>
                  ))}
                </tr>
                {/* Agency */}
                <tr>
                  <td className="py-3 pr-4 text-gray-600">Agency</td>
                  {selected.map((a) => (
                    <td key={a.id} className="py-3 px-4 text-center text-xs text-gray-600">
                      {a.agency_name}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state */}
        {selected.length === 0 && (
          <div className="mt-12 text-center">
            <p className="text-gray-500">Search and select 2-3 agents to compare them side by side.</p>
            <p className="mt-2 text-sm text-gray-400">Only agents with an AgentScore (based on CEA transaction data) can be compared.</p>
          </div>
        )}
      </div>
    </>
  );
}
