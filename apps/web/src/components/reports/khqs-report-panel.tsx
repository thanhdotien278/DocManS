"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { downloadFromApi } from "@/lib/api-download";
import {
  applyOverrides,
  emptyManualRow,
  khqsReportExcelPath,
  khqsReportFileStem,
  loadKhqsReport,
  MANUAL_COLUMNS,
  saveKhqsReport,
  type KhqsPeriod,
  type KhqsReport,
  type KhqsReportApiError,
  type KhqsReportDraft,
  type KhqsReportRow,
  type ManualColumn,
  type ManualRow,
  type ManualTables,
  type NarrativeField
} from "@/lib/khqs-report-api";
import { buildKhqsAppendixHtml, buildKhqsReportHtml } from "@/lib/khqs-report-word";
import { exportHtmlToWord } from "@/lib/word-export";

/**
 * Báo cáo kết quả công tác KHQS 6 tháng đầu năm / cả năm theo mẫu Phòng KHQS (Cục KHQS):
 * văn bản báo cáo + Biểu KQ-1, KQ-2 (tự lấy từ đề tài) + KQ-3, KQ-4, KQ-6 (nhập tay). Xuất Word và Excel.
 */

const DOCUMENT_FIELDS: Array<{ key: NarrativeField; label: string; placeholder?: string; multiline?: boolean }> = [
  { key: "documentNumber", label: "Số văn bản", placeholder: "/BC-HVQY" },
  { key: "documentPlace", label: "Địa danh", placeholder: "Hà Nội" },
  { key: "documentDate", label: "Ngày tháng năm", placeholder: "ngày … tháng … năm …" },
  { key: "recipient", label: "Kính gửi", placeholder: "Cục Khoa học quân sự." },
  {
    key: "basis",
    label: "Căn cứ / lời mở đầu",
    placeholder: "Thực hiện Công văn số …/KHQS-KH ngày … của Cục Khoa học quân sự, Học viện Quân y báo cáo …",
    multiline: true
  },
  { key: "signerTitle", label: "Chức danh người ký (mỗi dòng một dòng)", placeholder: "GIÁM ĐỐC", multiline: true },
  { key: "signerName", label: "Cấp bậc, họ tên người ký", placeholder: "Trung tướng …" },
  { key: "distribution", label: "Nơi nhận (mỗi dòng một nơi)", placeholder: "Như trên;\nĐ/c CUHV;\nLưu: VT, QLKHQS.", multiline: true }
];

type ContentField = { key: NarrativeField; label: string; hint?: string };
const CONTENT_SECTIONS: Array<{ title: string; fields: ContentField[] }> = [
  { title: "Đặc điểm tình hình", fields: [{ key: "situation", label: "* Đặc điểm tình hình" }] },
  {
    title: "I. Kết quả công tác KHQS",
    fields: [
      { key: "direction", label: "1.a) Công tác chỉ đạo, điều hành, xây dựng kế hoạch và tổ chức thực hiện" },
      { key: "management", label: "1.b) Công tác quản lý nhiệm vụ khoa học và công nghệ", hint: "Để trống thì dùng đoạn số liệu tự động." },
      { key: "potential", label: "2. Công tác xây dựng và phát triển tiềm lực KHQS" },
      { key: "environment", label: "3. Công tác bảo vệ môi trường" },
      { key: "information", label: "4. Công tác thông tin KHQS" },
      { key: "cooperation", label: "5. Hoạt động hợp tác về khoa học công nghệ" },
      { key: "youth", label: "6.a) Khoa học Công nghệ tuổi trẻ" },
      { key: "events", label: "6.b) Hội nghị, hội thảo, triển lãm" },
      { key: "strengths", label: "7.a) Đánh giá chung: Ưu điểm" },
      { key: "weaknesses", label: "7.b) Đánh giá chung: Tồn tại, hạn chế" }
    ]
  },
  {
    title: "II. Nhiệm vụ trọng tâm kỳ tới",
    fields: [
      { key: "nextResearch", label: "1. Công tác nghiên cứu KH&CN" },
      { key: "nextPotential", label: "2. Công tác xây dựng và phát triển tiềm lực KHQS" },
      { key: "nextCooperation", label: "3. Tăng cường hoạt động hợp tác và ứng dụng" }
    ]
  }
];

