import Link from "next/link";

export type MobileRecordItem = {
  id: string;
  href?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: React.ReactNode;
  actionLabel?: string;
};

export function MobileRecordList({ items }: { items: MobileRecordItem[] }) {
  return (
    <div className="mobile-list">
      {items.map((item) => (
        <article className="list-card" key={item.id}>
          <div className="list-card-header">
            <div>
              {item.href ? (
                <Link className="record-title" href={item.href}>
                  {item.title}
                </Link>
              ) : (
                <span className="record-title">{item.title}</span>
              )}
              {item.subtitle ? <span className="record-meta">{item.subtitle}</span> : null}
            </div>
            {item.badge}
          </div>
          {item.meta ? <span className="record-meta">{item.meta}</span> : null}
          {item.href && item.actionLabel ? (
            <Link className="button" href={item.href}>
              {item.actionLabel}
            </Link>
          ) : null}
        </article>
      ))}
    </div>
  );
}
