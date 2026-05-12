import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyTitle = "Chưa có dữ liệu",
  emptyMessage = "Danh sách hiện chưa có bản ghi phù hợp với điều kiện hiển thị."
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RecordLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className="record-title" href={href}>
      {children}
    </Link>
  );
}
