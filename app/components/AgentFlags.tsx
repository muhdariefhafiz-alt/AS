// Compact flag chips for ranking lists (search SERP, best-in-area, district,
// homepage). Glanceable so a seller can skip an agent before clicking in. Static
// (no click handler) because list rows are links; a short label plus a native
// hover tooltip explains it, and the full popover lives on the agent profile.

type Flag = { t: string; pct?: number };

type Meta = { tone: "warn" | "info"; label: (p?: number) => string; title: (p?: number) => string };

const FLAG_META: Record<string, Meta> = {
  team: {
    tone: "warn",
    label: () => "Team-attributed",
    title: () =>
      "Some of this agent's recorded sales are likely team deals logged under one leader's name, more than one person can close alone. We cap it in the AgentScore so it cannot inflate the ranking.",
  },
  buyer_side: {
    tone: "warn",
    label: (p) => `Buyer-side ${p}%`,
    title: (p) =>
      `On about ${p}% of this agent's sales they represented the buyer, not the seller, so they rarely win the listing themselves (the typical agent is around 35%). If you are selling, you usually want a seller-side agent.`,
  },
  new_launch: {
    tone: "info",
    label: (p) => `New launch ${p}%`,
    title: (p) =>
      `About ${p}% of this agent's sales are new project launches, not resale homes. Selling a launch unit for a developer is a different job from selling your existing flat or condo.`,
  },
  rentals: {
    tone: "warn",
    label: () => "Mostly rentals",
    title: (p) =>
      `Most of this agent's recorded deals are rentals, not home sales (about ${p}% are sales). A high deal count does not mean someone regularly sells homes.`,
  },
};

const ORDER = ["team", "buyer_side", "new_launch", "rentals"];

export default function AgentFlags({
  flags,
  max = 2,
  size = "md",
}: {
  flags?: Flag[] | null;
  max?: number;
  size?: "sm" | "md";
}) {
  if (!flags || flags.length === 0) return null;
  const shown = [...flags]
    .filter((f) => FLAG_META[f.t])
    .sort((a, b) => ORDER.indexOf(a.t) - ORDER.indexOf(b.t))
    .slice(0, max);
  if (shown.length === 0) return null;

  const fs = size === "sm" ? 10.5 : 11;
  const pad = size === "sm" ? "1px 7px" : "2px 8px";

  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      {shown.map((f, i) => {
        const m = FLAG_META[f.t];
        const c =
          m.tone === "warn"
            ? { bg: "var(--warn-wash)", fg: "var(--warn)" }
            : { bg: "var(--blue-wash)", fg: "var(--blue-deep)" };
        return (
          <span
            key={i}
            title={m.title(f.pct)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: c.bg,
              color: c.fg,
              fontSize: fs,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              padding: pad,
              borderRadius: "var(--r-pill)",
              whiteSpace: "nowrap",
              cursor: "help",
            }}
          >
            {m.label(f.pct)}
          </span>
        );
      })}
    </span>
  );
}
