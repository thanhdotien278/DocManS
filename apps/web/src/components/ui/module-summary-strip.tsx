export type ModuleSummaryItem = {
  label: string;
  value: string;
  meta?: string;
  tone?: "default" | "warning" | "danger" | "info";
};

export function ModuleSummaryStrip({ items }: { items: ModuleSummaryItem[] }) {
  return (
    <div className="module-summary-strip">
      {items.map((item) => (
        <article className={`module-summary-item ${item.tone ?? "default"}`} key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.meta ? <small>{item.meta}</small> : null}
        </article>
      ))}
    </div>
  );
}
