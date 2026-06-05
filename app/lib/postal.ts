/**
 * Singapore postal code → postal district resolver.
 *
 * A SG postal code is 6 digits; the first two are the "postal sector".
 * The 82 assigned sectors map to the 28 URA postal districts (D01–D28).
 * Reference: URA / SingPost postal district guide.
 */

// sector (2-digit string) → district number (1–28)
const SECTOR_TO_DISTRICT: Record<string, number> = {};
const GROUPS: [number, string[]][] = [
  [1, ["01", "02", "03", "04", "05", "06"]],
  [2, ["07", "08"]],
  [3, ["14", "15", "16"]],
  [4, ["09", "10"]],
  [5, ["11", "12", "13"]],
  [6, ["17"]],
  [7, ["18", "19"]],
  [8, ["20", "21"]],
  [9, ["22", "23"]],
  [10, ["24", "25", "26", "27"]],
  [11, ["28", "29", "30"]],
  [12, ["31", "32", "33"]],
  [13, ["34", "35", "36", "37"]],
  [14, ["38", "39", "40", "41"]],
  [15, ["42", "43", "44", "45"]],
  [16, ["46", "47", "48"]],
  [17, ["49", "50", "81"]],
  [18, ["51", "52"]],
  [19, ["53", "54", "55", "82"]],
  [20, ["56", "57"]],
  [21, ["58", "59"]],
  [22, ["60", "61", "62", "63", "64"]],
  [23, ["65", "66", "67", "68"]],
  [24, ["69", "70", "71"]],
  [25, ["72", "73"]],
  [26, ["77", "78"]],
  [27, ["75", "76"]],
  [28, ["79", "80"]],
];
for (const [district, sectors] of GROUPS) {
  for (const s of sectors) SECTOR_TO_DISTRICT[s] = district;
}

/** Returns the URA district code (e.g. "D15") for a full 6-digit postal code, or null. */
export function postalToDistrictCode(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length !== 6) return null;
  const sector = digits.slice(0, 2);
  const district = SECTOR_TO_DISTRICT[sector];
  if (!district) return null;
  return "D" + String(district).padStart(2, "0");
}

/** True if the string looks like a full 6-digit SG postal code. */
export function looksLikePostal(raw: string): boolean {
  return /^\d{6}$/.test((raw || "").trim());
}
