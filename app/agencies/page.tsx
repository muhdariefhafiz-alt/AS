"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";

type Agency = {
  id: number;
  name: string;
  slug: string;
  agent_count: number;
  google_rating: number | null;
  google_review_count: number;
  license_number: string;
  score: number | null;
};

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"agents" | "rating" | "name">("agents");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("sg_agencies")
        .select("id, name, slug, agent_count, google_rating, google_review_count, license_number, score")
        .order("agent_count", { ascending: false })
        .limit(1000);
      setAgencies(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = agencies;
    if (query.length >= 2) {
      const q = query.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) || a.license_number.toLowerCase().includes(q)
      );
    }
    if (sort === "rating") {
      result = [...result].sort((a, b) => (b.google_rating ?? 0) - (a.google_rating ?? 0));
    } else if (sort === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [agencies, query, sort]);

  return (
    <>
      <nav className="border-b border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-[1280px] px-5 py-2.5 text-xs text-gray-400 md:px-10">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-600">Agencies</span>
        </div>
      </nav>

      <div className="mx-auto max-w-[1280px] px-5 py-10 md:px-10">
        <h1 className="text-3xl font-bold text-gray-900">Property Agencies in Singapore</h1>
        <p className="mt-2 text-gray-500">
          {agencies.length} CEA-licensed agencies. Search by name or CEA license number.
        </p>

        {/* Search + Sort */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agency name or license..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none"
          >
            <option value="agents">Most agents</option>
            <option value="rating">Highest rated</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>

        {/* Results */}
        {loading ? (
          <div className="mt-10 text-center text-gray-400">Loading agencies...</div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, 60).map((a) => (
              <Link
                key={a.slug}
                href={`/agency/${a.slug}`}
                className="group rounded-lg border border-gray-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900 group-hover:text-emerald-600">
                      {a.name}
                    </h2>
                    <div className="mt-1 text-xs text-gray-400">CEA {a.license_number}</div>
                  </div>
                  {a.score && (
                    <div className="rounded bg-emerald-50 px-2 py-1 text-sm font-bold text-emerald-700">
                      {Math.round(Number(a.score))}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span>{a.agent_count.toLocaleString()} agents</span>
                  {a.google_rating && (
                    <span className="text-amber-500">{"\u2605"} {Number(a.google_rating).toFixed(1)} ({a.google_review_count})</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
        {filtered.length > 60 && (
          <p className="mt-6 text-center text-sm text-gray-400">
            Showing 60 of {filtered.length} agencies. Use the search to narrow results.
          </p>
        )}
      </div>
    </>
  );
}
