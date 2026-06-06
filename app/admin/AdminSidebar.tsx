import Link from "next/link";

type Tab = { id: string; label: string; hint: string };

export const TABS: Tab[] = [
  { id: "overzicht", label: "Overzicht", hint: "Constellation + alerts" },
  { id: "liquidity", label: "Liquidity", hint: "Supply x demand per district" },
  { id: "funnel", label: "Funnel", hint: "Consumer + agent dropoff" },
  { id: "loops", label: "Loops", hint: "Constellation: funnel + growth loops" },
  { id: "supply", label: "Supply", hint: "Agent-side health" },
  { id: "seo", label: "SEO", hint: "First-party traffic + organic" },
  { id: "invoices", label: "Invoices", hint: "Success-fee collection" },
  { id: "contracts", label: "Contracts", hint: "Signed agent agreements" },
  { id: "ops", label: "Ops", hint: "Queues + crons + audit" },
  { id: "revenue", label: "Revenue", hint: "Premium + pipeline" },
];

export function AdminSidebar({
  active,
  badges,
  email,
}: {
  active: string;
  badges: Record<string, number>;
  email: string;
}) {
  return (
    <aside className="w-full flex-shrink-0 lg:sticky lg:top-5 lg:w-56">
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">FairComparisons</p>
        <h2 className="mt-0.5 text-sm font-bold text-gray-900">Command center</h2>
      </div>
      <nav className="flex flex-col gap-1">
        {TABS.map((t) => {
          const isActive = active === t.id;
          const badge = badges[t.id];
          return (
            <Link
              key={t.id}
              href={`/admin?tab=${t.id}`}
              className={`group rounded-md border px-3 py-2 transition ${
                isActive
                  ? "border-teal-400 bg-teal-50 text-teal-700"
                  : "border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{t.label}</span>
                {badge != null && badge > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      isActive ? "bg-teal-600 text-white" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[10px] text-gray-500">{t.hint}</div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-gray-200 pt-4">
        <div className="mb-3 flex flex-col gap-2">
          <Link
            href="/admin/moderation"
            className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
          >
            <span>Moderation</span>
            {badges.moderation > 0 && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                {badges.moderation}
              </span>
            )}
          </Link>
          <Link
            href="/admin/claims"
            className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
          >
            <span>Claim review</span>
            {badges.claims > 0 && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                {badges.claims}
              </span>
            )}
          </Link>
        </div>
        <form action="/api/admin/logout" method="POST">
          <button
            type="submit"
            className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Sign out
          </button>
        </form>
        <p className="mt-2 truncate px-1 text-[10px] text-gray-400">{email}</p>
      </div>
    </aside>
  );
}
