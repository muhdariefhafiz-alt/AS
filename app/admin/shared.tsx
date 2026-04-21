import Link from "next/link";
import { Sparkline } from "../components/Sparkline";

export const MS_DAY = 86_400_000;
export const MS_WEEK = 7 * MS_DAY;

export function weekBucket(date: Date, endAnchor: Date): number {
  const diffMs = endAnchor.getTime() - date.getTime();
  return Math.floor(diffMs / MS_WEEK);
}

export function buildWeekly<T extends { created_at: string }>(rows: T[], weeks: number): number[] {
  const out = new Array(weeks).fill(0);
  const anchor = new Date();
  for (const r of rows) {
    const b = weekBucket(new Date(r.created_at), anchor);
    if (b >= 0 && b < weeks) out[b]++;
  }
  return out.reverse();
}

export function deltaLabel(current: number, prior: number): { text: string; dir: "up" | "down" | "flat" } {
  if (prior === 0 && current === 0) return { text: "eerste meting", dir: "flat" };
  if (prior === 0) return { text: `+${current} v. 0`, dir: "up" };
  const diff = current - prior;
  const pct = Math.round((diff / prior) * 100);
  if (diff === 0) return { text: "gelijk", dir: "flat" };
  return { text: `${diff > 0 ? "+" : ""}${diff} (${pct > 0 ? "+" : ""}${pct}%)`, dir: diff > 0 ? "up" : "down" };
}

export function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function StatCard({
  title,
  value,
  delta,
  sparkline,
  color = "#0d9488",
  sub,
  href,
  danger,
}: {
  title: string;
  value: string | number;
  delta?: { text: string; dir: "up" | "down" | "flat" };
  sparkline?: number[];
  color?: string;
  sub?: string;
  href?: string;
  danger?: boolean;
}) {
  const deltaColor = delta?.dir === "up" ? "text-emerald-700" : delta?.dir === "down" ? "text-red-700" : "text-gray-500";
  const content = (
    <div
      className={`rounded-md border p-4 shadow-sm transition ${
        danger ? "border-red-300 bg-red-50" : href ? "border-gray-200 bg-white hover:border-teal-300" : "border-gray-200 bg-white"
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{title}</div>
      <div className={`mt-1 text-2xl font-bold ${danger ? "text-red-700" : "text-gray-900"}`}>{value}</div>
      {delta && <div className={`text-[11px] ${deltaColor}`}>{delta.text}</div>}
      {sparkline && (
        <div className="mt-2">
          <Sparkline values={sparkline} width={200} height={30} color={color} />
        </div>
      )}
      {sub && <div className="mt-1 text-[10px] text-gray-500">{sub}</div>}
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

export function Pill({ children, color }: { children: React.ReactNode; color: "red" | "emerald" | "amber" | "gray" | "blue" }) {
  const map: Record<string, string> = {
    red: "border-red-200 bg-red-50 text-red-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    gray: "border-gray-200 bg-gray-50 text-gray-600",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${map[color]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-md border border-dashed border-gray-300 p-6 text-center">
      <div className="text-sm font-semibold text-gray-500">{title}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}
