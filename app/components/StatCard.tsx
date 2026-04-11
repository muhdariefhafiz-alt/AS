type Props = {
  label: string;
  value: string;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
};

export default function StatCard({ label, value, subtext, trend, trendValue }: Props) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
      {(subtext || trendValue) && (
        <div className="mt-1.5 flex items-center gap-2">
          {trendValue && (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                trend === "up"
                  ? "bg-green-50 text-green-700"
                  : trend === "down"
                  ? "bg-red-50 text-red-700"
                  : "bg-gray-50 text-gray-600"
              }`}
            >
              {trend === "up" ? "\u2191" : trend === "down" ? "\u2193" : ""} {trendValue}
            </span>
          )}
          {subtext && <span className="text-xs text-gray-400">{subtext}</span>}
        </div>
      )}
    </div>
  );
}
