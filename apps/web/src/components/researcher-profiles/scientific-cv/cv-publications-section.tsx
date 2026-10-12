"use client";

import { useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { CvDeleteDialog, CvDrawer, SAFE_LINK, withScheme } from "./cv-row-table";
import type { Publication } from "@/lib/researcher-profiles-api";

type CvPublicationsSectionProps = {
  rows: Publication[];
  editable: boolean;
  error?: string;
  onChange: (rows: Publication[]) => void;
};

type Form = { title: string; publicationType: string; year: string; venue: string; authors: string[]; authorInput: string; issnIsbn: string; doi: string; classification: string; proofUrl: string; notes: string };
type Drawer = { index: number | null; initial: string };

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1949 }, (_, index) => String(currentYear - index));
const types = ["Bài báo khoa học", "Báo cáo hội nghị", "Sách/Chuyên khảo", "Khác"];
const classifications = ["ISI/Scopus", "Quốc tế khác", "Trong nước (HĐGSNN)", "Báo cáo hội nghị", "Sách/Chuyên khảo", "Khác"];

// Legacy values were free text: split on commas/semicolons for display and editing.
const splitAuthors = (value: string | null | undefined) => (value ?? "").split(/[,;]/).map((name) => name.trim()).filter(Boolean);
const sameName = (a: string, b: string) => a.toLocaleLowerCase("vi") === b.toLocaleLowerCase("vi");

// Commits typed text as authors, ignoring blanks and duplicates.
function addAuthors(authors: string[], text: string) {
  const result = [...authors];
  for (const name of splitAuthors(text)) if (!result.some((item) => sameName(item, name))) result.push(name);
  return result;
}

const formOf = (row?: Publication): Form => ({
  title: row?.title ?? "", publicationType: row ? row.publicationType ?? "" : types[0], year: row?.publicationYear ? String(row.publicationYear) : "", venue: row?.venue ?? "",
  authors: addAuthors([], row?.authors ?? ""), authorInput: "", issnIsbn: row?.issnIsbn ?? "", doi: row?.doi ?? "", classification: row ? row.classification ?? "" : "Trong nước (HĐGSNN)", proofUrl: row?.proofUrl ?? "", notes: row?.notes ?? ""
});

// null (not undefined) so an unchanged round-trip equals the server row and the CV save still sends only real changes.
const orNull = (value: string) => value.trim() || null;

function doiHref(doi: string) {
  const value = doi.trim();
  if (/^https?:\/\//i.test(value)) return value;
  return /^10\.\S+$/.test(value) ? `https://doi.org/${value}` : null;
}

function SelectField({ id, label, value, options, disabled, onChange }: { id: string; label: string; value: string; options: string[]; disabled?: boolean; onChange: (value: string) => void }) {
  // A saved value outside the option list (legacy data) stays selectable.
  const all = value && !options.includes(value) ? [...options, value] : options;
  return <div className="field"><label htmlFor={id}>{label}</label>
    <select id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}><option value="">Chọn</option>{all.map((option) => <option key={option} value={option}>{option}</option>)}</select>
  </div>;
}

