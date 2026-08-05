import { renderDocument, type ContentBlock } from "./render";
import { tenancyContent } from "./tenancy";
import { loiContent } from "./loi";
import type { DocFields } from "./schema";

// SERVER ONLY. Maps a versioned template_key to its rendered PDF. Keep pdf-lib
// (render.ts) reachable ONLY from here and the API routes, never from anything
// the client bundle imports.

const FOOTER = "Generated with FairComparisons for your review. This is a standard template, not legal advice.";

// Free-tier documents carry a neutral provenance line. It states a fact, names
// no party, and gives the counterparty (often the co-broke salesperson) a way
// to find the tool. Paid tiers render the plain footer: selling "your
// letterhead, your document" and then branding a paying agent's client-facing
// document would break the promise.
const PROVENANCE = "Prepared with FairComparisons · fair-comparisons.com/tools/loi";

const CONTENT: Record<string, (f: DocFields) => ContentBlock[]> = {
  tenancy_residential_v1: tenancyContent,
  loi_residential_v1: loiContent,
};

export function contentBuilderFor(templateKey: string): ((f: DocFields) => ContentBlock[]) | undefined {
  return CONTENT[templateKey];
}

export async function renderPdf(
  templateKey: string,
  fields: DocFields,
  opts: { draft: boolean; provenance?: boolean; watermarkText?: string }
): Promise<Uint8Array> {
  const build = CONTENT[templateKey];
  if (!build) throw new Error(`Unknown template: ${templateKey}`);
  return renderDocument(build(fields), {
    draft: opts.draft,
    footerNote: opts.provenance ? `${FOOTER}  ${PROVENANCE}` : FOOTER,
    templateKey,
    watermarkText: opts.watermarkText,
  });
}
