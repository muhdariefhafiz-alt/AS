import { renderDocument } from "./render";
import { tenancyContent, type DocFields } from "./tenancy";

// Server-only. Maps a versioned template_key to its rendered PDF. Keep pdf-lib
// (render.ts) reachable ONLY from here and the API route, never from anything
// the client bundle imports.

const FOOTER = "Generated with FairComparisons for your review. This is a standard template, not legal advice.";

export async function renderPdf(
  templateKey: string,
  fields: DocFields,
  opts: { draft: boolean }
): Promise<Uint8Array> {
  switch (templateKey) {
    case "tenancy_residential_v1":
      return renderDocument(tenancyContent(fields), { draft: opts.draft, footerNote: FOOTER, templateKey });
    default:
      throw new Error(`Unknown template: ${templateKey}`);
  }
}
