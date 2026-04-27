import { AlertTriangle } from "lucide-react";

export function AlertList({
  items
}: {
  items: Array<{ title: string; meta: string; tone?: "default" | "danger" }>;
}) {
  return (
    <div className="alert-list">
      {items.map((item) => (
        <article className="alert-item" key={item.title}>
          <span className="alert-icon">
            <AlertTriangle size={17} aria-hidden="true" />
          </span>
          <div>
            <p className="alert-title">{item.title}</p>
            <p className="alert-meta">{item.meta}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
