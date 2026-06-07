import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - FairComparisons Singapore",
  description:
    "Terms of Service for FairComparisons, the independent property agent comparison platform for Singapore.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-12 md:px-10">
      <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-gray-400">
        Last updated: 9 April 2026
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-600">
        {/* ---- 1. ABOUT ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            1. About FairComparisons
          </h2>
          <p className="mt-2">
            FairComparisons (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;, the
            &quot;Platform&quot;) is an independent property agent comparison
            platform for the Singapore market, operated by Fair Comparisons
            Netherlands. By accessing or using FairComparisons at
            fair-comparisons.com or any successor domain, you agree to these
            Terms of Service. If you do not agree, please do not use the
            Platform.
          </p>
        </section>

        {/* ---- 2. WHAT WE PROVIDE ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            2. What we provide
          </h2>
          <p className="mt-2">
            FairComparisons aggregates publicly available data about CEA-registered
            property agents in Singapore and presents it in a structured,
            comparable format. This includes agent profiles, transaction
            histories, agency reviews, active listings, and a proprietary
            composite score (the &quot;AgentScore&quot;).
          </p>
          <p className="mt-2">
            FairComparisons is an information service. We do not provide property
            agency services, financial advice, legal advice, or property
            valuations. We do not act as an intermediary between consumers and
            agents.
          </p>
        </section>

        {/* ---- 3. DATA ACCURACY ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            3. Data accuracy and limitations
          </h2>
          <p className="mt-2">
            We make reasonable efforts to keep the data on FairComparisons accurate
            and up to date. However:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Data is sourced from third-party public sources (CEA, Google,
              listing portals, URA, HDB) and may contain errors, omissions, or
              delays in those sources that are beyond our control.
            </li>
            <li>
              Transaction data, reviews, and listings reflect a snapshot in
              time and may not reflect the most current information.
            </li>
            <li>
              The AgentScore is a proprietary calculation based on publicly
              available data. It is our editorial and analytical opinion, not a
              certification, endorsement, or guarantee of any agent&apos;s
              competence or suitability.
            </li>
            <li>
              We do not guarantee that any agent profile is complete, accurate,
              or current. Users should independently verify information before
              making decisions.
            </li>
          </ul>
          <p className="mt-2">
            <strong>
              You should not rely solely on FairComparisons when choosing a property
              agent.
            </strong>{" "}
            We recommend speaking with multiple agents, checking references,
            and verifying credentials directly with the CEA before engaging any
            agent.
          </p>
        </section>

        {/* ---- 4. AGENTSCORE ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            4. The AgentScore
          </h2>
          <p className="mt-2">
            The AgentScore is a proprietary composite metric calculated
            entirely from publicly available data. It reflects our independent
            analytical assessment and constitutes our protected editorial
            opinion. Key points:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              The score cannot be influenced by payment. Subscribing to a
              Verified Profile does not affect the AgentScore in any way.
            </li>
            <li>
              The methodology, weighting, and formula are proprietary and may
              change at any time without notice.
            </li>
            <li>
              We reserve the right to modify, recalculate, or remove any
              AgentScore at our discretion.
            </li>
            <li>
              The score is not a ranking, rating, or recommendation. It is one
              data point among many that consumers may consider.
            </li>
          </ul>
        </section>

        {/* ---- 5. AGENT PROFILES AND CLAIMS ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            5. Agent profiles and the Claim process
          </h2>
          <p className="mt-2">
            FairComparisons creates profiles for CEA-registered agents using publicly
            available data. Agents do not need to opt in or consent to the
            creation of a profile based on public data.
          </p>
          <p className="mt-2">
            Agents may &quot;claim&quot; their profile to verify their identity
            and add optional information such as a photo, biography, and
            contact details. By claiming your profile, you:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Confirm that you are the CEA-registered agent associated with
              that profile
            </li>
            <li>
              Consent to the collection and use of the contact details you
              provide (see our{" "}
              <a href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
              )
            </li>
            <li>
              Acknowledge that your publicly sourced data (name, CEA number,
              transactions) will remain visible regardless of whether you claim
              your profile
            </li>
          </ul>
          <p className="mt-2">
            We reserve the right to approve or reject claim requests at our
            discretion. Claiming a profile does not grant you any ownership
            rights over the profile page or its content.
          </p>
        </section>

        {/* ---- 6. VERIFIED PROFILE SUBSCRIPTION ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            6. Verified Profile subscription
          </h2>
          <p className="mt-2">
            Agents may subscribe to a Verified Profile for S$29 per month
            (inclusive of GST, if applicable). The Verified Profile includes:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>A verified badge on your profile</li>
            <li>Ability to add a professional photo and biography</li>
            <li>Display of your contact details on your profile</li>
            <li>Profile analytics, review tools and area market data</li>
          </ul>
          <p className="mt-2">Subscription terms:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Subscriptions are billed monthly via Stripe. By subscribing, you
              authorise recurring monthly charges.
            </li>
            <li>
              You may cancel at any time. Cancellation takes effect at the end
              of the current billing period. No refunds are provided for
              partial months.
            </li>
            <li>
              We reserve the right to change subscription pricing with 30
              days&apos; notice. Continued use after the price change
              constitutes acceptance.
            </li>
            <li>
              A Verified Profile does not guarantee any particular level of
              visibility, traffic, or leads. We make no guarantees about
              business outcomes.
            </li>
            <li>
              Subscribing does not affect your AgentScore. The score is
              calculated independently and cannot be influenced by payment.
            </li>
          </ul>
        </section>

        {/* ---- 7. USER OBLIGATIONS ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            7. User obligations
          </h2>
          <p className="mt-2">When using FairComparisons, you agree not to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Scrape, crawl, or systematically download data from the Platform
              beyond what is permitted by our robots.txt
            </li>
            <li>
              Use the Platform to harass, defame, or intimidate any agent or
              agency
            </li>
            <li>
              Submit false or misleading information through the Claim process
              or any other form
            </li>
            <li>
              Attempt to manipulate the AgentScore or any other data displayed
              on the Platform
            </li>
            <li>
              Use automated tools, bots, or scripts to interact with the
              Platform without our prior written consent
            </li>
            <li>
              Resell, redistribute, or commercially exploit data obtained from
              the Platform
            </li>
          </ul>
          <p className="mt-2">
            We reserve the right to suspend or terminate access for any user
            who violates these terms.
          </p>
        </section>

        {/* ---- 8. INTELLECTUAL PROPERTY ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            8. Intellectual property
          </h2>
          <p className="mt-2">
            The AgentScore methodology, the Platform&apos;s design and layout,
            original text, and software code are the intellectual property of
            FairComparisons. All rights are reserved.
          </p>
          <p className="mt-2">
            Data sourced from third parties (CEA, Google, listing portals, URA,
            HDB) remains the property of the respective source and is used in
            accordance with applicable open data licences and terms of use.
          </p>
        </section>

        {/* ---- 9. LIMITATION OF LIABILITY ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            9. Limitation of liability
          </h2>
          <p className="mt-2">
            To the maximum extent permitted by applicable law:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              FairComparisons is provided &quot;as is&quot; and &quot;as
              available&quot; without warranties of any kind, whether express
              or implied, including warranties of accuracy, completeness,
              fitness for a particular purpose, or non-infringement.
            </li>
            <li>
              We are not liable for any direct, indirect, incidental,
              consequential, or special damages arising from your use of or
              inability to use the Platform, including but not limited to loss
              of revenue, loss of business opportunities, or reputational
              damage.
            </li>
            <li>
              We are not responsible for decisions made based on information
              displayed on the Platform. Users assume full responsibility for
              their use of the information provided.
            </li>
            <li>
              Our total aggregate liability for any claims arising from or
              related to these Terms or the Platform shall not exceed the
              amount you have paid to us in the 12 months preceding the claim,
              or S$100, whichever is greater.
            </li>
          </ul>
        </section>

        {/* ---- 10. AGENT DISPUTES ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            10. Agent disputes and complaints
          </h2>
          <p className="mt-2">
            If you are a property agent and believe that information on your
            profile is inaccurate, you may contact us at{" "}
            <a
              href="mailto:hello@fair-comparisons.com"
              className="text-blue-600 hover:underline"
            >
              hello@fair-comparisons.com
            </a>{" "}
            with specific details of the alleged inaccuracy. We will investigate
            and correct verified errors within a reasonable timeframe.
          </p>
          <p className="mt-2">
            Please note that the AgentScore reflects our independent editorial
            opinion based on publicly available data. Disagreement with the
            score is not grounds for its removal or modification. We will not
            adjust scores based on requests from individual agents.
          </p>
          <p className="mt-2">
            If you believe your score is based on factually incorrect
            underlying data, you may submit a correction request with evidence.
            If the underlying data is corrected, the score will be recalculated
            automatically.
          </p>
        </section>

        {/* ---- 11. THIRD-PARTY LINKS ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            11. Third-party links and services
          </h2>
          <p className="mt-2">
            The Platform may contain links to third-party websites and
            services (e.g., listing portals, Google Maps, agency websites). We are
            not responsible for the content, privacy practices, or terms of
            service of any third-party sites. Your use of third-party services
            is at your own risk.
          </p>
        </section>

        {/* ---- 12. CHANGES ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            12. Changes to these terms
          </h2>
          <p className="mt-2">
            We may update these Terms of Service from time to time. The
            &quot;Last updated&quot; date at the top of this page indicates
            when the latest revision was made. Continued use of the Platform
            after changes constitutes acceptance of the revised terms. For
            material changes, we will make reasonable efforts to provide notice
            (such as a banner on the Platform).
          </p>
        </section>

        {/* ---- 13. GOVERNING LAW ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            13. Governing law and jurisdiction
          </h2>
          <p className="mt-2">
            These Terms of Service are governed by the laws of Singapore. This
            choice reflects the fact that our Platform serves the Singapore
            market, our data subjects are in Singapore, and the PDPA applies to
            our operations.
          </p>
          <p className="mt-2">
            Any dispute arising from or in connection with these Terms shall be
            submitted to the exclusive jurisdiction of the courts of Singapore.
          </p>
          <p className="mt-2">
            Before commencing court proceedings, both parties agree to attempt
            to resolve disputes through good-faith negotiation for a period of
            at least 30 days from the date of written notice of the dispute.
          </p>
        </section>

        {/* ---- 14. SEVERABILITY ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">
            14. Severability
          </h2>
          <p className="mt-2">
            If any provision of these Terms is found to be unenforceable or
            invalid, that provision shall be limited or eliminated to the
            minimum extent necessary, and the remaining provisions shall
            continue in full force and effect.
          </p>
        </section>

        {/* ---- 15. CONTACT ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900">15. Contact</h2>
          <p className="mt-2">
            For questions about these Terms of Service:
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
        </section>
      </div>
    </article>
  );
}
