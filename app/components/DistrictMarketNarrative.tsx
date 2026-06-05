import {
  formatPrice,
  formatPriceFull,
  formatPsf,
  pricePosition,
  pricePositionPhrase,
  priceVsSgAverage,
  transactionInsight,
  rentalYieldInsight,
  propertyMixInsight,
} from "../lib/narrativeHelpers";
import type { DistrictMarketData } from "../lib/districtData";

type Props = {
  areaName: string;
  districtCode: string;
  data: DistrictMarketData;
  wikiContext: string | null;
};

/**
 * Generates unique, data-driven narrative content for each district.
 * No boilerplate. Every sentence is conditional on actual data values.
 * Follows content-humanizer rules: no em dashes, no "delve/crucial/leverage".
 */
export default function DistrictMarketNarrative({ areaName, districtCode, data, wikiContext }: Props) {
  const {
    totalTxns,
    medianPrice,
    minPrice,
    maxPrice,
    propertyTypes,
    topProjects,
    rentalData,
    avgRentPsf,
    activeAgents,
    amenities,
    sgMedianPrice,
  } = data;

  const pos = pricePosition(medianPrice);
  const condoTypes = propertyTypes.filter(
    (t) => t.property_type === "Apartment" || t.property_type === "Condominium"
  );
  const hasLanded = propertyTypes.some(
    (t) => t.property_type === "Terrace" || t.property_type === "Semi-detached" || t.property_type === "Detached"
  );
  const hasRental = rentalData.length >= 3;
  const hasAgents = activeAgents.length >= 3;

  return (
    <div className="space-y-8">
      {/* Section 1: Market Overview */}
      <article className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-bold text-gray-900">
          {areaName} Property Market Overview
        </h2>
        <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-gray-600">
          {/* Opening paragraph: unique per district based on price position */}
          <p>
            {pricePositionPhrase(pos, areaName)}.{" "}
            {totalTxns > 0 ? (
              <>
                According to URA transaction records (2022-2025), {districtCode} has recorded{" "}
                <strong>{totalTxns.toLocaleString()} private property transactions</strong>,
                making it {transactionInsight(totalTxns)}.
              </>
            ) : (
              <>Transaction data for this district is limited in our current records.</>
            )}
          </p>

          {/* Price context: specific numbers, not vague */}
          {medianPrice > 0 && (
            <p>
              The median price for condominiums and apartments in {areaName} stands at{" "}
              <strong>{formatPrice(medianPrice)}</strong>, which is{" "}
              {priceVsSgAverage(medianPrice)} of {formatPrice(sgMedianPrice)}.
              {minPrice > 0 && maxPrice > 0 && maxPrice !== minPrice && (
                <>
                  {" "}Prices range from {formatPrice(minPrice)} for smaller units
                  to {formatPrice(maxPrice)} for premium properties.
                </>
              )}
            </p>
          )}

          {/* Property mix: data-derived, not boilerplate */}
          {propertyTypes.length > 0 && (
            <p>
              {propertyMixInsight(
                propertyTypes.map((t) => ({
                  type: t.property_type,
                  count: t.txns,
                  median: t.median_price,
                }))
              )}
              {hasLanded && (
                <>
                  {" "}The presence of landed property transactions sets {areaName} apart
                  from purely high-rise districts.
                </>
              )}
            </p>
          )}

          {/* Wikipedia context for local color */}
          {wikiContext && (
            <p>{wikiContext}</p>
          )}

          <p className="text-[11px] text-gray-400">
            Source: URA Private Residential Property Transactions. Analysis by FairComparisons.
          </p>
        </div>
      </article>

      {/* Section 2: Price Analysis by Property Type */}
      {propertyTypes.length > 0 && (
        <article className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-bold text-gray-900">
            Prices by Property Type in {areaName}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Based on {totalTxns.toLocaleString()} URA-recorded transactions across{" "}
            {propertyTypes.length} property categories.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4 text-right">Transactions</th>
                  <th className="pb-2 pr-4 text-right">Median Price</th>
                  <th className="hidden pb-2 pr-4 text-right sm:table-cell">Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {propertyTypes.map((t) => (
                  <tr key={t.property_type}>
                    <td className="py-2.5 pr-4 font-medium text-gray-900">{t.property_type}</td>
                    <td className="py-2.5 pr-4 text-right text-gray-600">
                      {t.txns.toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium text-gray-900">
                      {formatPrice(t.median_price)}
                    </td>
                    <td className="hidden py-2.5 pr-4 text-right text-gray-500 sm:table-cell">
                      {formatPrice(t.min_price)} - {formatPrice(t.max_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Narrative for the most expensive type */}
          {condoTypes.length >= 2 && (
            <p className="mt-4 text-sm text-gray-600">
              {condoTypes[0].property_type === "Condominium"
                ? `Condominiums command a premium over apartments in ${areaName}, with a median of ${formatPrice(condoTypes[0].median_price)} compared to ${formatPrice(condoTypes[1].median_price)} for apartments.`
                : `Apartments represent the bulk of the market at ${condoTypes[0].txns.toLocaleString()} transactions, while condominiums trade at a higher median of ${formatPrice(condoTypes.find(t => t.property_type === "Condominium")?.median_price ?? 0)}.`
              }{" "}
              This price gap reflects differences in unit size, facilities, and development age
              rather than location alone.
            </p>
          )}
        </article>
      )}

      {/* Section 3: Top Projects */}
      {topProjects.length >= 3 && (
        <article className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-bold text-gray-900">
            Most Traded Developments in {areaName}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Ranked by URA-recorded transaction volume. Higher volumes indicate
            stronger buyer interest and market liquidity.
          </p>

          {/* Lead narrative about top project */}
          <p className="mt-4 text-[15px] leading-relaxed text-gray-600">
            The most actively traded development in {areaName} is{" "}
            <strong>{topProjects[0].project}</strong> on {topProjects[0].street}, with{" "}
            {topProjects[0].txns} recorded transactions at a median price of{" "}
            {formatPriceFull(topProjects[0].median_price)}.
            {topProjects.length >= 2 && (
              <>
                {" "}{topProjects[1].project} follows with {topProjects[1].txns} transactions
                at {formatPriceFull(topProjects[1].median_price)}.
              </>
            )}
            {topProjects.length >= 3 &&
              topProjects[2].median_price > topProjects[0].median_price * 1.5 && (
                <>
                  {" "}Notably, {topProjects[2].project} commands a significant premium at{" "}
                  {formatPriceFull(topProjects[2].median_price)} per unit despite fewer transactions.
                </>
              )}
          </p>

          <div className="mt-4 space-y-2">
            {topProjects.map((p, i) => (
              <div
                key={p.project}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
                  i === 0 ? "bg-[var(--blue)]" : i === 1 ? "bg-[var(--blue)]" : i === 2 ? "bg-[var(--blue)]" : "bg-gray-400"
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{p.project}</p>
                  <p className="text-xs text-gray-500">{p.street}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatPrice(p.median_price)}</p>
                  <p className="text-xs text-gray-500">{p.txns} txns</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11px] text-gray-400">
            Source: URA Private Residential Property Transactions (2022-2025).
          </p>
        </article>
      )}

      {/* Section 4: Rental Market */}
      {hasRental && avgRentPsf && (
        <article className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-bold text-gray-900">
            Rental Market in {areaName}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-gray-600">
            Rental rates in {areaName} average {formatPsf(avgRentPsf)} (median per square foot),
            placing the district {rentalYieldInsight(avgRentPsf)}.
            {rentalData.length >= 2 && (
              <>
                {" "}The highest rents are found at <strong>{rentalData[0].project}</strong> at{" "}
                {formatPsf(rentalData[0].avg_rent_psf)},
                while <strong>{rentalData[rentalData.length - 1].project}</strong> offers
                lower rates at {formatPsf(rentalData[rentalData.length - 1].avg_rent_psf)}.
              </>
            )}
          </p>

          <div className="mt-4 space-y-2">
            {rentalData.slice(0, 5).map((r) => (
              <div
                key={r.project}
                className="flex items-center justify-between rounded border border-gray-100 bg-gray-50 px-4 py-2.5"
              >
                <span className="text-sm font-medium text-gray-900">{r.project}</span>
                <span className="text-sm font-bold text-[var(--blue)]">{formatPsf(r.avg_rent_psf)}</span>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11px] text-gray-400">
            Source: URA Median Rental Data. PSF = per square foot per month.
          </p>
        </article>
      )}

      {/* Section 5: Active Agents */}
      {hasAgents && (
        <article className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-bold text-gray-900">
            Property Agents Active in {areaName}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Agents currently listing properties in {districtCode}, based on listing portals data.
          </p>
          <div className="mt-4 space-y-2">
            {activeAgents.slice(0, 10).map((a) => (
              <div
                key={a.agent_license}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--blue-wash)] text-sm font-bold text-[var(--blue-deep)]">
                  {a.agent_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{a.agent_name}</p>
                  <p className="text-xs text-gray-500">
                    {a.agency_name ?? "Independent"} · CEA {a.agent_license}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{a.listings} listing{a.listings !== 1 ? "s" : ""}</p>
                  <p className="text-xs text-gray-500">avg {formatPrice(a.avg_price)}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Section 6: Amenities */}
      {(amenities.schools.length > 0 || amenities.mrt.length > 0) && (
        <article className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-bold text-gray-900">
            Schools and Transport in {areaName}
          </h2>
          {amenities.mrt.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-bold text-gray-700">MRT Stations</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {amenities.mrt.map((a) => (
                  <span
                    key={a.name}
                    className="rounded-full bg-[var(--blue-wash)] px-3 py-1 text-xs font-medium text-[var(--blue-deep)]"
                  >
                    {a.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {amenities.schools.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-bold text-gray-700">
                Schools ({amenities.schools.length})
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {amenities.schools.slice(0, 15).map((a) => (
                  <span
                    key={a.name}
                    className="rounded bg-gray-100 px-2.5 py-1 text-xs text-gray-600"
                  >
                    {a.name}
                  </span>
                ))}
                {amenities.schools.length > 15 && (
                  <span className="rounded bg-gray-100 px-2.5 py-1 text-xs text-gray-400">
                    +{amenities.schools.length - 15} more
                  </span>
                )}
              </div>
            </div>
          )}
        </article>
      )}
    </div>
  );
}
