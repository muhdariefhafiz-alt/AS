import { formatPrice, formatPsf } from "../lib/narrativeHelpers";
import type { DistrictMarketData } from "../lib/districtData";

type Props = {
  areaName: string;
  districtCode: string;
  data: DistrictMarketData;
};

type FAQItem = { question: string; answer: string };

/**
 * Generates FAQ items from real data. Every answer contains specific numbers.
 * Outputs both visible HTML and FAQPage JSON-LD schema.
 */
export default function DistrictFAQ({ areaName, districtCode, data }: Props) {
  const faqs: FAQItem[] = [];

  // Q1: Average price (always, if data exists)
  if (data.medianPrice > 0) {
    faqs.push({
      question: `What is the average condo price in ${areaName} (${districtCode})?`,
      answer: `The median condominium and apartment price in ${areaName} is ${formatPrice(data.medianPrice)}, based on ${data.totalTxns.toLocaleString()} URA-recorded transactions from 2022 to 2025. Prices range from ${formatPrice(data.minPrice)} to ${formatPrice(data.maxPrice)} depending on unit size, tenure, and development.`,
    });
  }

  // Q2: Transaction volume
  if (data.totalTxns > 0) {
    faqs.push({
      question: `How many property transactions were recorded in ${areaName}?`,
      answer: `URA records show ${data.totalTxns.toLocaleString()} private residential transactions in ${districtCode} (${areaName}) between 2022 and 2025. This covers apartments, condominiums, and landed properties.`,
    });
  }

  // Q3: Best condos (top projects)
  if (data.topProjects.length >= 3) {
    const top3 = data.topProjects.slice(0, 3);
    faqs.push({
      question: `What are the most popular condos in ${areaName}?`,
      answer: `The most actively traded developments in ${areaName} by URA transaction volume are ${top3[0].project} (${top3[0].txns} transactions, median ${formatPrice(top3[0].median_price)}), ${top3[1].project} (${top3[1].txns} transactions), and ${top3[2].project} (${top3[2].txns} transactions).`,
    });
  }

  // Q4: Rental market
  if (data.avgRentPsf && data.rentalData.length >= 2) {
    faqs.push({
      question: `What are rental rates in ${areaName}?`,
      answer: `The average rental rate in ${areaName} is ${formatPsf(data.avgRentPsf)} per month. The highest rents are at ${data.rentalData[0].project} (${formatPsf(data.rentalData[0].avg_rent_psf)}) and the most affordable at ${data.rentalData[data.rentalData.length - 1].project} (${formatPsf(data.rentalData[data.rentalData.length - 1].avg_rent_psf)}).`,
    });
  }

  // Q5: Property types available
  if (data.propertyTypes.length >= 2) {
    const types = data.propertyTypes.map((t) => t.property_type.toLowerCase()).join(", ");
    faqs.push({
      question: `What types of property are available in ${areaName}?`,
      answer: `${areaName} has ${data.propertyTypes.length} property categories with recorded transactions: ${types}. ${data.propertyTypes[0].property_type}s represent the largest segment with ${data.propertyTypes[0].txns.toLocaleString()} transactions.`,
    });
  }

  // Q6: Agents active in district
  if (data.activeAgents.length >= 3) {
    faqs.push({
      question: `Which property agents are active in ${areaName}?`,
      answer: `Based on current listing portals listings, ${data.activeAgents.length} agents are actively marketing properties in ${districtCode}. The most active agents include ${data.activeAgents[0].agent_name} (${data.activeAgents[0].agency_name ?? "Independent"}) and ${data.activeAgents[1].agent_name} (${data.activeAgents[1].agency_name ?? "Independent"}).`,
    });
  }

  if (faqs.length === 0) return null;

  // FAQPage JSON-LD schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <article className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-bold text-gray-900">
          Frequently Asked Questions about {areaName}
        </h2>
        <div className="mt-4 space-y-5">
          {faqs.map((f, i) => (
            <div key={i}>
              <h3 className="font-semibold text-gray-900">{f.question}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{f.answer}</p>
            </div>
          ))}
        </div>
      </article>
    </>
  );
}
