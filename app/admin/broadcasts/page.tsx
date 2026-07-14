import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "../../lib/admin-auth";
import BroadcastComposer from "./BroadcastComposer";

export const metadata = { title: "Broadcasts - Admin" };

export default async function BroadcastsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="mx-auto min-h-screen max-w-[1200px] bg-gray-50 px-5 py-8 md:px-10">
      <div className="mb-6 flex items-baseline justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Broadcasts</h1>
          <p className="mt-0.5 text-xs text-gray-500">Targeted in-app announcements to an agent cohort.</p>
        </div>
        <Link href="/admin" className="text-xs font-medium text-blue-600">&larr; Back to admin</Link>
      </div>
      <BroadcastComposer />
    </div>
  );
}
