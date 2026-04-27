export function KpiCard({
  label,
  value,
  meta,
  tone = "default"
}: {
  label: string;
  value: string;
  meta: string;
  tone?: "default" | "warning" | "danger" | "info";
}) {
  return (
    <article className={`kpi-card ${tone}`}>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value}</p>
      <p className="kpi-meta">{meta}</p>
    </article>
  );
}
