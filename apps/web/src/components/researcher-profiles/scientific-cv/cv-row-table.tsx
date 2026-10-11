"use client";

export type CvRowColumn<Row extends object> = {
  key: keyof Row & string;
  label: string;
  type?: "text" | "number" | "date" | "textarea";
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
};

type CvRowTableProps<Row extends object> = {
  rows: Row[];
  columns: CvRowColumn<Row>[];
  onChange: (index: number, key: keyof Row & string, value: string | number | null) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
  addLabel?: string;
  emptyMessage?: string;
};

export function CvRowTable<Row extends object>({ rows, columns, onChange, onAdd, onRemove, disabled = false, addLabel = "Thêm dòng", emptyMessage = "Chưa có dữ liệu." }: CvRowTableProps<Row>) {
  function update(index: number, column: CvRowColumn<Row>, value: string) {
    onChange(index, column.key, column.type === "number" ? (value ? Number(value) : null) : value);
  }

  return <>
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Bảng dữ liệu lý lịch khoa học">
      <table className="data-table">
        <thead><tr><th>TT</th>{columns.map((column) => <th key={column.key}>{column.label}</th>)}<th>Thao tác</th></tr></thead>
        <tbody>{rows.length ? rows.map((row, index) => <tr key={index}>
          <td>{index + 1}</td>
          {columns.map((column) => <td key={column.key}>
            {column.options ? <select value={String(row[column.key] ?? "")} disabled={disabled} aria-label={`${column.label} dòng ${index + 1}`} onChange={(event) => update(index, column, event.target.value)}><option value="">Chọn</option>{column.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              : column.type === "textarea" ? <textarea rows={2} value={String(row[column.key] ?? "")} placeholder={column.placeholder} disabled={disabled} aria-label={`${column.label} dòng ${index + 1}`} onChange={(event) => update(index, column, event.target.value)} />
                : <input type={column.type ?? "text"} value={String(row[column.key] ?? "")} placeholder={column.placeholder} disabled={disabled} aria-label={`${column.label} dòng ${index + 1}`} onChange={(event) => update(index, column, event.target.value)} />}
          </td>)}
          <td><button type="button" className="button" disabled={disabled} aria-label={`Xóa dòng ${index + 1}`} onClick={() => onRemove(index)}>Xóa</button></td>
        </tr>) : <tr><td colSpan={columns.length + 2}>{emptyMessage}</td></tr>}</tbody>
      </table>
    </div>
    <button type="button" className="button" disabled={disabled} onClick={onAdd}>{addLabel}</button>
  </>;
}
