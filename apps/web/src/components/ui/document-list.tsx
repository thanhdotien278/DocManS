import { FileText } from "lucide-react";

export type DocumentListItem = {
  name: string;
  meta: string;
  actionLabel?: string;
};

export function DocumentList({ items }: { items: DocumentListItem[] }) {
  return (
    <div className="file-list">
      {items.map((item) => (
        <article className="file-item" key={item.name}>
          <span className="file-icon">
            <FileText size={17} aria-hidden="true" />
          </span>
          <div>
            <span className="record-title">{item.name}</span>
            <span className="record-meta">{item.meta}</span>
          </div>
          {item.actionLabel ? (
            <button className="button" type="button">
              {item.actionLabel}
            </button>
          ) : null}
        </article>
      ))}
    </div>
  );
}
