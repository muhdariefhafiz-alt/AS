import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "../../lib/admin-auth";
import { supabaseAdmin } from "../../lib/supabase";
import ImpersonateButton from "./ImpersonateButton";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string }> };

type Row = {
  id: number;
  name: string;
  agency_name: string | null;
  claimed_email: string | null;
  subscription_tier: string | null;
};

export default async function ImpersonatePage({ searchParams }: Props) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { q } = await searchParams;
  const query = (q ?? "").trim();
  // Strip characters that have meaning in a PostgREST or() filter so a stray
  // comma or parenthesis in the search box cannot alter the query.
  const safe = query.replace(/[,()*]/g, " ").trim().slice(0, 60);

  let agents: Row[] = [];
  if (safe) {
    const { data } = await supabaseAdmin()
      .from("sg_agents")
      .select("id, name, agency_name, claimed_email, subscription_tier")
      .eq("claimed", true)
      .or(`name.ilike.%${safe}%,claimed_email.ilike.%${safe}%,cea_registration.ilike.%${safe}%`)
      .limit(25);
    agents = (data ?? []) as Row[];
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Impersonate agent</h1>
          <p className="text-xs text-gray-500">
            Open a claimed agent&apos;s dashboard to help them set up. Every session is logged, and the agent&apos;s
            dashboard shows a banner while you are in it.
          </p>
        </div>
        <Link href="/admin" className="text-xs font-semibold text-gray-500 hover:text-gray-900">&larr; Back to admin</Link>
      </div>

      <form method="GET" className="mb-5 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search claimed agents by name, email or CEA number"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
          Search
        </button>
      </form>

      {safe && agents.length === 0 && (
        <p className="text-sm text-gray-500">
          No claimed agents match &quot;{query}&quot;. Only claimed agents can be impersonated.
        </p>
      )}

      <div className="space-y-2">
        {agents.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{a.name}</p>
              <p className="truncate text-xs text-gray-500">
                {a.agency_name ?? "No agency"} &middot; {a.claimed_email} &middot; {a.subscription_tier ?? "free"}
              </p>
            </div>
            <ImpersonateButton agentId={a.id} agentName={a.name} />
          </div>
        ))}
      </div>
    </div>
  );
}
