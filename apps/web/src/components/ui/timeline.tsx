import { StatusBadge } from "@/components/ui/status-badge";

export function Timeline({
  items
}: {
  items: Array<{ title: string; meta: string; status: string }>;
}) {
  return (
    <div className="timeline">
      {items.map((item) => (
        <div className="timeline-item" key={item.title}>
          <span className="timeline-dot" aria-hidden="true" />
          <div>
            <p className="timeline-title">{item.title}</p>
            <p className="timeline-meta">{item.meta}</p>
            <div style={{ marginTop: 8 }}>
              <StatusBadge status={item.status} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
