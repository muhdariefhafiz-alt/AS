"use client";

type TimelineEvent = {
  id: number;
  event_type: string;
  meta: Record<string, unknown> | null;
  created_at: string | null;
};

type Props = {
  events: TimelineEvent[];
};

const EVENT_ICON: Record<string, string> = {
  lead_invited: "🎯",
  draft_viewed: "✎",
  reply_sent: "✓",
  viewed: "👁️",
  email_reply: "💬",
  viewing_booked: "📅",
  quote_submitted: "💰",
  lead_picked: "🏆",
  lead_not_picked: "✗",
};

const EVENT_LABEL: Record<string, string> = {
  lead_invited: "LEAD INVITED",
  draft_viewed: "DRAFT VIEWED",
  reply_sent: "REPLY SENT",
  viewed: "VIEWED",
  email_reply: "EMAIL REPLY",
  viewing_booked: "VIEWING BOOKED",
  quote_submitted: "QUOTE SUBMITTED",
  lead_picked: "LEAD PICKED",
  lead_not_picked: "LEAD NOT PICKED",
};

const EVENT_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  lead_picked: { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300" },
  reply_sent: { bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300" },
  email_reply: { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-800", text: "text-purple-700 dark:text-purple-300" },
  viewed: { bg: "bg-gray-50 dark:bg-gray-800", border: "border-gray-200 dark:border-gray-700", text: "text-gray-700 dark:text-gray-300" },
  default: { bg: "bg-gray-50 dark:bg-gray-800", border: "border-gray-200 dark:border-gray-700", text: "text-gray-700 dark:text-gray-300" },
};

function formatDate(isoString: string | null): string {
  if (!isoString) return "Unknown date";
  const dt = new Date(isoString);
  return dt.toLocaleDateString("en-SG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function eventContext(event: TimelineEvent): string {
  const { event_type, meta } = event;

  switch (event_type) {
    case "lead_invited":
      return `Seller shortlisted you${meta?.shortlist_count ? ` + ${(meta.shortlist_count as number) - 1} others` : ""}`;
    case "draft_viewed":
      const preview = meta?.preview ? (meta.preview as string).substring(0, 60) : "AI-drafted reply preview";
      return preview;
    case "reply_sent":
      return "Draft sent via email";
    case "viewed":
      const readTime = meta?.read_time_seconds
        ? Math.round((meta.read_time_seconds as number) / 60)
        : 2;
      return `Seller opened your email (${readTime} min read time)`;
    case "email_reply":
      return meta?.text ? (meta.text as string).substring(0, 80) : "Email reply from seller";
    case "viewing_booked":
      return "Viewing scheduled";
    case "quote_submitted":
      return "Quote submitted to seller";
    case "lead_picked":
      return "Seller picked you as the winning agent";
    case "lead_not_picked":
      return "Seller picked another agent";
    default:
      return "Event";
  }
}

export default function Timeline({ events }: Props) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
        No timeline events yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => {
        const colors = EVENT_COLOR[event.event_type] || EVENT_COLOR.default;
        const icon = EVENT_ICON[event.event_type] || "•";
        const label = EVENT_LABEL[event.event_type] || event.event_type.toUpperCase();
        const context = eventContext(event);

        return (
          <div
            key={event.id}
            className={`border rounded-lg p-4 ${colors.bg} ${colors.border}`}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl mt-1">{icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className={`text-sm font-bold ${colors.text}`}>{label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {formatDate(event.created_at)}
                  </div>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{context}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