const MANUAL_TITLES: Record<keyof ManualTables, { code: string; title: string }> = {
  kq3: { code: "KQ-3", title: "Nhiệm vụ hợp tác quốc tế và trong nước về KH&CN" },
  kq4: { code: "KQ-4", title: "Đầu tư, sửa chữa nâng cấp phòng thí nghiệm" },
  kq6: { code: "KQ-6", title: "Biên soạn, in ấn tài liệu huấn luyện, tài liệu dạy học" }
};

const money = (value: number | null) => (value === null ? "—" : value.toLocaleString("vi-VN", { maximumFractionDigits: 3 }));
const thisYear = () => Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric" }).format(new Date()));

function toDraft(report: KhqsReport): KhqsReportDraft {
  return {
    version: report.version,
    narrative: { ...report.narrative },
    manual: { kq3: [...report.manual.kq3], kq4: [...report.manual.kq4], kq6: [...report.manual.kq6] },
    overrides: { ...report.overrides }
  };
}

function ManualCell({ column, value, disabled, onChange }: { column: ManualColumn; value: string | number | null | undefined; disabled: boolean; onChange: (next: string | number | null) => void }) {
  const label = column.label;
  if (column.type === "choice") {
    return (
      <select aria-label={label} value={String(value ?? "")} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {column.choices!.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
      </select>
    );
  }
  if (column.type === "number") {
    return <input aria-label={label} type="number" min={0} step="any" inputMode="decimal" value={value === null || value === undefined ? "" : String(value)} disabled={disabled} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} />;
  }
  if (column.type === "longtext") {
    return <textarea aria-label={label} rows={2} value={String(value ?? "")} disabled={disabled} onChange={(event) => onChange(event.target.value)} />;
  }
  return <input aria-label={label} value={String(value ?? "")} disabled={disabled} onChange={(event) => onChange(event.target.value)} />;
}

function ManualTableEditor({ table, rows, disabled, onChange }: { table: keyof ManualTables; rows: ManualRow[]; disabled: boolean; onChange: (rows: ManualRow[]) => void }) {
  const columns = MANUAL_COLUMNS[table];
  const update = (index: number, key: string, value: string | number | null) => onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  return (
    <div className="table-wrap">
      <table className="data-table khqs-grid">
        <thead>
          <tr>
            <th className="num">TT</th>
            {columns.map((column) => <th key={column.key} style={column.width ? { minWidth: column.width } : undefined}>{column.label}</th>)}
            {disabled ? null : <th aria-label="Thao tác" />}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={index}>
              <td className="num">{index + 1}</td>
              {columns.map((column) => <td key={column.key}><ManualCell column={column} value={row[column.key]} disabled={disabled} onChange={(value) => update(index, column.key, value)} /></td>)}
              {disabled ? null : (
                <td>
                  <button type="button" className="button small secondary" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))} aria-label={`Xoá dòng ${index + 1}`}>
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </td>
              )}
            </tr>
          )) : (
            <tr><td colSpan={columns.length + 2} className="chart-card-subtitle">Chưa có dòng nào. Biểu sẽ xuất với dòng trống để điền trên Word / Excel.</td></tr>
          )}
        </tbody>
      </table>
      {disabled ? null : (
        <button type="button" className="button small secondary" style={{ marginTop: 8 }} onClick={() => onChange([...rows, emptyManualRow(table)])}>
          <Plus size={14} aria-hidden="true" /> Thêm dòng
        </button>
      )}
    </div>
  );
}

