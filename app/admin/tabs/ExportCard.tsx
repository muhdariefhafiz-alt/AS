"use client";

// Operator self-serve CSV export. Four download buttons, one per table, each a
// plain GET to /api/admin/export?type=... (admin-session gated server-side).
// No props, no state: the anchors let the browser stream the download and the
// server sets the attachment filename. Styled to match the admin (Tailwind,
// teal accent), not the public fc-* tokens.

const EXPORTS: { type: string; label: string; desc: string }[] = [
  { type: "leads", label: "Leads", desc: "Seller leads: contact, property, status" },
  { type: "agents", label: "Agents", desc: "Directory: claim, tier, email health" },
  { type: "outreach", label: "Outreach", desc: "Email send log with batch + status" },
  { type: "contracts", label: "Contracts", desc: "Signed agent agreements" },
];

export default function ExportCard() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">Export data (CSV)</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Download a full table as CSV. Your data, one click.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {EXPORTS.map((e) => (
          <a
            key={e.type}
            href={`/api/admin/export?type=${e.type}`}
            download
            className="inline-flex flex-col rounded-md border border-teal-600 px-3 py-2 text-teal-700 transition hover:bg-teal-50"
            title={e.desc}
          >
            <span className="text-xs font-semibold">Download {e.label}</span>
            <span className="mt-0.5 text-[10px] text-gray-500">{e.desc}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