export function CvPublicationsSection({ rows, editable, error, onChange }: CvPublicationsSectionProps) {
  const [drawer, setDrawer] = useState<Drawer | null>(null);
  const [form, setForm] = useState<Form>(formOf());
  const [titleError, setTitleError] = useState("");
  const [proofError, setProofError] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => { setForm((current) => ({ ...current, [key]: value })); if (key === "title") setTitleError(""); if (key === "proofUrl") setProofError(""); };
  const open = (index: number | null) => { const next = formOf(index === null ? undefined : rows[index]); setForm(next); setTitleError(""); setProofError(""); setDrawer({ index, initial: JSON.stringify(next) }); };
  const commitAuthors = () => setForm((current) => ({ ...current, authors: addAuthors(current.authors, current.authorInput), authorInput: "" }));
  const typeAuthors = (value: string) => {
    if (!value.includes(",")) return set("authorInput", value);
    const parts = value.split(",");
    setForm((current) => ({ ...current, authors: addAuthors(current.authors, parts.slice(0, -1).join(",")), authorInput: parts.at(-1) ?? "" }));
  };

  function submit() {
    if (!drawer) return;
    if (!form.title.trim()) { setTitleError("Cần nhập Tên công bố."); titleInput.current?.focus(); return; }
    const proofUrl = withScheme(form.proofUrl);
    if (proofUrl && !SAFE_LINK.test(proofUrl)) { setProofError("Đường dẫn phải bắt đầu bằng http://, https:// hoặc /."); document.getElementById("cv-pub-proof")?.focus(); return; }
    const authors = addAuthors(form.authors, form.authorInput);
    const saved: Publication = {
      ...(drawer.index === null ? { status: "ACTIVE" as const } : rows[drawer.index]),
      title: form.title.trim(), publicationType: orNull(form.publicationType), publicationYear: form.year ? Number(form.year) : null, venue: orNull(form.venue),
      authors: authors.join(", ") || null, issnIsbn: orNull(form.issnIsbn), doi: orNull(form.doi), classification: orNull(form.classification), proofUrl: orNull(proofUrl), notes: orNull(form.notes)
    };
    onChange(drawer.index === null ? [...rows, saved] : rows.map((row, index) => index === drawer.index ? saved : row));
    setDrawer(null);
  }

  return <section className="section-card">
    <div className="section-header">
      <h3>Công bố khoa học</h3>
      {editable ? <button type="button" ref={addButton} className="button primary" onClick={() => open(null)}><Plus size={16} aria-hidden="true" />Thêm công bố</button> : null}
    </div>
    {error ? <small className="field-error" role="alert">{error}</small> : null}
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Danh sách công bố khoa học">
      <table className="data-table">
        <thead><tr><th>Tên công bố</th><th>Tác giả</th><th>Năm</th><th>Loại</th><th>Tạp chí/Hội nghị</th><th>DOI</th><th>Minh chứng</th>{editable ? <th>Thao tác</th> : null}</tr></thead>
        <tbody>{rows.length ? rows.map((row, index) => {
          const href = row.doi ? doiHref(row.doi) : null;
          return <tr key={row.id ?? index}>
            <td>{row.title}</td>
            <td>{splitAuthors(row.authors).length ? <div className="multi-select-chips">{splitAuthors(row.authors).map((name, position) => <span key={position} className="multi-select-chip">{name}</span>)}</div> : "—"}</td>
            <td>{row.publicationYear ?? "—"}</td>
            <td>{row.publicationType || "—"}</td>
            <td>{row.venue || "—"}</td>
            <td>{href ? <a href={href} target="_blank" rel="noopener noreferrer">{row.doi}</a> : row.doi || "—"}</td>
            <td>{row.proofUrl && SAFE_LINK.test(row.proofUrl) ? <a href={row.proofUrl} target="_blank" rel="noopener noreferrer">Xem</a> : row.proofUrl || "—"}</td>
            {editable ? <td><div className="button-row">
              <button type="button" className="icon-button" aria-label={`Sửa công bố ${index + 1}: ${row.title}`} onClick={() => open(index)}><Pencil size={16} aria-hidden="true" /></button>
              <button type="button" className="icon-button" aria-label={`Xóa công bố ${index + 1}: ${row.title}`} onClick={() => setDeleting(index)}><Trash2 size={16} aria-hidden="true" /></button>
            </div></td> : null}
          </tr>;
        }) : <tr><td colSpan={editable ? 8 : 7}>Chưa có công bố khoa học.</td></tr>}</tbody>
      </table>
    </div>

    {drawer ? <CvDrawer label={drawer.index === null ? "Thêm công bố khoa học" : "Sửa công bố khoa học"} dirty={JSON.stringify(form) !== drawer.initial} onSave={submit} onClose={() => setDrawer(null)}>
        <div className="field">
          <label htmlFor="cv-pub-title">Tên công bố *</label>
          <input id="cv-pub-title" maxLength={1000} ref={titleInput} value={form.title} aria-required="true" aria-invalid={!!titleError} aria-describedby={titleError ? "cv-pub-title-error" : undefined} onChange={(event) => set("title", event.target.value)} />
          {titleError ? <small id="cv-pub-title-error" className="field-error" role="alert">{titleError}</small> : null}
        </div>
        <div className="form-grid two">
          <SelectField id="cv-pub-type" label="Loại công bố" value={form.publicationType} options={types} onChange={(value) => set("publicationType", value)} />
          <SelectField id="cv-pub-year" label="Năm công bố" value={form.year} options={form.year && !years.includes(form.year) ? [...years, form.year] : years} onChange={(value) => set("year", value)} />
        </div>
        <div className="field">
          <label htmlFor="cv-pub-venue">Tạp chí/Hội nghị/NXB</label>
          <input id="cv-pub-venue" maxLength={1000} value={form.venue} onChange={(event) => set("venue", event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cv-pub-authors">Tác giả</label>
          <div className="multi-select-control">
            {form.authors.length ? <div className="multi-select-chips" aria-label="Tác giả đã nhập">{form.authors.map((name) => <button key={name} type="button" className="multi-select-chip" aria-label={`Bỏ tác giả ${name}`} onClick={() => set("authors", form.authors.filter((item) => item !== name))}>{name}<span aria-hidden="true">×</span></button>)}</div> : null}
            <input id="cv-pub-authors" maxLength={1000} value={form.authorInput} placeholder="Nhập tên rồi nhấn dấu phẩy hoặc Enter" aria-describedby="cv-pub-authors-hint"
              onChange={(event) => typeAuthors(event.target.value)} onBlur={commitAuthors}
              onKeyDown={(event) => {
                if (event.key === "Enter") { event.preventDefault(); if (!event.nativeEvent.isComposing) commitAuthors(); }
                else if (event.key === "Backspace" && !event.nativeEvent.isComposing && !form.authorInput && form.authors.length) set("authors", form.authors.slice(0, -1));
              }} />
          </div>
          <small id="cv-pub-authors-hint" className="field-hint">Mỗi tác giả một thẻ. Nhấn × hoặc Backspace để bỏ.</small>
        </div>
        <div className="form-grid two">
          <div className="field"><label htmlFor="cv-pub-issn">ISSN/ISBN</label><input id="cv-pub-issn" maxLength={1000} value={form.issnIsbn} onChange={(event) => set("issnIsbn", event.target.value)} /></div>
          <div className="field"><label htmlFor="cv-pub-doi">DOI</label><input id="cv-pub-doi" maxLength={1000} value={form.doi} onChange={(event) => set("doi", event.target.value)} /></div>
        </div>
        <SelectField id="cv-pub-class" label="Phân loại" value={form.classification} options={classifications} onChange={(value) => set("classification", value)} />
        <div className="field">
          <label htmlFor="cv-pub-proof">Minh chứng (đường dẫn)</label>
          <input id="cv-pub-proof" type="url" inputMode="url" maxLength={1000} value={form.proofUrl} aria-invalid={!!proofError} aria-describedby={proofError ? "cv-pub-proof-hint cv-pub-proof-error" : "cv-pub-proof-hint"} onChange={(event) => set("proofUrl", event.target.value)} />
          <small id="cv-pub-proof-hint" className="field-hint">Liên kết tới minh chứng; tải tệp lên chưa được hỗ trợ.</small>
          {proofError ? <small id="cv-pub-proof-error" className="field-error" role="alert">{proofError}</small> : null}
        </div>
        <div className="field"><label htmlFor="cv-pub-notes">Ghi chú</label><textarea id="cv-pub-notes" maxLength={4000} rows={3} value={form.notes} onChange={(event) => set("notes", event.target.value)} /></div>
    </CvDrawer> : null}

    {deleting !== null && rows[deleting] ? <CvDeleteDialog label="Xóa công bố" text={`"${rows[deleting].title}" sẽ bị xóa khỏi danh sách và bị xóa hẳn khi bạn lưu lý lịch khoa học.`} onCancel={() => setDeleting(null)}
      onConfirm={() => { onChange(rows.filter((_, index) => index !== deleting)); setDeleting(null); setTimeout(() => addButton.current?.focus()); }} /> : null}
  </section>;
}
