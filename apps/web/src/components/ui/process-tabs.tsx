import Link from "next/link";

export type ProcessTabItem = {
  label: string;
  href?: string;
  active?: boolean;
};

export function ProcessTabs({ items }: { items: ProcessTabItem[] }) {
  return (
    <nav className="process-tabs" aria-label="Nhóm nội dung quy trình">
      {items.map((item) =>
        item.href ? (
          <Link className={item.active ? "is-active" : ""} href={item.href} key={item.label}>
            {item.label}
          </Link>
        ) : (
          <button className={item.active ? "is-active" : ""} key={item.label} type="button">
            {item.label}
          </button>
        )
      )}
    </nav>
  );
}
