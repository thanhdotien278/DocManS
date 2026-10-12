"use client";

import { useRef, useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

// The API only accepts http(s) or site-relative links; a bare host like "tinhte.vn" gets https:// instead of failing the whole save.
export const withScheme = (value: string) => { const v = value.trim(); return v && !/^([a-z][a-z0-9+.-]*:|\/)/i.test(v) ? `https://${v}` : v; };
export const SAFE_LINK = /^(https?:\/\/|\/(?!\/))/i;

export type CvRowColumn<Row extends object> = {
  key: keyof Row & string;
  label: string;
  /** Table header when it differs from the Drawer label (defaults to the label without " *"). */
  header?: string;
  type?: "text" | "number" | "date" | "textarea" | "url";
  required?: boolean;
  /** false: the field is edited in the Drawer only. */
  table?: false;
  /** Custom table cell, e.g. a merged year range. */
  cell?: (row: Row) => ReactNode;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  maxLength?: number;
  min?: number;
  max?: number;
};

type Form = Record<string, string>;

const formOf = <Row extends object>(columns: CvRowColumn<Row>[], row: Row): Form => Object.fromEntries(columns.map((column) => [column.key, String(row[column.key] ?? "")]));

export function CvDrawer({ label, dirty, onSave, onClose, commitLabel = "Lưu lý lịch khoa học", children }: { label: string; dirty: boolean; onSave: () => void; onClose: () => void; commitLabel?: string; children: ReactNode }) {
  const [discarding, setDiscarding] = useState(false);
  const requestClose = () => { if (dirty) setDiscarding(true); else onClose(); };
  return <Dialog className="form-dialog cv-drawer-dialog" label={label} onClose={requestClose} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); requestClose(); } }}>
    {/* No form element: the Drawer sits inside the CV/profile form, so Enter must never reach it. Inputs that handle Enter themselves call preventDefault first. */}
    <div className="section-card" role="group" aria-label={label} onKeyDown={(event) => {
      if (event.isDefaultPrevented() || event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return;
      event.preventDefault();
      if (!event.nativeEvent.isComposing) onSave();
    }}>
      <div className="section-header">
        <h3>{label}</h3>
        <button type="button" className="icon-button" aria-label="Đóng" onClick={requestClose}><X size={16} aria-hidden="true" /></button>
      </div>
      {discarding && dirty ? <div className="state-message warning" role="alert">
        <p>Hủy các thay đổi chưa lưu trong biểu mẫu này?</p>
        <div className="button-row">
          <button type="button" className="button" onClick={() => setDiscarding(false)}>Tiếp tục chỉnh sửa</button>
          <button type="button" className="button danger" onClick={onClose}>Bỏ thay đổi</button>
        </div>
      </div> : null}
      {children}
      <p className="field-hint">Lưu chỉ cập nhật bản nháp; bấm &quot;{commitLabel}&quot; để lưu chính thức.</p>
      <div className="button-row">
        <button type="button" className="button primary" onClick={onSave}>Lưu</button>
        <button type="button" className="button" onClick={requestClose}>Hủy</button>
      </div>
    </div>
  </Dialog>;
}

export function CvDeleteDialog({ label, text, onCancel, onConfirm }: { label: string; text: string; onCancel: () => void; onConfirm: () => void }) {
  return <Dialog className="form-dialog cv-cropper-dialog" label={label} aria-describedby="cv-delete-text" onClose={onCancel}>
    <div className="section-card">
      <h3>{label}?</h3>
      <p id="cv-delete-text">{text}</p>
      <div className="button-row">
        <button type="button" className="button" onClick={onCancel}>Hủy</button>
        <button type="button" className="button danger" onClick={onConfirm}>Xóa</button>
      </div>
    </div>
  </Dialog>;
}

