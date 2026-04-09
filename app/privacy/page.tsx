import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "AgentScan privacy policy. How we handle your data.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-12 md:px-10">
      <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-400">Last updated: April 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-600">
        <section>
          <h2 className="text-lg font-bold text-gray-900">What data we collect</h2>
          <p className="mt-2">
            AgentScan collects and displays publicly available information about property agents
            and agencies in Singapore, including CEA registration data, Google reviews, and
            publicly listed contact information.
          </p>
          <p className="mt-2">
            When you visit our website, we collect anonymous usage data including page views,
            referrer information, and general device type. We do not use cookies for tracking.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900">Data sources</h2>
          <p className="mt-2">
            All agent and agency data on AgentScan is sourced from public records:
            the CEA Public Register, Google Maps, PropertyGuru, and other publicly
            accessible platforms. We do not collect private or personal data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900">Your rights</h2>
          <p className="mt-2">
            If you are a property agent or agency and wish to update or correct your
            information, please contact us at info@agentscan.sg.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900">Contact</h2>
          <p className="mt-2">
            AgentScan is operated by Fair Comparisons Netherlands (KvK 42031267).
            For privacy inquiries: info@agentscan.sg.
          </p>
        </section>
      </div>
    </article>
  );
}
