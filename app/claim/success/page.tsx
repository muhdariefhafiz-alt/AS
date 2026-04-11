import Link from "next/link";

export default function ClaimSuccessPage() {
  return (
    <div className="mx-auto max-w-[600px] px-5 py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <span className="text-3xl text-green-600">&#10003;</span>
      </div>
      <h1 className="mt-6 text-2xl font-extrabold text-gray-900">Profile Verified</h1>
      <p className="mt-3 text-gray-600">
        Your FairComparisons profile has been claimed and verified. You now have access to your
        performance data and can manage your profile.
      </p>
      <div className="mt-8 space-y-3">
        <Link
          href="/"
          className="block rounded-lg bg-teal-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-teal-700"
        >
          Go to homepage
        </Link>
      </div>
    </div>
  );
}
