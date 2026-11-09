"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/components/auth/session-provider";
import { SectionCard } from "@/components/ui/section-card";
import {
  ETHICS_FILE_LABELS, ETHICS_SECTION_LABELS, ETHICS_SUBJECT_LABELS, createEthicsDossier, deleteEthicsFile, ethicsCan, ethicsDenial, ethicsDossierStatusLabel,
  getEthicsDossier, projectFileUrl, saveEthicsSection, submitEthicsDossier, uploadEthicsFile,
  type EthicsDossierView, type EthicsSectionKey, type EthicsSections
} from "@/lib/projects-api";

const FILE_PURPOSES = ["ETHICS_APPLICATION", "ETHICS_PROTOCOL", "ETHICS_CONSENT", "ETHICS_DATA_TOOL", "ETHICS_OTHER"];
const TEXT_SECTIONS = ["methods", "riskBenefit"] as const;

function date(value?: string | null) { return value ? new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC" }).format(new Date(value)) : "Chưa có"; }
function message(error: unknown) { return error instanceof Error ? error.message : "Không thể hoàn tất thao tác."; }

export function EthicsDossierWorkspace({ projectId }: { projectId: string }) {
  const { account } = useSession();
  const [view, setView] = useState<EthicsDossierView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [missing, setMissing] = useState<{ sections: string[]; files: string[] } | null>(null);
  const [drafts, setDraftState] = useState<EthicsSections | null>(null);
  // Cards with unsaved edits; every other card mirrors the latest server view.
  const [dirty, setDirty] = useState<Set<EthicsSectionKey>>(new Set());
  const dossier = view?.dossier ?? null;
  const setNoticeText = (text: string, error = true) => setNotice(text ? { text, error } : null);
  function setDrafts(next: EthicsSections) {
    if (drafts) setDirty((current) => new Set([...current, ...(Object.keys(next) as EthicsSectionKey[]).filter((key) => next[key] !== drafts[key])]));
    setDraftState(next);
  }

  async function refresh() {
    setLoading(true);
    try { setView(await getEthicsDossier(projectId)); }
    catch (error) { setNoticeText(message(error)); setView(null); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [projectId]);
  // Reseed every clean card from each new view so other editors' saves show up; dirty cards keep local edits.
  // Commitment always mirrors the server because any non-PI edit resets it there.
  useEffect(() => {
    if (!dossier) { setDraftState(null); return; }
    setDraftState((current) => {
      const next = structuredClone(dossier.sections);
      if (!current) return next;
      for (const key of dirty) if (key !== "commitment") (next as Record<string, unknown>)[key] = current[key];
      return next;
    });
  }, [view]);

  async function act(task: () => Promise<EthicsDossierView | void>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true); setNotice(null); setMissing(null);
    try {
      const next = await task();
      // File operations return no dossier view but bump the project version, so re-read it.
      if (next) setView(next); else setView(await getEthicsDossier(projectId));
      return true;
    } catch (error) {
      const body = (error as { body?: { code?: string; missingSections?: string[]; missingFiles?: string[] } }).body;
      if (body?.code === "READINESS_INCOMPLETE") setMissing({ sections: body.missingSections ?? [], files: body.missingFiles ?? [] });
      setNoticeText(body?.code === "CONTEXT_VERSION_MISMATCH" ? "Hồ sơ vừa được người khác cập nhật. Bấm \"Tải lại\" để xem bản mới (phần bạn đang sửa dở vẫn được giữ) rồi thao tác lại." : message(error));
      return false;
    } finally { setBusy(false); }
  }

  async function saveSection<K extends EthicsSectionKey>(section: K) {
    if (!view || !drafts) return;
    const value = drafts[section];
    await act(async () => {
      const next = await saveEthicsSection(projectId, section, value, view.contextVersion);
      // The saved card is clean again, so the view effect reseeds it from the server.
      setDirty((current) => { const left = new Set(current); left.delete(section); return left; });
      setNoticeText(`Đã lưu ${ETHICS_SECTION_LABELS[section]}.`, false);
      return next;
    });
  }

  if (loading && !view) return <p>Đang tải hồ sơ đạo đức…</p>;
  if (!view) return <div><p role="alert">{notice?.text || "Không có quyền xem hồ sơ đạo đức."}</p><button className="button" onClick={() => void refresh()}>Thử lại</button></div>;

  const back = <div className="button-row"><Link className="button" href={`/projects/${projectId}`}>Quay lại đề tài</Link><button className="button" type="button" disabled={busy} onClick={() => void refresh()}>Tải lại</button></div>;
  const status = notice ? <p role={notice.error ? "alert" : "status"} className={notice.error ? "form-error" : undefined}>{notice.text}</p> : null;

  if (!dossier) {
    const canCreate = ethicsCan(view, "ethics-dossier.create");
    return <div className="form-section-inline">{status}{back}<SectionCard title="Hồ sơ đạo đức"><p>Đề tài chưa có hồ sơ đạo đức.</p><button className="button primary" disabled={busy || !canCreate} onClick={() => void act(() => createEthicsDossier(projectId, view.contextVersion), "Tạo hồ sơ đạo đức cho đề tài này?")}>Tạo hồ sơ đạo đức</button>{!canCreate ? <p>{ethicsDenial(view, "ethics-dossier.create")}</p> : null}</SectionCard></div>;
  }

  const editable = !dossier.readOnly && !!drafts;
  const isPi = !!account?.id && account.id === dossier.applicant?.id;
  const sections = dossier.sections;
  const saveButton = (section: EthicsSectionKey) => <div className="button-row"><button className="button primary" type="button" disabled={busy} onClick={() => void saveSection(section)}>Lưu mục</button></div>;
  const readText = (value: string) => <p>{value.trim() || "Chưa nhập."}</p>;
  const sectionList = (keys: string[]) => <ul>{keys.map((key) => <li key={key}>{ETHICS_SECTION_LABELS[key] ?? key}</li>)}</ul>;
  const fileList = (codes: string[]) => <ul>{codes.map((code) => <li key={code}>{ETHICS_FILE_LABELS[code] ?? code}</li>)}</ul>;
  const canSubmit = ethicsCan(view, "ethics-dossier.submit");

  return <div className="form-section-inline">
    {status}
    {back}
    <SectionCard title="Hồ sơ đạo đức" subtitle={`Trạng thái: ${ethicsDossierStatusLabel(dossier.status)} · phiên bản ${dossier.version}`}>
      <p>Chủ nhiệm: {dossier.applicant?.displayName ?? "Chưa có"} · Đơn vị: {dossier.hostOrganizationUnit?.name ?? "Chưa có"}</p>
      {dossier.submittedAt ? <p>Ngày nộp: {date(dossier.submittedAt)}{dossier.submittedBy ? ` · Người nộp: ${dossier.submittedBy.displayName}` : ""}</p> : null}
      {dossier.readOnly && dossier.status === "draft" ? <p>Bạn chỉ được xem hồ sơ này. {ethicsDenial(view, "ethics-dossier.edit")}</p> : null}
    </SectionCard>

    <SectionCard title={ETHICS_SECTION_LABELS.subjects}>
      {editable ? <>
        <div className="field" role="group" aria-label="Loại đối tượng"><span>Loại đối tượng</span>{Object.entries(ETHICS_SUBJECT_LABELS).map(([code, label]) => <label className="multi-select-option" key={code}><input type="checkbox" checked={drafts.subjects.types.includes(code)} onChange={(event) => setDrafts({ ...drafts, subjects: { ...drafts.subjects, types: event.target.checked ? [...drafts.subjects.types, code] : drafts.subjects.types.filter((item) => item !== code) } })} /> {label}</label>)}</div>
        <div className="form-grid two"><label className="field"><span>Cỡ mẫu (để trống nếu chưa xác định)</span><input type="number" min={1} step={1} value={drafts.subjects.sampleSize ?? ""} onChange={(event) => setDrafts({ ...drafts, subjects: { ...drafts.subjects, sampleSize: event.target.value === "" ? null : Number(event.target.value) } })} /></label></div>
        <label className="field"><span>Mô tả đối tượng</span><textarea value={drafts.subjects.description} onChange={(event) => setDrafts({ ...drafts, subjects: { ...drafts.subjects, description: event.target.value } })} /></label>
        {saveButton("subjects")}
      </> : <>
        <p>Loại đối tượng: {sections.subjects.types.map((code) => ETHICS_SUBJECT_LABELS[code] ?? code).join(", ") || "Chưa chọn"}</p>
        <p>Cỡ mẫu: {sections.subjects.sampleSize ?? "Chưa xác định"}</p>{readText(sections.subjects.description)}
      </>}
    </SectionCard>

    {TEXT_SECTIONS.map((key) => <SectionCard key={key} title={ETHICS_SECTION_LABELS[key]}>{editable ? <><label className="field"><span>Nội dung</span><textarea value={drafts[key]} onChange={(event) => setDrafts({ ...drafts, [key]: event.target.value })} /></label>{saveButton(key)}</> : readText(sections[key])}</SectionCard>)}

    <SectionCard title={ETHICS_SECTION_LABELS.consent}>
      {editable ? <>
        <label className="field"><span>Hình thức</span><select value={drafts.consent.mode} onChange={(event) => setDrafts({ ...drafts, consent: { ...drafts.consent, mode: event.target.value as "required" | "waived" } })}><option value="required">Có xin chấp thuận</option><option value="waived">Miễn chấp thuận</option></select></label>
        <label className="field"><span>Nội dung</span><textarea value={drafts.consent.text} onChange={(event) => setDrafts({ ...drafts, consent: { ...drafts.consent, text: event.target.value } })} /></label>
        {saveButton("consent")}
      </> : <><p>Hình thức: {sections.consent.mode === "waived" ? "Miễn chấp thuận" : "Có xin chấp thuận"}</p>{readText(sections.consent.text)}</>}
    </SectionCard>

    <SectionCard title={ETHICS_SECTION_LABELS.dataProtection}>{editable ? <><label className="field"><span>Nội dung</span><textarea value={drafts.dataProtection} onChange={(event) => setDrafts({ ...drafts, dataProtection: event.target.value })} /></label>{saveButton("dataProtection")}</> : readText(sections.dataProtection)}</SectionCard>

    <SectionCard title={ETHICS_SECTION_LABELS.commitment}>
      {editable && isPi ? <>
        <div className="field"><label className="multi-select-option"><input type="checkbox" checked={drafts.commitment} onChange={(event) => setDrafts({ ...drafts, commitment: event.target.checked })} /> Tôi cam kết thực hiện nghiên cứu theo đúng các nội dung đạo đức đã khai trong hồ sơ.</label></div>
        {saveButton("commitment")}
      </> : <p>Cam kết của chủ nhiệm: {sections.commitment ? "Đã tích" : "Chưa tích"}.</p>}
      {dossier.status === "draft" ? <p>Lưu ý: khi người khác chủ nhiệm sửa nội dung các mục 1–5 hoặc tệp đính kèm, cam kết tự bỏ tích và chủ nhiệm phải xác nhận lại.</p> : null}
    </SectionCard>

    <SectionCard title="Tệp đính kèm">
      {dossier.readiness.missingFiles.length ? <><p>Tệp bắt buộc còn thiếu:</p>{fileList(dossier.readiness.missingFiles)}</> : <p>Đã đủ tệp bắt buộc.</p>}
      {FILE_PURPOSES.map((purpose) => {
        const files = dossier.files.filter((file) => file.filePurpose === purpose);
        return <div key={purpose}><h3>{ETHICS_FILE_LABELS[purpose]}</h3>
          {files.length ? <ul>{files.map((file) => <li key={file.id}><a href={projectFileUrl(file.id)}>{file.fileName}</a> · {date(file.createdAt)}{file.canDelete ? <> <button className="button" type="button" disabled={busy} onClick={() => void act(() => deleteEthicsFile(file.id, view.contextVersion), `Xóa tệp ${file.fileName}?`)}>Xóa</button></> : null}</li>)}</ul> : <p>Chưa có tệp.</p>}
          {editable ? <label className="field"><span>Tải tệp {ETHICS_FILE_LABELS[purpose].toLowerCase()}</span><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void act(async () => { await uploadEthicsFile(dossier.id, file, purpose, view.contextVersion); }); }} /></label> : null}
        </div>;
      })}
    </SectionCard>

    {dossier.status === "draft" ? <SectionCard title="Nộp hồ sơ">
      {dossier.readiness.ready ? <p>Hồ sơ đã đủ điều kiện nộp.</p> : <>
        <p>Hồ sơ chưa đủ điều kiện nộp.</p>
        {dossier.readiness.missingSections.length ? <><p>Mục còn thiếu:</p>{sectionList(dossier.readiness.missingSections)}</> : null}
        {dossier.readiness.missingFiles.length ? <><p>Tệp còn thiếu:</p>{fileList(dossier.readiness.missingFiles)}</> : null}
      </>}
      {missing ? <div role="alert"><p>Không nộp được vì hồ sơ còn thiếu:</p>{sectionList(missing.sections)}{fileList(missing.files)}</div> : null}
      <div className="button-row"><button className="button primary" type="button" disabled={busy || !canSubmit} onClick={() => void act(() => submitEthicsDossier(projectId, view.contextVersion), "Nộp hồ sơ đạo đức? Sau khi nộp, hồ sơ chỉ còn chế độ xem.")}>Nộp hồ sơ</button></div>
      {!canSubmit ? <p>{ethicsDenial(view, "ethics-dossier.submit")}</p> : null}
    </SectionCard> : null}

    {dossier.readOnly ? <SectionCard title="Các phiên bản đã nộp">{!dossier.submissions.length ? <p>Chưa có phiên bản đã nộp.</p> : <table><thead><tr><th>Phiên bản</th><th>Ngày nộp</th><th>Số tệp</th></tr></thead><tbody>{dossier.submissions.map((row) => <tr key={row.id}><td>Phiên bản {row.version}</td><td>{date(row.submittedAt)}</td><td>{row.snapshot.files?.length ?? 0}</td></tr>)}</tbody></table>}</SectionCard> : null}
  </div>;
}
