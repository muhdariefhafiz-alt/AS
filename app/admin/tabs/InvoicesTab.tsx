import { createClient } from "@supabase/supabase-js";
import { SectionHeading, StatCard, Pill, EmptyState, MS_DAY } from "../shared";
import { InvoiceRowActions } from "./InvoiceRowActions";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CompletionRow = {
  id: number;
  lead_id: number;
  agent_id: number;
  sale_price: number | null;
  platform_fee_amt: number | null;
  platform_fee_pct: number | null;
  commission_pct_final: number | null;
  fee_status: string;
  verification_status: string;
  invoice_reference: string | null;
  invoice_sent_at: string | null;
  invoice_due_at: string | null;
  completion_date: string | null;
  paid_at: string | null;
  note: string | null;
};

function fmtSgd(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    maximumFractionDigits: 0,
  }).format(n);
}

function verifPill(status: string) {
  switch (status) {
    case "matched":
      return <Pill color="emerald">verified</Pill>;
    case "mismatch":
      return <Pill color="red">mismatch</Pill>;
    case "no_record":
      return <Pill color="amber">no record yet</Pill>;
    default:
      return <Pill color="gray">unverified</Pill>;
  }
}

function daysOutstanding(sentAt: string | null): number | null {
  if (!sentAt) return null;
  return Math.floor((Date.now() - new Date(sentAt).getTime()) / MS_DAY);
}

export async function InvoicesTab() {
  const cutoff90 = new Date(Date.now() - 90 * MS_DAY).toISOString();
  const [openRes, paidRes] = await Promise.all([
    supabase
      .from("sg_lead_completions")
      .select(
        "id, lead_id, agent_id, sale_price, platform_fee_amt, platform_fee_pct, commission_pct_final, fee_status, verification_status, invoice_reference, invoice_sent_at, invoice_due_at, completion_date, paid_at, note"
      )
      .in("fee_status", ["invoiced", "disputed"])
      .order("invoice_sent_at", { ascending: true }),
    supabase
      .from("sg_lead_completions")
      .select("platform_fee_amt, paid_at")
      .eq("fee_status", "paid")
      .gte("paid_at", cutoff90),
  ]);

  const open = (openRes.data ?? []) as CompletionRow[];
  const paid = (paidRes.data ?? []) as { platform_fee_amt: number | null; paid_at: string }[];

  // Enrich with agent names (single batched query).
  const agentIds = [...new Set(open.map((r) => r.agent_id))];
  const agentMap = new Map<number, { name: string; slug: string; cea: string; email: string | null }>();
  if (agentIds.length > 0) {
    const { data: agents } = await supabase
      .from("sg_agents")
      .select("id, name, slug, cea_registration, claimed_email, email")
      .in("id", agentIds);
    for (const a of agents ?? []) {
      agentMap.set(a.id, {
        name: a.name ?? "",
        slug: a.slug ?? "",
        cea: a.cea_registration ?? "",
        email: a.claimed_email ?? a.email ?? null,
      });
    }
  }

  const totalOutstanding = open
    .filter((r) => r.fee_status === "invoiced")
    .reduce((s, r) => s + (r.platform_fee_amt ?? 0), 0);
  const collected90 = paid.reduce((s, r) => s + (r.platform_fee_amt ?? 0), 0);
  const overdueCount = open.filter((r) => {
    const d = daysOutstanding(r.invoice_sent_at);
    return d !== null && d > 14 && r.fee_status === "invoiced";
  }).length;

  return (
    <div className="space-y-6">
      <SectionHeading title="Invoices" hint="Success-fee collection + verification" />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          title="Outstanding (invoiced)"
          value={fmtSgd(totalOutstanding)}
          sub={`${open.filter((r) => r.fee_status === "invoiced").length} open invoices`}
        />
        <StatCard
          title="Collected (90d)"
          value={fmtSgd(collected90)}
          sub={`${paid.length} paid completions`}
        />
        <StatCard
          title="Overdue >14d"
          value={overdueCount}
          danger={overdueCount > 0}
          sub="need follow-up"
        />
      </div>

      {open.length === 0 ? (
        <EmptyState
          title="No open invoices"
          hint="Invoices appear here when an agent logs a completion."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Agent</th>
                <th className="px-3 py-2">Sale</th>
                <th className="px-3 py-2">Fee</th>
                <th className="px-3 py-2">Aged</th>
                <th className="px-3 py-2">Verify</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {open.map((r) => {
                const agent = agentMap.get(r.agent_id);
                const aged = daysOutstanding(r.invoice_sent_at);
                const overdue = aged !== null && aged > 14;
                return (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2 font-mono text-xs text-gray-700">
                      {r.invoice_reference ?? `#${r.id}`}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{agent?.name ?? `#${r.agent_id}`}</div>
                      <div className="text-[11px] text-gray-500">CEA {agent?.cea ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{fmtSgd(r.sale_price)}</td>
                    <td className="px-3 py-2 font-semibold text-gray-900">
                      {fmtSgd(r.platform_fee_amt)}
                      <div className="text-[11px] font-normal text-gray-500">
                        {r.platform_fee_pct ?? 0.25}%
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={overdue ? "font-bold text-red-700" : "text-gray-600"}>
                        {aged !== null ? `${aged}d` : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2">{verifPill(r.verification_status)}</td>
                    <td className="px-3 py-2">
                      {r.fee_status === "disputed" ? (
                        <Pill color="red">disputed</Pill>
                      ) : (
                        <Pill color="amber">invoiced</Pill>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <InvoiceRowActions
                        completionId={r.id}
                        reference={r.invoice_reference ?? `#${r.id}`}
                        feeAmount={r.platform_fee_amt ?? 0}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
