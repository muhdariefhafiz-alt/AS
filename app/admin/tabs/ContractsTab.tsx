import { createClient } from "@supabase/supabase-js";
import { SectionHeading, StatCard, Pill, EmptyState } from "../shared";
import { AGENT_TERMS_VERSION } from "../../lib/agent-terms";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AgreementRow = {
  id: number;
  agent_id: number | null;
  cea_registration: string | null;
  terms_version: string;
  fee_pct: number | null;
  signatory_name: string | null;
  signatory_email: string | null;
  accepted_at: string;
  source: string | null;
};

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}

export async function ContractsTab() {
  const [rowsRes, totalRes, claimRes, currentRes] = await Promise.all([
    supabase
      .from("sg_agent_agreements")
      .select("id, agent_id, cea_registration, terms_version, fee_pct, signatory_name, signatory_email, accepted_at, source")
      .order("accepted_at", { ascending: false })
      .limit(200),
    supabase.from("sg_agent_agreements").select("id", { count: "exact", head: true }),
    supabase.from("sg_agent_agreements").select("id", { count: "exact", head: true }).eq("source", "claim"),
    supabase.from("sg_agent_agreements").select("id", { count: "exact", head: true }).eq("terms_version", AGENT_TERMS_VERSION),
  ]);

  const rows = (rowsRes.data ?? []) as AgreementRow[];
  const total = totalRes.count ?? 0;
  const viaClaim = claimRes.count ?? 0;
  const onCurrent = currentRes.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Signed agreements" value={total.toLocaleString()} sub="Total signings on file" />
        <StatCard title="On current version" value={onCurrent.toLocaleString()} sub={`Version ${AGENT_TERMS_VERSION}`} />
        <StatCard title="Signed at claim" value={viaClaim.toLocaleString()} sub="Auto-recorded when claiming a profile" />
      </div>

      <div>
        <SectionHeading title="Signed agent agreements" hint="Blanket success-fee contracts. Each row is one signing, stored with timestamp + IP for audit." />
        {rows.length === 0 ? (
          <EmptyState title="No agreements signed yet." hint="They appear here as agents claim profiles or sign the agreement page." />
        ) : (
          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
                  <th className="px-4 py-2.5 text-left">Signatory</th>
                  <th className="px-4 py-2.5 text-left">CEA</th>
                  <th className="px-4 py-2.5 text-left">Version</th>
                  <th className="px-4 py-2.5 text-right">Fee</th>
                  <th className="px-4 py-2.5 text-left">Source</th>
                  <th className="px-4 py-2.5 text-right">Signed</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">{r.signatory_name ?? "—"}</div>
                      <div className="text-[11px] text-gray-400">{r.signatory_email ?? ""}</div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{r.cea_registration ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      {r.terms_version === AGENT_TERMS_VERSION
                        ? <Pill color="emerald">{r.terms_version}</Pill>
                        : <Pill color="amber">{r.terms_version}</Pill>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{r.fee_pct != null ? `${r.fee_pct}%` : "—"}</td>
                    <td className="px-4 py-2.5">
                      <Pill color={r.source === "claim" ? "gray" : "emerald"}>{r.source ?? "—"}</Pill>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{fmtDate(r.accepted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
