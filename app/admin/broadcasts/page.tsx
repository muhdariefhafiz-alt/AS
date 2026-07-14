import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "../../lib/admin-auth";
import ReachTabs from "./ReachTabs";

export const metadata = { title: "Reach agents - Admin" };

export default async function BroadcastsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="mx-auto min-h-screen max-w-[1200px] bg-gray-50 px-5 py-8 md:px-10">
      <div className="mb-6 flex items-baseline justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reach agents</h1>
          <p className="mt-0.5 text-xs text-gray-500">Inform an agent cohort of new info or features, in-app or by email.</p>
        </div>
        <Link href="/admin" className="text-xs font-medium text-blue-600">&larr; Back to admin</Link>
      </div>
      <ReachTabs />
    </div>
  );
}
