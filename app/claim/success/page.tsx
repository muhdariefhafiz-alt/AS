import Link from "next/link";

export default function ClaimSuccessPage() {
  return (
    <div className="mx-auto max-w-[600px] px-5 py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <span className="text-3xl text-green-600">&#10003;</span>
      </div>
      <h1 className="mt-6 text-2xl font-extrabold text-gray-900">Profile claimed</h1>
      <p className="mt-3 text-gray-600">
        Your profile is verified. Complete it now to start receiving seller leads.
      </p>
      <div className="mt-8 space-y-3">
        <Link href="/dashboard" className="fc-btn fc-btn--primary fc-btn--block">
          Complete your profile
        </Link>
        <Link
          href="/search"
          className="block text-sm hover:underline"
          style={{ color: "var(--blue)" }}
        >
          Find your profile
        </Link>
      </div>
    </div>
  );
}