function ProjectRowsTable({ rows, canEdit, overrides, onOverride, year }: { rows: KhqsReportRow[]; canEdit: boolean; overrides: KhqsReportDraft["overrides"]; onOverride: (projectId: string, key: "result" | "note", value: string | null) => void; year: number }) {
  if (!rows.length) return <p className="chart-card-subtitle">Không có đề tài nào trong kỳ.</p>;
  return (
    <div className="table-wrap">
      <table className="data-table khqs-grid">
        <thead>
          <tr>
            <th className="num">TT</th>
            <th>Tên nhiệm vụ KH&amp;CN</th>
            <th>Cơ quan chủ trì, chủ nhiệm</th>
            <th>Thời gian thực hiện</th>
            <th style={{ minWidth: 260 }}>Kết quả đã đạt được</th>
            <th className="num">Tổng KP duyệt</th>
            <th className="num">KP cấp đến năm {year - 1}</th>
            <th className="num">KP cấp năm {year}</th>
            <th style={{ minWidth: 140 }}>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.projectId}>
              <td className="num">{index + 1}</td>
              <td><a href={`/projects/${encodeURIComponent(row.projectId)}`}>{row.name}</a></td>
              <td>{row.hostAndPi}</td>
              <td>{row.period}</td>
              <td>
                {canEdit ? (
                  <>
                    <textarea aria-label={`Kết quả: ${row.name}`} rows={3} value={row.result} onChange={(event) => onOverride(row.projectId, "result", event.target.value)} />
                    {overrides[row.projectId]?.result !== undefined ? <button type="button" className="button small secondary" onClick={() => onOverride(row.projectId, "result", null)}>Dùng lại kết quả tự động</button> : null}
                  </>
                ) : row.result}
              </td>
              <td className="num">{money(row.totalBudget)}</td>
              <td className="num">{money(row.allocatedBeforeYear)}</td>
              <td className="num">{money(row.allocatedInYear)}</td>
              <td>{canEdit ? <input aria-label={`Ghi chú: ${row.name}`} value={row.note} onChange={(event) => onOverride(row.projectId, "note", event.target.value)} /> : row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function KhqsReportPanel() {
  const [year, setYear] = useState(thisYear);
  const [period, setPeriod] = useState<KhqsPeriod>(() => (new Date().getMonth() < 9 ? "H1" : "FY"));
  const [report, setReport] = useState<KhqsReport | null>(null);
  const [draft, setDraft] = useState<KhqsReportDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | "save" | "excel" | "word" | "appendix">(null);
  const [error, setError] = useState<{ message: string; stale?: boolean } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    loadKhqsReport(year, period, signal)
      .then((data) => {
        setReport(data);
        setDraft(toDraft(data));
        setDirty(false);
      })
      .catch((reason: KhqsReportApiError) => {
        if (!signal?.aborted) {
          setReport(null);
          setDraft(null);
          setError({ message: reason.message });
        }
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  }, [year, period]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const edit = (change: (current: KhqsReportDraft) => KhqsReportDraft) => {
    setDraft((current) => (current ? change(current) : current));
    setDirty(true);
    setNotice(null);
  };

  const setNarrative = (key: NarrativeField, value: string) => edit((current) => ({ ...current, narrative: { ...current.narrative, [key]: value } }));
  const setManual = (table: keyof ManualTables, rows: ManualRow[]) => edit((current) => ({ ...current, manual: { ...current.manual, [table]: rows } }));
  const setOverride = (projectId: string, key: "result" | "note", value: string | null) =>
    edit((current) => {
      const next = { ...(current.overrides[projectId] ?? {}) };
      if (value === null) delete next[key];
      else next[key] = value;
      const overrides = { ...current.overrides };
      if (next.result === undefined && next.note === undefined) delete overrides[projectId];
      else overrides[projectId] = next;
      return { ...current, overrides };
    });

  const tables = useMemo(() => {
    if (!report || !draft) return null;
    return {
      kq1: applyOverrides(report.tables.kq1, draft.overrides),
      kq2: report.tables.kq2.map((section) => ({ ...section, rows: applyOverrides(section.rows, draft.overrides) }))
    };
  }, [report, draft]);

  const save = async () => {
    if (!draft) return;
    setBusy("save");
    setError(null);
    try {
      const saved = await saveKhqsReport(year, period, draft);
      setReport(saved);
      setDraft(toDraft(saved));
      setDirty(false);
      setNotice("Đã lưu báo cáo.");
    } catch (reason) {
      const failure = reason as KhqsReportApiError;
      setError({ message: failure.message, stale: failure.status === 409 });
    } finally {
      setBusy(null);
    }
  };

  const exportExcel = async () => {
    setBusy("excel");
    setError(null);
    try {
      await downloadFromApi(khqsReportExcelPath(year, period), `${khqsReportFileStem(year, period)}.xlsx`, "Không tải được tệp Excel các biểu.");
    } catch (reason) {
      setError({ message: reason instanceof Error ? reason.message : "Không tải được tệp Excel các biểu." });
    } finally {
      setBusy(null);
    }
  };

  const exportWord = async (kind: "word" | "appendix") => {
    if (!report || !draft || !tables) return;
    setBusy(kind);
    setError(null);
    try {
      if (kind === "word") {
        await exportHtmlToWord({
          filename: khqsReportFileStem(year, period),
          title: `Báo cáo kết quả công tác KHQS ${report.periodLabel}`,
          contentHtml: buildKhqsReportHtml(report, draft)
        });
      } else {
        await exportHtmlToWord({
          filename: `${khqsReportFileStem(year, period)}_Bieu_KQ`,
          title: `Các biểu kết quả công tác KHQS ${report.periodLabel}`,
          contentHtml: buildKhqsAppendixHtml(report, draft, tables),
          orientation: "landscape"
        });
      }
    } catch {
      setError({ message: "Không tạo được tệp Word. Vui lòng thử lại." });
    } finally {
      setBusy(null);
    }
  };

  const changePeriod = (nextYear: number, nextPeriod: KhqsPeriod) => {
    if (dirty && !window.confirm("Còn phần sửa chưa lưu của kỳ đang xem. Chuyển kỳ và bỏ phần sửa đó?")) return;
    setYear(nextYear);
    setPeriod(nextPeriod);
  };

  const years = Array.from({ length: 6 }, (_, index) => thisYear() + 1 - index);
  const canEdit = report?.canEdit === true;
  const readOnly = !canEdit;

  return (
    <div className="khqs-report">
      <div className="report-action-bar no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div className="filter-bar compact" style={{ margin: 0 }}>
          <label className="filter-field">
            <span>Năm</span>
            <select value={year} onChange={(event) => changePeriod(Number(event.target.value), period)}>
              {years.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="filter-field">
            <span>Kỳ báo cáo</span>
            <select value={period} onChange={(event) => changePeriod(year, event.target.value as KhqsPeriod)}>
              <option value="H1">6 tháng đầu năm</option>
              <option value="FY">Cả năm</option>
            </select>
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="button secondary" onClick={() => { if (!dirty || window.confirm("Bỏ phần sửa chưa lưu và tải lại?")) load(); }} disabled={loading || busy !== null}>
            <RefreshCw size={15} aria-hidden="true" /> Tải lại
          </button>
          {canEdit ? (
            <button type="button" className="button primary" onClick={() => void save()} disabled={!dirty || busy !== null}>
              <Save size={15} aria-hidden="true" /> {busy === "save" ? "Đang lưu…" : "Lưu báo cáo"}
            </button>
          ) : null}
          <button type="button" className="button secondary" onClick={() => void exportWord("word")} disabled={!report || busy !== null}>
            <FileText size={15} aria-hidden="true" /> {busy === "word" ? "Đang tạo…" : "Word: văn bản báo cáo"}
          </button>
          <button type="button" className="button secondary" onClick={() => void exportWord("appendix")} disabled={!report || busy !== null}>
            <FileText size={15} aria-hidden="true" /> {busy === "appendix" ? "Đang tạo…" : "Word: các Biểu KQ"}
          </button>
          <button type="button" className="button secondary" onClick={() => void exportExcel()} disabled={!report || busy !== null || dirty} title={dirty ? "Lưu báo cáo trước khi tải Excel: tệp Excel lấy bản đã lưu" : "Mỗi biểu một sheet"}>
            <FileSpreadsheet size={15} aria-hidden="true" /> {busy === "excel" ? "Đang tạo…" : "Excel: các Biểu KQ"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="callout danger" role="alert">
          <strong>{error.stale ? "Báo cáo vừa được người khác lưu." : "Có lỗi."}</strong>
          <p>{error.message}</p>
          {error.stale ? <button type="button" className="button small" onClick={() => load()}>Tải bản mới (bỏ phần sửa của tôi)</button> : null}
        </div>
      ) : null}
      {notice ? <div className="callout" role="status"><p>{notice}</p></div> : null}
      {loading && !report ? <p className="chart-card-subtitle">Đang tải báo cáo…</p> : null}

      {report && draft && tables ? (
        <>
          <p className="chart-card-subtitle" style={{ marginBottom: 16 }}>
            Báo cáo kết quả công tác KHQS {report.periodLabel}. Biểu KQ-1, KQ-2 lấy tự động từ {report.facts.total} đề tài trong phạm vi bạn được xem; KQ-3, KQ-4, KQ-6 nhập tay. Kinh phí tính bằng triệu đồng.
            {report.updatedAt ? ` Lưu lần cuối ${new Date(report.updatedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}${report.updatedByName ? ` bởi ${report.updatedByName}` : ""}.` : " Chưa lưu lần nào."}
            {dirty ? " Có phần sửa chưa lưu." : ""}
            {readOnly ? " Bạn chỉ có quyền xem và tải báo cáo." : ""}
          </p>

          <SectionCard title="Thông tin văn bản" subtitle="Số, ngày, nơi gửi, người ký. Mục để trống sẽ là dòng chấm trên Word.">
            <div className="grid two-column">
              {DOCUMENT_FIELDS.map((field) => (
                <label key={field.key} className="field">
                  <span>{field.label}</span>
                  {field.multiline
                    ? <textarea rows={3} value={draft.narrative[field.key] ?? ""} placeholder={field.placeholder} disabled={readOnly} onChange={(event) => setNarrative(field.key, event.target.value)} />
                    : <input value={draft.narrative[field.key] ?? ""} placeholder={field.placeholder} disabled={readOnly} onChange={(event) => setNarrative(field.key, event.target.value)} />}
                </label>
              ))}
            </div>
          </SectionCard>

          {CONTENT_SECTIONS.map((section) => (
            <SectionCard key={section.title} title={section.title === "II. Nhiệm vụ trọng tâm kỳ tới" ? `II. Nhiệm vụ trọng tâm ${report.nextPeriodLabel}` : section.title}>
              <div className="admin-form">
                {section.fields.map((field) => (
                  <label key={field.key} className="field">
                    <span>{field.label}</span>
                    <textarea
                      rows={field.key === "management" ? 5 : 4}
                      value={draft.narrative[field.key] ?? ""}
                      placeholder={field.key === "management" ? report.suggestions.management : "Mỗi dòng là một đoạn văn."}
                      disabled={readOnly}
                      onChange={(event) => setNarrative(field.key, event.target.value)}
                    />
                    {field.key === "management" && canEdit ? (
                      <span style={{ fontWeight: 400 }}>
                        {field.hint}{" "}
                        <button type="button" className="button small secondary" onClick={() => setNarrative("management", report.suggestions.management)}>Chèn đoạn số liệu tự động để sửa tiếp</button>
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
            </SectionCard>
          ))}

          <SectionCard title="Biểu KQ-1. Nhiệm vụ KH&CN cấp Quốc gia" subtitle={canEdit ? "Tự lấy từ đề tài. Sửa được cột Kết quả và Ghi chú cho kỳ này; dữ liệu đề tài không đổi." : "Tự lấy từ đề tài đang theo dõi."}>
            <ProjectRowsTable rows={tables.kq1} canEdit={canEdit} overrides={draft.overrides} onOverride={setOverride} year={year} />
          </SectionCard>

          <SectionCard title="Biểu KQ-2. Nhiệm vụ KH&CN cấp Bộ, cấp cơ sở">
            {tables.kq2.map((section, index) => (
              <div key={section.key} style={{ marginBottom: 16 }}>
                <h3 className="record-title">{["I", "II", "III"][index]}. {section.title} ({section.rows.length})</h3>
                <ProjectRowsTable rows={section.rows} canEdit={canEdit} overrides={draft.overrides} onOverride={setOverride} year={year} />
              </div>
            ))}
          </SectionCard>

          {(Object.keys(MANUAL_TITLES) as Array<keyof ManualTables>).map((table) => (
            <SectionCard key={table} title={`Biểu ${MANUAL_TITLES[table].code}. ${MANUAL_TITLES[table].title}`} subtitle="Nhập tay; lưu theo kỳ báo cáo. Kinh phí: triệu đồng.">
              <ManualTableEditor table={table} rows={draft.manual[table]} disabled={readOnly} onChange={(rows) => setManual(table, rows)} />
            </SectionCard>
          ))}
        </>
      ) : null}
    </div>
  );
}
