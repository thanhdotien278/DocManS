"use client";

import { createContext, useContext } from "react";

export type CvRowColumn<Row extends object> = {
  key: keyof Row & string;
  label: string;
  type?: "text" | "number" | "date" | "textarea";
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
};

// Row indices in edit mode, per table name. Held by the workspace so it survives tab switches; reset only after a successful save or reload.
export const CvRowEditing = createContext<{ rows: Record<string, number[]>; set: (name: string, rows: number[]) => void }>({ rows: {}, set: () => undefined });

type CvRowTableProps<Row extends object> = {
  name: string;
  rows: Row[];
  columns: CvRowColumn<Row>[];
  onChange: (index: number, key: keyof Row & string, value: string | number | null) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
  addLabel?: string;
  emptyMessage?: string;
};

export function CvRowTable<Row extends object>({ name, rows, columns, onChange, onAdd, onRemove, disabled = false, addLabel = "Thêm dòng", emptyMessage = "Chưa có dữ liệu." }: CvRowTableProps<Row>) {
  const shared = useContext(CvRowEditing);
  const editing = shared.rows[name] ?? [];
  const setEditing = (next: number[]) => shared.set(name, next);

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
            {!editing.includes(index) ? (column.options?.find((option) => option.value === String(row[column.key] ?? ""))?.label ?? (String(row[column.key] ?? "") || "—"))
              : column.options ? <select value={String(row[column.key] ?? "")} disabled={disabled} aria-label={`${column.label} dòng ${index + 1}`} onChange={(event) => update(index, column, event.target.value)}><option value="">Chọn</option>{[...column.options, ...(row[column.key] && !column.options.some((option) => option.value === String(row[column.key])) ? [{ value: String(row[column.key]), label: String(row[column.key]) }] : [])].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              : column.type === "textarea" ? <textarea rows={2} value={String(row[column.key] ?? "")} placeholder={column.placeholder} disabled={disabled} aria-label={`${column.label} dòng ${index + 1}`} onChange={(event) => update(index, column, event.target.value)} />
                : <input type={column.type ?? "text"} value={String(row[column.key] ?? "")} placeholder={column.placeholder} disabled={disabled} aria-label={`${column.label} dòng ${index + 1}`} onChange={(event) => update(index, column, event.target.value)} />}
          </td>)}
          <td>{editing.includes(index) ? null : <button type="button" className="button" disabled={disabled} aria-label={`Sửa dòng ${index + 1}`} onClick={() => setEditing([...editing, index])}>Sửa</button>}<button type="button" className="button" disabled={disabled} aria-label={`Xóa dòng ${index + 1}`} onClick={() => { if (!window.confirm(`Xóa dòng ${index + 1}?`)) return; setEditing(editing.filter((item) => item !== index).map((item) => item > index ? item - 1 : item)); onRemove(index); }}>Xóa</button></td>
        </tr>) : <tr><td colSpan={columns.length + 2}>{emptyMessage}</td></tr>}</tbody>
      </table>
    </div>
    <button type="button" className="button" disabled={disabled} onClick={() => { setEditing([...editing, rows.length]); onAdd(); }}>{addLabel}</button>
  </>;
}
