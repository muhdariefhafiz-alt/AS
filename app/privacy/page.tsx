import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - FairComparisons Singapore",
  description:
    "How FairComparisons collects, uses and protects data. PDPA-compliant privacy policy for our Singapore property agent comparison platform.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-12 md:px-10">
      <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-400">
        Last updated: 9 April 2026
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-600">
        {/* ---- 1. WHO WE ARE ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            1. Who operates FairComparisons
          </h2>
          <p className="mt-2">
            FairComparisons (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is
            operated by FairComparisons, a comparison platform
            registered in the Netherlands. We are not registered
            in Singapore but we process personal data of individuals in
            Singapore and therefore comply with Singapore&apos;s Personal Data
            Protection Act 2012 (&quot;PDPA&quot;) as an organisation that
            collects, uses and discloses personal data of individuals in
            Singapore.
          </p>
        </section>

        {/* ---- 2. WHAT DATA WE COLLECT ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            2. What personal data we collect and display
          </h2>
          <p className="mt-2">
            FairComparisons is a comparison platform that aggregates publicly
            available information about CEA-registered property agents and
            agencies in Singapore. We collect and display the following
            categories of personal data:
          </p>

          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="font-semibold text-gray-900">
                a) CEA Public Register data
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Agent name, CEA registration number, agency affiliation, and
                transaction records (property type, town, date, buyer/seller
                role). Source: Council for Estate Agencies public register,
                accessed via the data.gov.sg open data API. This data is made
                publicly available by the Singapore government under the
                Singapore Open Data Licence. Approximately 30,740 agent
                profiles and 1.3 million transaction records.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                <strong>Legal basis:</strong> Publicly available data exception
                under Section 17(2) read with paragraph 1(e) of the Fourth
                Schedule of the PDPA. The CEA publishes this data for the
                express purpose of public transparency in the property
                industry. Our use is consistent with that purpose.
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="font-semibold text-gray-900">
                b) Property transaction data
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                URA private property transactions (approximately 130,000
                records), HDB resale transactions (approximately 208,000
                records), and rental median data (approximately 7,000 records).
                Sources: Urban Redevelopment Authority Data Service API and
                data.gov.sg open government data. This data does not contain
                personal data; it consists of anonymised property transaction
                prices.
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="font-semibold text-gray-900">
                c) Google agency reviews
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Ratings and review texts for property agencies as published on
                Google Maps. These reviews relate to agencies (business
                entities), not to individual agents. Where a reviewer&apos;s
                name appears in a Google review, that name was made publicly
                available by the reviewer themselves.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                <strong>Legal basis:</strong> Publicly available data exception
                (Section 17(2), Fourth Schedule paragraph 1(e) of the PDPA).
                The data is published by reviewers on a public platform and our
                use (displaying reviews to help consumers compare agencies) is
                consistent with the purpose for which reviews are posted.
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="font-semibold text-gray-900">
                d) listing portals active listings
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Publicly listed property advertisements including the listing
                agent&apos;s name, listing price, and property details as
                displayed on listing portals.com.sg.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                <strong>Legal basis:</strong> Publicly available data exception
                (Section 17(2), Fourth Schedule paragraph 1(e) of the PDPA).
                Agents publish listings on listing portals for the purpose of
                attracting buyers and tenants. Displaying this information on a
                comparison platform serves a consistent purpose of helping
                consumers evaluate agents.
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="font-semibold text-gray-900">e) AgentScore</h3>
              <p className="mt-1 text-sm text-gray-500">
                A proprietary composite score (0 to 100) calculated by
                FairComparisons from the publicly available data described above. The
                AgentScore is our original analytical work product and is not
                sourced from any third party.
              </p>
            </div>
          </div>
        </section>

        {/* ---- 3. PURPOSES ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            3. Purposes for collecting and using personal data
          </h2>
          <p className="mt-2">We collect and use personal data to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Display agent profiles and comparison information to help
              consumers choose a property agent
            </li>
            <li>
              Calculate and display the AgentScore for each registered agent
            </li>
            <li>
              Process &quot;Claim your profile&quot; requests from agents who
              wish to verify and manage their profile
            </li>
            <li>
              Provide and manage paid subscription services (Verified Profile)
            </li>
            <li>
              Respond to enquiries, correction requests, and complaints
            </li>
            <li>
              Improve our platform and services
            </li>
          </ul>
        </section>

        {/* ---- 4. CLAIM FLOW ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            4. When agents claim their profile
          </h2>
          <p className="mt-2">
            When a property agent uses our &quot;Claim your profile&quot;
            feature, they voluntarily provide us with their email address and,
            optionally, their phone number. We use this information solely to:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Verify that the person claiming the profile is the registered agent</li>
            <li>Communicate about their profile and our services</li>
            <li>Process and manage a paid Verified Profile subscription, if applicable</li>
          </ul>
          <p className="mt-2">
            By submitting a claim request, you consent to our collection and
            use of your contact details for these purposes. You may withdraw
            consent at any time by emailing us, which will result in the
            removal of your voluntarily provided contact details (but not the
            publicly sourced data on your profile).
          </p>
        </section>

        {/* ---- 5. PAID SUBSCRIPTIONS ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            5. Paid subscriptions (Verified Profile)
          </h2>
          <p className="mt-2">
            Agents may subscribe to a Verified Profile (S$29/month), which
            allows them to add a photo, biography, and contact details to their
            public profile. Payment processing is handled by Stripe. We do not
            store credit card numbers; Stripe processes and stores payment
            information under its own privacy policy. We retain subscription
            records (plan type, start date, billing status) for as long as the
            subscription is active and for a reasonable period afterwards for
            accounting purposes.
          </p>
        </section>

        {/* ---- 6. WEBSITE ANALYTICS ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            6. Website visitors and analytics
          </h2>
          <p className="mt-2">
            When you visit our website, we collect anonymous, aggregated
            analytics data including page views, referrer URLs, and general
            device type (desktop or mobile). We filter out bot traffic. We do
            not use cookies for tracking. We do not use third-party analytics
            services that track individual visitors. We do not collect IP
            addresses or any other data that could identify individual
            visitors.
          </p>
        </section>

        {/* ---- 7. DISCLOSURE ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            7. Who we share personal data with
          </h2>
          <p className="mt-2">
            We do not sell personal data. We may share personal data with:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Stripe</strong> (payment processor), for agents who
              subscribe to a Verified Profile
            </li>
            <li>
              <strong>Vercel</strong> (hosting provider), which processes web
              requests on our behalf
            </li>
            <li>
              <strong>Supabase</strong> (database provider), where agent
              profile data is stored
            </li>
          </ul>
          <p className="mt-2">
            These service providers process data on our behalf and are bound by
            their own data protection obligations. Data may be transferred
            outside Singapore to the extent that these providers operate
            servers in other jurisdictions; such transfers are conducted in
            accordance with Section 26 of the PDPA.
          </p>
        </section>

        {/* ---- 8. RETENTION ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            8. How long we keep personal data
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Publicly sourced agent data</strong> (CEA, Google,
              listing portals): retained and updated for as long as the agent
              holds an active CEA registration. Data for deregistered agents
              may be retained for up to 12 months after deregistration, then
              deleted.
            </li>
            <li>
              <strong>Claim and subscription data</strong>: retained for the
              duration of the agent&apos;s active engagement with our platform,
              plus 7 years for accounting records as required by Dutch law.
            </li>
            <li>
              <strong>Analytics data</strong>: aggregated and anonymous; no
              personal data is retained.
            </li>
          </ul>
        </section>

        {/* ---- 9. YOUR RIGHTS ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            9. Your rights under the PDPA
          </h2>
          <p className="mt-2">
            If you are a property agent whose data appears on FairComparisons, you
            have the following rights:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Access:</strong> You may request to know what personal
              data we hold about you (Section 21 PDPA).
            </li>
            <li>
              <strong>Correction:</strong> You may request correction of any
              error or omission in your personal data (Section 22 PDPA). Since
              most data is sourced from public registers, corrections to source
              data should be made at the source (e.g., CEA, Google); we will
              update our records when the source is updated.
            </li>
            <li>
              <strong>Withdrawal of consent:</strong> Where you have provided
              personal data voluntarily (e.g., through the Claim flow), you may
              withdraw consent for our use of that data. We will then remove
              your voluntarily provided information. Note that withdrawal of
              consent does not apply to publicly available data collected under
              the Fourth Schedule exception.
            </li>
          </ul>
          <p className="mt-2">
            <strong>Profile removal requests:</strong> If you request complete
            removal of your profile, we will remove all voluntarily provided
            data (email, phone, photo, biography). For data sourced from public
            registers (name, CEA number, transaction records), we will evaluate
            your request on a case-by-case basis. Because this data is publicly
            available and our use falls within the Fourth Schedule exception, we
            are not obligated under the PDPA to delete it. However, we will
            consider reasonable requests and may suppress display of your
            profile if there is a compelling reason to do so.
          </p>
          <p className="mt-2">
            We will respond to access and correction requests within 30 days,
            as required by the PDPA.
          </p>
        </section>

        {/* ---- 10. DO NOT CALL ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            10. Do Not Call Registry
          </h2>
          <p className="mt-2">
            FairComparisons does not send marketing messages by phone, SMS, or fax.
            We do not use phone numbers from the CEA register or any other
            source for telemarketing. If an agent provides their phone number
            through the Claim flow, we use it solely for account verification
            and service-related communications, not for marketing. We therefore
            do not check the Do Not Call Registry as we do not engage in the
            types of communications it covers.
          </p>
          <p className="mt-2">
            Should we introduce marketing communications in the future, we will
            obtain proper consent and comply with the Do Not Call provisions in
            Part IX of the PDPA before doing so.
          </p>
        </section>

        {/* ---- 11. CHILDREN ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            11. Children
          </h2>
          <p className="mt-2">
            FairComparisons is not directed at individuals under the age of 18. We do
            not knowingly collect personal data from children.
          </p>
        </section>

        {/* ---- 12. CHANGES ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            12. Changes to this policy
          </h2>
          <p className="mt-2">
            We may update this privacy policy from time to time. The
            &quot;Last updated&quot; date at the top of this page indicates
            when the latest revision was made. We encourage you to review this
            policy periodically.
          </p>
        </section>

        {/* ---- 13. CONTACT ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            13. Contact us
          </h2>
          <p className="mt-2">
            For any questions about this privacy policy, to exercise your data
            protection rights, or to make a complaint:
          </p>
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
            <p className="font-semibold text-gray-900">
              FairComparisons
            </p>
            <p className="text-gray-500">
              Email:{" "}
              <a
                href="mailto:hello@fair-comparisons.com"
                className="text-blue-600 hover:underline"
              >
                hello@fair-comparisons.com
              </a>
            </p>
          </div>
          <p className="mt-3">
            If you are not satisfied with our response, you may contact the
            Personal Data Protection Commission of Singapore (PDPC) at{" "}
            <a
              href="https://www.pdpc.gov.sg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              www.pdpc.gov.sg
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  );
}
