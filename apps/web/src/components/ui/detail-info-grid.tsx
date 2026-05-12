export type DetailInfoItem = {
  label: string;
  value: React.ReactNode;
};

export function DetailInfoGrid({ items }: { items: DetailInfoItem[] }) {
  return (
    <div className="meta-grid">
      {items.map((item) => (
        <div className="meta-item" key={item.label}>
          <span className="meta-label">{item.label}</span>
          <span className="meta-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
