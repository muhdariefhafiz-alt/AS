// District ↔ area mapping. `name` MUST match sg_area_top_agents.area_name exactly.
// `slug` is the /property-agents/best/[area] route. `district` is the URA code.
export type Area = { name: string; slug: string; district: string };

export const AREAS: Area[] = [
  { name: "Serangoon Garden/ Hougang/ Punggol", slug: "serangoon-hougang-punggol", district: "D19" },
  { name: "Katong/ Joo Chiat/ Amber Road", slug: "katong-joo-chiat", district: "D15" },
  { name: "Ardmore/ Bukit Timah/ Holland Road/ Tanglin", slug: "bukit-timah-holland", district: "D10" },
  { name: "Orchard/ Cairnhill/ River Valley", slug: "orchard-river-valley", district: "D09" },
  { name: "Tampines/ Pasir Ris", slug: "tampines-pasir-ris", district: "D18" },
  { name: "Pasir Panjang/ Hong Leong Garden/ Clementi New Town", slug: "clementi-west-coast", district: "D05" },
  { name: "Hillview/ Dairy Farm/ Bukit Panjang/ Choa Chu Kang", slug: "bukit-panjang-choa-chu-kang", district: "D23" },
  { name: "Bedok/ Upper East Coast/ Eastwood/ Kew Drive", slug: "bedok-east-coast", district: "D16" },
  { name: "Geylang/ Eunos", slug: "geylang-eunos", district: "D14" },
  { name: "Queenstown/ Tiong Bahru", slug: "queenstown-tiong-bahru", district: "D03" },
  { name: "Bishan/ Ang Mo Kio", slug: "bishan-ang-mo-kio", district: "D20" },
  { name: "Balestier/ Toa Payoh/ Serangoon", slug: "balestier-toa-payoh", district: "D12" },
  { name: "Upper Bukit Timah/ Clementi Park/ Ulu Pandan", slug: "upper-bukit-timah", district: "D21" },
  { name: "Watten Estate/ Novena/ Thomson", slug: "novena-thomson", district: "D11" },
  { name: "Jurong", slug: "jurong", district: "D22" },
  { name: "Yishun/ Sembawang", slug: "yishun-sembawang", district: "D27" },
  { name: "Upper Thomson/ Springleaf", slug: "upper-thomson", district: "D26" },
  { name: "Seletar", slug: "seletar", district: "D28" },
  { name: "Kranji/ Woodgrove", slug: "kranji-woodlands", district: "D25" },
  { name: "Raffles Place/ Cecil/ Marina/ People's Park", slug: "raffles-place-marina", district: "D01" },
  { name: "Anson/ Tanjong Pagar", slug: "chinatown-tanjong-pagar", district: "D02" },
  { name: "Telok Blangah/ Harbourfront", slug: "harbourfront-telok-blangah", district: "D04" },
  { name: "Middle Road/ Golden Mile", slug: "beach-road-golden-mile", district: "D07" },
  { name: "Little India", slug: "little-india", district: "D08" },
  { name: "Macpherson/ Braddell", slug: "macpherson-braddell", district: "D13" },
  { name: "Loyang/ Changi", slug: "changi-loyang", district: "D17" },
  { name: "Lim Chu Kang/ Tengah", slug: "lim-chu-kang", district: "D24" },
  { name: "High Street/ Beach Road (part)", slug: "high-street", district: "D06" },
];

export function areaByDistrictCode(code: string): Area | undefined {
  return AREAS.find((a) => a.district.toUpperCase() === code.toUpperCase());
}

export function areaShortName(name: string): string {
  return name.split(/[/,]/)[0].trim();
}
