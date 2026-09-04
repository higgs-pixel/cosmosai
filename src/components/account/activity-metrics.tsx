const metricLabels = [
  { label: "Discoveries", key: "discoveries" },
  { label: "Bookmarks", key: "bookmarks" },
  { label: "Articles Read", key: "articlesRead" },
  { label: "Collections", key: "collections" },
] as const;

export type AccountActivityMetrics = Record<(typeof metricLabels)[number]["key"], number>;

export function ActivityMetrics({ metrics }: { metrics: AccountActivityMetrics }) {
  return (
    <section className="rounded-xl border border-white/5 bg-[#0F1115] p-5 md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">Saved Activity</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricLabels.map((metric) => (
          <div key={metric.key} className="rounded-xl border border-white/5 bg-[#08090D] p-4">
            <p className="text-sm text-gray-500">{metric.label}</p>
            <p className="mt-3 font-mono text-3xl font-semibold text-gray-100">{metrics[metric.key]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
