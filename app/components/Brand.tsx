import Link from "next/link";

/* FairComparisons brand primitives — "The Record" design system.
   Server-renderable (no client hooks). Ported from the design kit. */

export function Seal({
  size = 28,
  variant = "",
}: {
  size?: number;
  variant?: "" | "light" | "blue";
}) {
  const cls =
    variant === "light"
      ? "fc-seal fc-seal--light"
      : variant === "blue"
        ? "fc-seal fc-seal--blue"
        : "fc-seal";
  return (
    <svg
      className={cls}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="29.5" stroke="currentColor" strokeWidth="3" />
      <circle
        cx="32"
        cy="32"
        r="24"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeDasharray="1.6 4.3"
        opacity="0.42"
      />
      <path
        d="M21.5 33 l7.2 7.6 L44 23.5"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ size = 20, light }: { size?: number; light?: boolean }) {
  return (
    <span
      className={"fc-wordmark" + (light ? " fc-wordmark--light" : "")}
      style={{ fontSize: size }}
    >
      Fair<span className="thin">Comparisons</span>
    </span>
  );
}

export function Lockup({
  size = 26,
  light,
  href = "/",
}: {
  size?: number;
  light?: boolean;
  href?: string | null;
}) {
  const inner = (
    <span className="fc-lockup">
      <Seal size={size * 0.92} variant={light ? "light" : ""} />
      <Wordmark size={size} light={light} />
    </span>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

/* ---------- AgentScore ---------- */
const BANDS = [
  { min: 90, word: "Top performer", color: "var(--score-90)" },
  { min: 75, word: "Strong", color: "var(--score-75)" },
  { min: 60, word: "Solid", color: "var(--score-60)" },
  { min: 40, word: "Building", color: "var(--score-40)" },
  { min: 0, word: "Limited record", color: "var(--score-00)" },
];
export function bandFor(s: number) {
  return BANDS.find((b) => s >= b.min) ?? BANDS[BANDS.length - 1];
}

export function Gauge({
  score = 0,
  width = 200,
  dark,
  numSize = 48,
}: {
  score?: number;
  width?: number;
  dark?: boolean;
  numSize?: number;
}) {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div className="fc-gauge" style={{ width }}>
      <svg viewBox="0 0 240 140">
        <path
          className={"fc-gauge__track" + (dark ? " fc-gauge__track--dark" : "")}
          d="M20 124 A100 100 0 0 1 220 124"
          pathLength={100}
        />
        <path
          className="fc-gauge__fill"
          d="M20 124 A100 100 0 0 1 220 124"
          pathLength={100}
          strokeDasharray={`${s} 100`}
        />
      </svg>
      <div className="fc-gauge__val">
        <span
          className="fc-gauge__num"
          style={{ fontSize: numSize, color: dark ? "#fff" : "var(--ink)" }}
        >
          {s}
        </span>
        <span
          className="fc-gauge__of"
          style={{ color: dark ? "rgba(255,255,255,.6)" : undefined }}
        >
          OF 100
        </span>
      </div>
    </div>
  );
}

export function ScoreBand({ score }: { score: number }) {
  const b = bandFor(score);
  return (
    <span className="fc-band">
      <span className="fc-band__swatch" style={{ background: b.color }} />
      {b.word}
    </span>
  );
}

/* ---------- trust badges (fixed hierarchy) ---------- */
export function VerifiedBadge({
  sm,
  children = "Verified completion",
}: {
  sm?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <span className={"fc-badge fc-badge--verified" + (sm ? " fc-badge--sm" : "")}>
      <Seal size={sm ? 14 : 16} variant="light" /> {children}
    </span>
  );
}

export function RankedBadge() {
  return (
    <span className="fc-badge fc-badge--ranked">
      <span className="dot" /> Ranked on CEA data
    </span>
  );
}

export function SourceBadge({
  children = "Source · CEA · URA · HDB",
}: {
  children?: React.ReactNode;
}) {
  return <span className="fc-badge fc-badge--source">{children}</span>;
}

/* ---------- ranked row ---------- */
export function RankRow({
  pos,
  name,
  sub,
  score,
  verified,
  href,
}: {
  pos: number;
  name: string;
  sub: string;
  score: number | null;
  verified?: boolean;
  href?: string;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const body = (
    <div className="fc-rank">
      <span className="fc-rank__pos">{String(pos).padStart(2, "0")}</span>
      <span
        className="fc-avatar"
        style={{ width: 40, height: 40, borderRadius: 10, fontSize: 15 }}
      >
        {initials}
      </span>
      <div className="fc-rank__main">
        <div className="fc-rank__name">{name}</div>
        <div className="fc-rank__sub">{sub}</div>
      </div>
      {verified && <VerifiedBadge sm>Verified</VerifiedBadge>}
      {score !== null && (
        <span
          className="fc-rank__score"
          style={{ color: score >= 75 ? "var(--ink)" : "var(--slate)" }}
        >
          {Math.round(score)}
        </span>
      )}
    </div>
  );
  if (href)
    return (
      <Link href={href} style={{ color: "inherit", display: "block" }}>
        {body}
      </Link>
    );
  return body;
}