type CvRowTableProps<Row extends object> = {
  name: string;
  title: string;
  /** h4 when the table sits under another heading inside the same section. */
  heading?: "h3" | "h4";
  hint?: string;
  rows: Row[];
  columns: CvRowColumn<Row>[];
  onChange: (rows: Row[]) => void;
  newRow: () => NoInfer<Row>;
  editable: boolean;
  error?: string;
  canDelete?: (row: Row) => boolean;
  /** Cross-field rules; returns messages keyed by field. */
  validate?: (row: Row) => Partial<Record<keyof Row & string, string>>;
  addLabel?: string;
  emptyMessage?: string;
  commitLabel?: string;
};

export function CvRowTable<Row extends object>({ name, title, heading: Heading = "h3", hint, rows, columns, onChange, newRow, editable, error, canDelete = () => true, validate, addLabel = "Thêm dòng", emptyMessage = "Chưa có dữ liệu.", commitLabel = "Lưu lý lịch khoa học" }: CvRowTableProps<Row>) {
  const [drawer, setDrawer] = useState<{ index: number | null; initial: Form } | null>(null);
  const [form, setForm] = useState<Form>({});
  const [errors, setErrors] = useState<Form>({});
  const [deleting, setDeleting] = useState<number | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const tableColumns = columns.filter((column) => column.table !== false);
  const id = (key: string) => `cv-${name}-${key}`;
  const summary = (row: Row) => String(row[columns[0].key] ?? "") || "—";

  function open(index: number | null) {
    const initial = formOf(columns, index === null ? newRow() : rows[index]);
    setForm(initial);
    setErrors({});
    setDrawer({ index, initial });
  }

  function save() {
    if (!drawer) return;
    // Only fields the user changed are written, so an unchanged save leaves the row (and hidden fields) identical.
    const changed: Record<string, string | number | null> = {};
    for (const column of columns) {
      if (form[column.key] === drawer.initial[column.key]) continue;
      const value = column.type === "url" ? withScheme(form[column.key]) : form[column.key].trim();
      changed[column.key] = value === "" ? null : column.type === "number" ? Number(value) : value;
    }
    const row = { ...(drawer.index === null ? newRow() : rows[drawer.index]), ...changed } as Row;
    const next: Form = {};
    for (const column of columns) {
      const value = row[column.key] == null ? "" : column.type === "url" ? withScheme(String(row[column.key])) : String(row[column.key]).trim();
      if (column.required && !value) next[column.key] = `Cần ${column.options ? "chọn" : "nhập"} ${column.label.replace(/ \*$/, "")}.`;
      else if (column.maxLength && value.length > column.maxLength) next[column.key] = `Tối đa ${column.maxLength} ký tự.`;
      else if (column.type === "url" && value && !SAFE_LINK.test(value)) next[column.key] = "Đường dẫn phải bắt đầu bằng http://, https:// hoặc /.";
      else if (column.type === "number" && !column.options && value && (!Number.isInteger(Number(value)) || (column.min !== undefined && Number(value) < column.min) || (column.max !== undefined && Number(value) > column.max))) next[column.key] = column.min !== undefined && column.max !== undefined ? `Nhập số nguyên từ ${column.min} đến ${column.max}.` : "Nhập số nguyên hợp lệ.";
    }
    for (const [key, message] of Object.entries(validate?.(row) ?? {})) if (message && !next[key]) next[key] = message as string;
    const firstInvalid = columns.find((column) => next[column.key]);
    if (firstInvalid) { setErrors(next); document.getElementById(id(firstInvalid.key))?.focus(); return; }
    onChange(drawer.index === null ? [...rows, row] : rows.map((item, index) => index === drawer.index ? row : item));
    setDrawer(null);
  }

  function set(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => { if (!current[key]) return current; const next = { ...current }; delete next[key]; return next; });
  }

  function field(column: CvRowColumn<Row>) {
    const fieldId = id(column.key);
    const props = { id: fieldId, value: form[column.key] ?? "", "aria-required": column.required || undefined, "aria-invalid": !!errors[column.key], "aria-describedby": errors[column.key] ? `${fieldId}-error` : undefined };
    const initial = drawer?.initial[column.key] ?? "";
    // A saved value outside the option list (legacy data) stays selectable.
    const options = column.options && initial && !column.options.some((option) => option.value === initial) ? [...column.options, { value: initial, label: initial }] : column.options;
    return <div className="field" key={column.key}>
      <label htmlFor={fieldId}>{column.label}</label>
      {options ? <select {...props} onChange={(event) => set(column.key, event.target.value)}><option value="" disabled={column.required}>Chọn</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        : column.type === "textarea" ? <textarea {...props} rows={3} maxLength={column.maxLength} placeholder={column.placeholder} onChange={(event) => set(column.key, event.target.value)} />
          : <input {...props} type={column.type === "url" ? "url" : column.type ?? "text"} inputMode={column.type === "url" ? "url" : undefined} min={column.min} max={column.max} maxLength={column.maxLength} placeholder={column.placeholder} onChange={(event) => set(column.key, event.target.value)} />}
      {errors[column.key] ? <small id={`${fieldId}-error`} className="field-error" role="alert">{errors[column.key]}</small> : null}
    </div>;
  }

  function cell(column: CvRowColumn<Row>, row: Row) {
    if (column.cell) return column.cell(row);
    const value = String(row[column.key] ?? "");
    if (column.type === "url") return value && SAFE_LINK.test(value) ? <a href={value} target="_blank" rel="noopener noreferrer">Xem</a> : value || "—";
    return column.options?.find((option) => option.value === value)?.label ?? (value || "—");
  }

  return <>
    <div className="section-header">
      <Heading>{title}</Heading>
      {editable ? <button type="button" ref={addButton} className="button primary" onClick={() => open(null)}><Plus size={16} aria-hidden="true" />{addLabel}</button> : null}
    </div>
    {hint ? <p className="field-hint">{hint}</p> : null}
    {error ? <small className="field-error" role="alert">{error}</small> : null}
    <div className="table-wrap" tabIndex={0} role="region" aria-label={title}>
      <table className="data-table">
        <thead><tr>{tableColumns.map((column) => <th key={column.key}>{column.header ?? column.label.replace(/ \*$/, "")}</th>)}{editable ? <th>Thao tác</th> : null}</tr></thead>
        <tbody>{rows.length ? rows.map((row, index) => <tr key={index}>
          {tableColumns.map((column) => <td key={column.key}>{cell(column, row)}</td>)}
          {editable ? <td><div className="button-row">
            <button type="button" className="icon-button" aria-label={`Sửa dòng ${index + 1}: ${summary(row)}`} onClick={() => open(index)}><Pencil size={16} aria-hidden="true" /></button>
            {canDelete(row) ? <button type="button" className="icon-button" aria-label={`Xóa dòng ${index + 1}: ${summary(row)}`} onClick={() => setDeleting(index)}><Trash2 size={16} aria-hidden="true" /></button> : null}
          </div></td> : null}
        </tr>) : <tr><td colSpan={tableColumns.length + (editable ? 1 : 0)}>{emptyMessage}</td></tr>}</tbody>
      </table>
    </div>

    {editable && drawer ? <CvDrawer label={drawer.index === null ? addLabel : `Sửa dòng ${drawer.index + 1} — ${title}`} dirty={columns.some((column) => form[column.key] !== drawer.initial[column.key])} onSave={save} onClose={() => setDrawer(null)} commitLabel={commitLabel}>
      {columns.map(field)}
    </CvDrawer> : null}

    {editable && deleting !== null && rows[deleting] ? <CvDeleteDialog label="Xóa dòng" text={`"${summary(rows[deleting])}" sẽ bị xóa khỏi danh sách; thay đổi được lưu khi bạn bấm "${commitLabel}".`} onCancel={() => setDeleting(null)}
      onConfirm={() => { onChange(rows.filter((_, index) => index !== deleting)); setDeleting(null); setTimeout(() => addButton.current?.focus()); }} /> : null}
  </>;
}
