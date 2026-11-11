"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import {
  ACCEPTANCE_FILE_LABELS, ACCEPTANCE_MINUTES, ACCEPTANCE_SECTION_LABELS, acceptanceDossierStatusLabel, createAcceptanceDossier, deleteEthicsFile, ethicsCan, ethicsDenial,
  getAcceptanceDossier, milestoneStatusLabel, projectFileUrl, projectStatusLabel, saveAcceptanceSection, submitAcceptanceDossier, uploadAcceptanceFile,
  type AcceptanceDossierView, type AcceptanceMissing, type AcceptanceSectionKey, type AcceptanceSections
} from "@/lib/projects-api";

const FILE_PURPOSES = ["ACCEPTANCE_FINAL_REPORT", "ACCEPTANCE_PRODUCT_EVIDENCE", "ACCEPTANCE_OTHER", "ACCEPTANCE_CONTRIBUTION"];

function date(value?: string | null) { return value ? new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC" }).format(new Date(value)) : "Chưa có"; }
function message(error: unknown) { return error instanceof Error ? error.message : "Không thể hoàn tất thao tác."; }

export function AcceptanceDossierWorkspace({ projectId }: { projectId: string }) {
  const [view, setView] = useState<AcceptanceDossierView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [missing, setMissing] = useState<AcceptanceMissing | null>(null);
  const [drafts, setDraftState] = useState<AcceptanceSections | null>(null);
  // Cards with unsaved edits; every other card mirrors the latest server view.
  const [dirty, setDirty] = useState<Set<AcceptanceSectionKey>>(new Set());
  const dossier = view?.dossier ?? null;
  const setNoticeText = (text: string, error = true) => setNotice(text ? { text, error } : null);
  function setDrafts(next: AcceptanceSections) {
    if (drafts) setDirty((current) => new Set([...current, ...(Object.keys(next) as AcceptanceSectionKey[]).filter((key) => next[key] !== drafts[key])]));
    setDraftState(next);
  }

  async function refresh() {
    setLoading(true);
    try { setView(await getAcceptanceDossier(projectId)); setNotice(null); setMissing(null); }
    catch (error) { setNoticeText(message(error)); setView(null); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [projectId]);
  // Reseed every clean card from each new view so other editors' saves show up; dirty cards keep local edits.
  useEffect(() => {
    if (!dossier) { setDraftState(null); return; }
    setDraftState((current) => {
      const next = structuredClone(dossier.sections);
      if (!current) return next;
      for (const key of dirty) (next as Record<string, unknown>)[key] = current[key];
      return next;
    });
  }, [view]);

  async function act(task: () => Promise<AcceptanceDossierView | void>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true); setNotice(null); setMissing(null);
    try {
      const next = await task();
      // File operations return no dossier view but bump the project version, so re-read it.
      if (next) setView(next); else setView(await getAcceptanceDossier(projectId));
    } catch (error) {
      const body = (error as { body?: Partial<AcceptanceMissing> & { code?: string } }).body;
      if (body?.code === "READINESS_INCOMPLETE") setMissing({ missingSections: body.missingSections ?? [], missingMilestoneNotes: body.missingMilestoneNotes ?? [], missingFiles: body.missingFiles ?? [], openRequests: body.openRequests ?? [], pendingReports: body.pendingReports ?? [] });
      setNoticeText(body?.code === "CONTEXT_VERSION_MISMATCH" ? "Hồ sơ vừa được người khác cập nhật. Bấm \"Tải lại\" để xem bản mới (phần bạn đang sửa dở vẫn được giữ) rồi thao tác lại." : message(error));
    } finally { setBusy(false); }
  }

  async function saveSection<K extends AcceptanceSectionKey>(section: K) {
    if (!view || !drafts) return;
    const value = drafts[section];
    await act(async () => {
      const next = await saveAcceptanceSection(projectId, section, value, view.contextVersion);
      // The saved card is clean again, so the view effect reseeds it from the server.
      setDirty((current) => { const left = new Set(current); left.delete(section); return left; });
      setNoticeText(`Đã lưu ${ACCEPTANCE_SECTION_LABELS[section]}.`, false);
      return next;
    });
  }

  if (loading && !view) return <p>Đang tải hồ sơ nghiệm thu…</p>;
  if (!view) return <div><p role="alert">{notice?.text || "Không có quyền xem hồ sơ nghiệm thu."}</p><button className="button" onClick={() => void refresh()}>Thử lại</button></div>;

  const back = <div className="button-row"><Link className="button" href={`/projects/${projectId}`}>Quay lại đề tài</Link><button className="button" type="button" disabled={busy || loading} onClick={() => void refresh()}>Tải lại</button></div>;
  const status = notice ? <p role={notice.error ? "alert" : "status"} className={notice.error ? "form-error" : undefined}>{notice.text}</p> : null;

  if (!dossier) {
    const canCreate = ethicsCan(view, "acceptance-dossier.create");
    return <div className="form-section-inline">{status}{back}<SectionCard title="Hồ sơ nghiệm thu" subtitle={`Đề tài: ${projectStatusLabel(view.projectStatus)}`}><p>Đề tài chưa có hồ sơ nghiệm thu.</p><button className="button primary" disabled={busy || !canCreate} onClick={() => void act(() => createAcceptanceDossier(projectId, view.contextVersion), "Tạo hồ sơ nghiệm thu cho đề tài này?")}>Tạo hồ sơ nghiệm thu</button>{!canCreate ? <p>{ethicsDenial(view, "acceptance-dossier.create")}</p> : null}</SectionCard></div>;
  }

  const draft = dossier.status === "draft";
  const editable = !dossier.readOnly && !!drafts;
  // Theo readOnly của server, không theo `drafts` (còn null ở lượt render đầu) để PI không bị coi là người đóng góp.
  const contributor = draft && dossier.readOnly && ethicsCan(view, "acceptance-dossier.contribute");
  const uploadable = (purpose: string) => !dossier.readOnly || (contributor && purpose === "ACCEPTANCE_CONTRIBUTION");
  const sections = dossier.sections;
  const milestoneTitle = new Map(dossier.milestones.map((row) => [row.milestoneId, row.title]));
  const canSubmit = ethicsCan(view, "acceptance-dossier.submit");
  const saveButton = (section: AcceptanceSectionKey, blocked = false) => <div className="button-row"><button className="button primary" type="button" disabled={busy || blocked} onClick={() => void saveSection(section)}>Lưu mục</button></div>;
  const readText = (value: string) => <p>{value.trim() || "Chưa nhập."}</p>;
  const missingList = (lists: AcceptanceMissing) => <>
    {lists.missingSections.length ? <><p>Mục còn thiếu:</p><ul>{lists.missingSections.map((key) => <li key={key}>{ACCEPTANCE_SECTION_LABELS[key] ?? key}</li>)}</ul></> : null}
    {lists.missingMilestoneNotes.length ? <><p>Mốc chưa hoàn thành cần giải trình:</p><ul>{lists.missingMilestoneNotes.map((id) => <li key={id}>{milestoneTitle.get(id) ?? id}</li>)}</ul></> : null}
    {lists.missingFiles.length ? <><p>Tệp bắt buộc còn thiếu:</p><ul>{lists.missingFiles.map((code) => <li key={code}>{ACCEPTANCE_FILE_LABELS[code] ?? code}</li>)}</ul></> : null}
    {lists.openRequests.length ? <p>Còn {lists.openRequests.length} yêu cầu điều chỉnh/gia hạn chưa kết thúc. Xử lý hoặc rút yêu cầu tại <Link href={`/projects/${projectId}`}>trang đề tài</Link>.</p> : null}
    {lists.pendingReports.length ? <p>Còn {lists.pendingReports.length} báo cáo tiến độ đang chờ chuyên viên xem xét.</p> : null}
  </>;
  const textCard = (key: "results" | "summary") => <SectionCard title={ACCEPTANCE_SECTION_LABELS[key]}>{editable ? <><label className="field"><span>Nội dung</span><textarea value={drafts[key]} onChange={(event) => setDrafts({ ...drafts, [key]: event.target.value })} /></label>{saveButton(key)}</> : readText(sections[key])}</SectionCard>;
  const products = drafts?.products ?? [];
  const blankProduct = products.some((row) => !row.name.trim());
  const setProduct = (index: number, field: "name" | "type" | "description", value: string) => drafts && setDrafts({ ...drafts, products: products.map((row, at) => at === index ? { ...row, [field]: value } : row) });

  return <div className="form-section-inline">
    {status}
    {back}
    <SectionCard title="Hồ sơ nghiệm thu" subtitle={`Trạng thái: ${acceptanceDossierStatusLabel(dossier.status)} · phiên bản ${dossier.version} · đề tài: ${projectStatusLabel(view.projectStatus)}`}>
      <p>Một hồ sơ dùng chung cho nghiệm thu sản phẩm, nghiệm thu cơ sở và cấp trên.</p>
      {dossier.submittedAt ? <p>Ngày nộp: {date(dossier.submittedAt)}{dossier.submittedBy ? ` · Người nộp: ${dossier.submittedBy.displayName}` : ""}</p> : null}
      {contributor ? <p>Bạn chỉ được đóng góp tệp vào mục &quot;{ACCEPTANCE_FILE_LABELS.ACCEPTANCE_CONTRIBUTION}&quot;. Chủ nhiệm soạn các mục và nộp hồ sơ.</p> : null}
      {draft && dossier.readOnly && !contributor ? <p>Bạn chỉ được xem hồ sơ này. {ethicsDenial(view, "acceptance-dossier.edit")}</p> : null}
    </SectionCard>

    {textCard("results")}

    <SectionCard title={ACCEPTANCE_SECTION_LABELS.products}>
      {editable ? <>
        {products.map((row, index) => <div className="form-grid two" key={index}>
          <label className="field"><span>Tên sản phẩm</span><input value={row.name} onChange={(event) => setProduct(index, "name", event.target.value)} /></label>
          <label className="field"><span>Loại</span><input value={row.type} onChange={(event) => setProduct(index, "type", event.target.value)} /></label>
          <label className="field"><span>Mô tả</span><textarea value={row.description} onChange={(event) => setProduct(index, "description", event.target.value)} /></label>
          <div className="button-row"><button className="button" type="button" disabled={busy} onClick={() => setDrafts({ ...drafts, products: products.filter((_, at) => at !== index) })}>Bỏ sản phẩm</button></div>
        </div>)}
        {!products.length ? <p>Chưa có sản phẩm.</p> : null}
        <div className="button-row"><button className="button" type="button" disabled={busy} onClick={() => setDrafts({ ...drafts, products: [...products, { name: "", type: "", description: "" }] })}>Thêm sản phẩm</button></div>
        {blankProduct ? <p>Mỗi sản phẩm cần có tên trước khi lưu.</p> : null}
        {saveButton("products", blankProduct)}
      </> : sections.products.length ? <table><thead><tr><th>Tên sản phẩm</th><th>Loại</th><th>Mô tả</th></tr></thead><tbody>{sections.products.map((row, index) => <tr key={index}><td>{row.name}</td><td>{row.type || "—"}</td><td>{row.description || "—"}</td></tr>)}</tbody></table> : <p>Chưa có sản phẩm.</p>}
    </SectionCard>

    {textCard("summary")}

    <SectionCard title={ACCEPTANCE_SECTION_LABELS.milestoneNotes} subtitle="Đối chiếu mốc do hệ thống tính từ kế hoạch đề tài.">
      {!dossier.milestones.length ? <p>Đề tài chưa có mốc.</p> : <table><thead><tr><th>Mốc</th><th>Hạn</th><th>Trạng thái</th><th>Giải trình</th></tr></thead><tbody>{dossier.milestones.map((row) => <tr key={row.milestoneId}>
        <td>{row.title}</td><td>{date(row.dueDate)}</td><td>{milestoneStatusLabel(row.status)}</td>
        <td>{row.status === "completed" ? "Không cần" : editable ? <textarea aria-label={`Giải trình mốc ${row.title}`} value={drafts.milestoneNotes[row.milestoneId] ?? ""} onChange={(event) => setDrafts({ ...drafts, milestoneNotes: { ...drafts.milestoneNotes, [row.milestoneId]: event.target.value } })} /> : (row.note?.trim() || "Chưa giải trình")}</td>
      </tr>)}</tbody></table>}
      {editable && dossier.milestones.some((row) => row.status !== "completed") ? saveButton("milestoneNotes") : null}
    </SectionCard>

    <SectionCard title="Tệp đính kèm">
      {dossier.readiness.missingFiles.length ? <><p>Tệp bắt buộc còn thiếu:</p><ul>{dossier.readiness.missingFiles.map((code) => <li key={code}>{ACCEPTANCE_FILE_LABELS[code] ?? code}</li>)}</ul></> : <p>Đã đủ tệp bắt buộc.</p>}
      {dossier.files.some((file) => file.filePurpose === ACCEPTANCE_MINUTES) ? <div><h3>{ACCEPTANCE_FILE_LABELS[ACCEPTANCE_MINUTES]}</h3><ul>{dossier.files.filter((file) => file.filePurpose === ACCEPTANCE_MINUTES).map((file) => <li key={file.id}><a href={projectFileUrl(file.id)}>{file.fileName}</a> · {date(file.createdAt)}</li>)}</ul></div> : null}
      {FILE_PURPOSES.map((purpose) => {
        const files = dossier.files.filter((file) => file.filePurpose === purpose);
        return <div key={purpose}><h3>{ACCEPTANCE_FILE_LABELS[purpose]}</h3>
          {files.length ? <ul>{files.map((file) => <li key={file.id}><a href={projectFileUrl(file.id)}>{file.fileName}</a> · {date(file.createdAt)}{file.canDelete ? <> <button className="button" type="button" disabled={busy} onClick={() => void act(() => deleteEthicsFile(file.id, view.contextVersion), `Xóa tệp ${file.fileName}?`)}>Xóa</button></> : null}</li>)}</ul> : <p>Chưa có tệp.</p>}
          {uploadable(purpose) ? <label className="field"><span>Tải lên: {ACCEPTANCE_FILE_LABELS[purpose].toLowerCase()}</span><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void act(async () => { await uploadAcceptanceFile(dossier.id, file, purpose, view.contextVersion); }); }} /></label> : null}
        </div>;
      })}
    </SectionCard>

    {draft ? <SectionCard title="Nộp hồ sơ">
      {dossier.readiness.ready ? <p>Hồ sơ đã đủ điều kiện nộp.</p> : <><p>Hồ sơ chưa đủ điều kiện nộp.</p>{missingList(dossier.readiness)}</>}
      {missing ? <div role="alert"><p>Không nộp được vì hồ sơ còn thiếu:</p>{missingList(missing)}</div> : null}
      {canSubmit ? <div className="button-row"><button className="button primary" type="button" disabled={busy} onClick={() => void act(() => submitAcceptanceDossier(projectId, view.contextVersion), "Nộp hồ sơ nghiệm thu? Sau khi nộp, hồ sơ chỉ còn chế độ xem và đề tài chuyển sang chờ nghiệm thu.")}>Nộp hồ sơ</button></div> : <p>{ethicsDenial(view, "acceptance-dossier.submit")}</p>}
    </SectionCard> : <SectionCard title="Các phiên bản đã nộp">{!dossier.submissions.length ? <p>Chưa có phiên bản đã nộp.</p> : <table><thead><tr><th>Phiên bản</th><th>Ngày nộp</th><th>Số tệp</th></tr></thead><tbody>{dossier.submissions.map((row) => <tr key={row.id}><td>Phiên bản {row.version}</td><td>{date(row.submittedAt)}</td><td>{row.snapshot.files?.length ?? 0}</td></tr>)}</tbody></table>}</SectionCard>}
  </div>;
}
