"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Award, CalendarClock, Check, Edit3, Lock, Plus, Trash2, Upload, UserPlus, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatIntakeDate, intakeDateToIso, toIntakeDateInput } from "@/lib/intake-dates";
import {
  AWARD_EVIDENCE, AWARDS, DOCUMENT_PURPOSES,
  addStudentResearchMember, approveStudentResearchTopic, closeStudentResearchTopic, createStudentResearchPeriod, createStudentResearchTopic,
  loadStudentResearch, loadStudentResearchOfficers, rejectStudentResearchTopic, removeStudentResearchMember, setStudentResearchTopicDeadline,
  studentResearchFileUrl, updateStudentResearchPeriod, updateStudentResearchTopic, uploadStudentResearchFile, uploadStudentResearchTemplate,
  type DocumentPurpose, type StudentResearchFile, type StudentResearchOverview, type StudentResearchPeriod, type StudentResearchTopic
} from "@/lib/student-research-api";

const DOCUMENT_ACCEPT = ".doc,.docx,.pdf";
const EVIDENCE_ACCEPT = ".jpg,.jpeg,.png,.pdf";
// Nhãn trạng thái dùng lại bảng statusMeta chung.
const STATUS_KEY: Record<StudentResearchTopic["status"], string> = { pending_approval: "pending-approval", approved: "approved", rejected: "rejected", closed: "completed" };
const awardLabel = (award: string | null) => AWARDS.find(([code]) => code === award)?.[1] ?? "Không có giải";

type DialogState =
  | { kind: "period"; period?: StudentResearchPeriod }
  | { kind: "topic"; period: StudentResearchPeriod; topic?: StudentResearchTopic }
  | { kind: "reject" | "deadline" | "close"; topic: StudentResearchTopic };

function FileLinks({ files }: { files: StudentResearchFile[] }) {
  if (!files.length) return <span className="record-meta">Chưa có</span>;
  return <>{files.map((file) => <a key={file.id} href={studentResearchFileUrl(file.id)} title={`Phiên bản ${file.version}, tải lên ${formatIntakeDate(file.uploadedAt)}`}>{file.fileName}</a>)}</>;
}

function UploadButton({ label, accept, disabled, onFile }: { label: string; accept: string; disabled: boolean; onFile: (file: File) => void }) {
  return (
    <label className="button" aria-disabled={disabled}>
      <Upload size={16} aria-hidden="true" />
      {label}
      <input type="file" accept={accept} hidden disabled={disabled} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onFile(file); }} />
    </label>
  );
}

export function StudentResearchPanel() {
  const [data, setData] = useState<StudentResearchOverview | null>(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [periodFilter, setPeriodFilter] = useState("");
  const [officers, setOfficers] = useState<Array<{ id: string; displayName: string }>>([]);

  const reload = useCallback(() => loadStudentResearch().then(setData, (cause) => setLoadError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu.")), []);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { if (data?.canChooseOfficer) void loadStudentResearchOfficers().then(setOfficers, () => setOfficers([])); }, [data?.canChooseOfficer]);

  /** Chạy một thao tác, báo kết quả và tải lại dữ liệu; trả về true khi thành công. */
  async function act(work: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try { await work(); setMessage(success); setDialog(null); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể xử lý yêu cầu."); return false; }
    finally { await reload(); setBusy(false); }
  }

  if (loadError) return <p className="state-message error" role="alert">{loadError}</p>;
  if (!data) return <p className="state-message" role="status">Đang tải Sinh viên NCKH...</p>;

  const isStaff = data.canCreatePeriod || data.periods.some((period) => period.canManage) || data.canChooseOfficer;
  const topics = data.topics.filter((topic) => !periodFilter || topic.periodId === periodFilter);
  const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
  const chosenFile = (form: FormData, name: string) => { const file = form.get(name); return file instanceof File && file.size > 0 ? file : null; };

  function submitPeriod(event: FormEvent<HTMLFormElement>, period?: StudentResearchPeriod) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const deadline = text(form, "submissionDeadline");
    if (!deadline) return setError("Chọn hạn cuối của đợt.");
    const submissionDeadline = intakeDateToIso(deadline, true);
    // TP/TB chỉ đổi hạn (và TP đổi CV phụ trách); CV phụ trách sửa toàn bộ.
    const details = !period || period.canEdit ? { title: text(form, "title"), maxMembers: Number(text(form, "maxMembers")) } : {};
    const officer = text(form, "responsibleOfficerUserId");
    void act(async () => {
      const id = period?.id ?? (await createStudentResearchPeriod({ year: Number(text(form, "year")), title: text(form, "title"), maxMembers: Number(text(form, "maxMembers")), submissionDeadline })).id;
      // Đợt đã lập xong: đóng hộp thoại để lỗi tải mẫu (nếu có) không khiến người dùng bấm lập lại lần nữa.
      if (!period) setDialog(null);
      if (period) await updateStudentResearchPeriod(id, { ...details, submissionDeadline, ...(officer && officer !== period.responsibleOfficer.id ? { responsibleOfficerUserId: officer } : {}) });
      for (const [purpose] of DOCUMENT_PURPOSES) {
        const file = chosenFile(form, `template-${purpose}`);
        if (file) await uploadStudentResearchTemplate(id, purpose as DocumentPurpose, file);
      }
    }, period ? "Đã cập nhật đợt." : "Đã lập đợt Sinh viên NCKH.");
  }

  function submitTopic(event: FormEvent<HTMLFormElement>, period: StudentResearchPeriod, topic?: StudentResearchTopic) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = { title: text(form, "title"), summary: text(form, "summary"), advisorName: text(form, "advisorName"), advisorUnit: text(form, "advisorUnit") };
    const file = chosenFile(form, "file");
    if (!topic && !file) return setError("Đính kèm Đơn đăng ký đề tài (DOC, DOCX hoặc PDF).");
    void act(() => (topic ? updateStudentResearchTopic(topic.id, input) : createStudentResearchTopic(period.id, input, file!)), topic ? "Đã lưu và gửi đề tài cho chuyên viên duyệt." : "Đã đăng ký đề tài. Chờ chuyên viên phụ trách duyệt.");
  }

  function renderTopic(topic: StudentResearchTopic) {
    const can = topic.capabilities;
    const period = data!.periods.find((item) => item.id === topic.periodId)!;
    const filesOf = (purpose: string) => topic.files.filter((file) => file.purpose === purpose);
    const upload = (purpose: string, label: string) => (file: File) => void act(() => uploadStudentResearchFile(topic.id, purpose, file), `Đã tải lên ${label}.`);
    return (
      <article className="document-box" key={topic.id}>
        <div className="button-row" style={{ justifyContent: "space-between" }}>
          <div>
            <span className="record-title">{topic.title}</span>
            <span className="record-meta">Đợt {topic.year} · Trưởng nhóm: {topic.leader.displayName}{topic.leader.studentCode ? ` (${topic.leader.studentCode}${topic.leader.className ? `, ${topic.leader.className}` : ""})` : ""}</span>
            <span className="record-meta">GV hướng dẫn: {topic.advisorName}, {topic.advisorUnit}</span>
          </div>
          <StatusBadge status={STATUS_KEY[topic.status]} />
        </div>
        {topic.summary ? <p>{topic.summary}</p> : null}
        {topic.status === "rejected" ? <p className="state-message error" role="alert">Chuyên viên từ chối: {topic.rejectionReason}. Trưởng nhóm sửa đề tài rồi gửi lại.</p> : null}
        <p className="record-meta">
          {topic.locked ? <Lock size={14} aria-hidden="true" /> : <CalendarClock size={14} aria-hidden="true" />}{" "}
          Hạn cuối: {formatIntakeDate(topic.deadline)}{topic.deadlineOverride ? " (hạn riêng của đề tài)" : ""}{topic.status === "closed" ? "" : topic.locked ? " · Đã khoá, không thay được tài liệu" : " · Còn thay được tài liệu"}
        </p>

        <div className="table-wrap" tabIndex={0} role="region" aria-label={`Tài liệu của đề tài ${topic.title}`}>
          <table className="data-table">
            <thead><tr><th>Tài liệu</th><th>Tệp hiện tại</th><th>Thao tác</th></tr></thead>
            <tbody>
              {DOCUMENT_PURPOSES.map(([purpose, label]) => {
                const allowed = purpose === "REGISTRATION_FORM" ? can.canUploadRegistrationForm : can.canUploadReports;
                return (
                  <tr key={purpose}>
                    <td>{label}</td>
                    <td><FileLinks files={filesOf(purpose)} /></td>
                    <td>{allowed ? <UploadButton label={filesOf(purpose).length ? "Thay tệp" : "Tải lên"} accept={DOCUMENT_ACCEPT} disabled={busy} onFile={upload(purpose, label)} /> : <span className="record-meta">—</span>}</td>
                  </tr>
                );
              })}
              {topic.status === "closed" && topic.award ? (
                <tr>
                  <td>Minh chứng bằng khen, giấy khen</td>
                  <td><div className="file-list"><FileLinks files={filesOf(AWARD_EVIDENCE)} /></div></td>
                  <td>{can.canUploadEvidence ? <UploadButton label="Thêm ảnh minh chứng" accept={EVIDENCE_ACCEPT} disabled={busy} onFile={upload(AWARD_EVIDENCE, "minh chứng")} /> : <span className="record-meta">—</span>}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div>
          <span className="record-title">Thành viên ({topic.members.length}/{period.maxMembers})</span>
          <ul className="file-list" style={{ listStyle: "none", padding: 0 }}>
            {topic.members.map((member) => (
              <li key={member.id} className="button-row" style={{ justifyContent: "space-between" }}>
                <span>
                  {member.user ? `${member.user.displayName}${member.user.studentCode ? ` – ${member.user.studentCode}` : ""}` : `${member.invitedEmail} (đã mời, chưa có tài khoản)`}
                  {member.isLeader ? " · Trưởng nhóm" : ""}
                </span>
                {can.canManageMembers && !member.isLeader ? (
                  <button className="button" type="button" disabled={busy} aria-label={`Xoá ${member.user?.displayName ?? member.invitedEmail} khỏi nhóm`} onClick={() => void act(() => removeStudentResearchMember(topic.id, member.id), "Đã xoá thành viên.")}>
                    <Trash2 size={16} aria-hidden="true" />Xoá
                  </button>
                ) : null}
                {member.canLeave ? <button className="button" type="button" disabled={busy} onClick={() => void act(() => removeStudentResearchMember(topic.id, member.id), "Bạn đã rời nhóm.")}>Rời nhóm</button> : null}
              </li>
            ))}
          </ul>
          {can.canManageMembers && topic.members.length < period.maxMembers ? (
            <form className="button-row" onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const identifier = text(new FormData(form), "identifier");
              if (identifier) void act(() => addStudentResearchMember(topic.id, identifier), "Đã thêm thành viên. Email chưa có tài khoản sẽ nhận thư mời.").then((ok) => { if (ok) form.reset(); });
            }}>
              <label className="field">
                <span>Thêm thành viên bằng email hoặc tên đăng nhập</span>
                <input name="identifier" maxLength={254} autoComplete="off" required />
              </label>
              <button className="button" type="submit" disabled={busy}><UserPlus size={16} aria-hidden="true" />Thêm</button>
            </form>
          ) : null}
        </div>

        {topic.status === "closed" ? <p className="state-message success"><Award size={16} aria-hidden="true" /> Điểm: {topic.score} / 100 · {awardLabel(topic.award)}</p> : null}

        <div className="button-row compact-actions">
          {can.canEdit ? <button className="button" type="button" disabled={busy} onClick={() => { setError(""); setDialog({ kind: "topic", period, topic }); }}><Edit3 size={16} aria-hidden="true" />{topic.status === "rejected" ? "Sửa và gửi lại" : "Sửa đề tài"}</button> : null}
          {can.canDecide ? <button className="button primary" type="button" disabled={busy} onClick={() => void act(() => approveStudentResearchTopic(topic.id), "Đã duyệt đăng ký đề tài.")}><Check size={16} aria-hidden="true" />Duyệt</button> : null}
          {can.canDecide ? <button className="button danger" type="button" disabled={busy} onClick={() => { setError(""); setDialog({ kind: "reject", topic }); }}><X size={16} aria-hidden="true" />Từ chối</button> : null}
          {can.canChangeDeadline ? <button className="button" type="button" disabled={busy} onClick={() => { setError(""); setDialog({ kind: "deadline", topic }); }}><CalendarClock size={16} aria-hidden="true" />Đổi hạn / mở khoá</button> : null}
          {can.canClose ? <button className="button primary" type="button" disabled={busy} onClick={() => { setError(""); setDialog({ kind: "close", topic }); }}><Award size={16} aria-hidden="true" />Chấm điểm và đóng</button> : null}
        </div>
      </article>
    );
  }

  const dialogShell = (title: string, subtitle: string, children: ReactNode) => (
    <Dialog className="form-dialog" label={title} onClose={() => setDialog(null)}>
      <SectionCard title={title} subtitle={subtitle} action={<button className="button" type="button" onClick={() => setDialog(null)}>Đóng</button>}>
        {children}
      </SectionCard>
    </Dialog>
  );
  const dialogError = error ? <p className="state-message error" role="alert">{error}</p> : null;

  return (
    <>
      {message ? <p className="state-message success" role="status">{message}</p> : null}
      {error && !dialog ? <p className="state-message error" role="alert">{error}</p> : null}
      {!data.profileComplete ? <p className="state-message warning" role="status">Bạn cần hoàn thiện <Link href="/student-profile">hồ sơ sinh viên</Link> (mã sinh viên, lớp, số điện thoại, điểm tổng kết) trước khi đăng ký hoặc tham gia đề tài.</p> : null}

      <SectionCard
        title="Đợt Sinh viên NCKH"
        subtitle="Mỗi năm một đợt, do một chuyên viên phụ trách từ đầu đến cuối"
        action={data.canCreatePeriod ? <button className="button primary" type="button" onClick={() => { setError(""); setDialog({ kind: "period" }); }}><Plus size={16} aria-hidden="true" />Lập đợt</button> : undefined}
      >
        {data.periods.length === 0 ? <EmptyState title="Chưa có đợt Sinh viên NCKH" message={data.canCreatePeriod ? "Lập đợt của năm để sinh viên bắt đầu đăng ký đề tài." : "Chuyên viên phụ trách chưa lập đợt cho năm nay."} /> : (
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Danh sách đợt Sinh viên NCKH">
            <table className="data-table">
              <thead><tr><th>Đợt</th><th>Hạn cuối</th><th>Thành viên tối đa</th><th>CV phụ trách</th><th>Văn bản mẫu</th><th>Thao tác</th></tr></thead>
              <tbody>
                {data.periods.map((period) => (
                  <tr key={period.id}>
                    <td><span className="record-title">{period.title}</span><span className="record-meta">Năm {period.year}</span></td>
                    <td>{formatIntakeDate(period.submissionDeadline)}</td>
                    <td>{period.maxMembers}</td>
                    <td>{period.responsibleOfficer.displayName}</td>
                    <td>
                      <div className="file-list">
                        {DOCUMENT_PURPOSES.map(([purpose, label]) => {
                          const file = period.templates.find((item) => item.purpose === purpose);
                          return file ? <a key={purpose} href={studentResearchFileUrl(file.id)} title={file.fileName}>Mẫu {label}</a> : <span key={purpose} className="record-meta">Mẫu {label}: chưa có</span>;
                        })}
                      </div>
                    </td>
                    <td>
                      <div className="button-row compact-actions">
                        {period.canManage || data.canChooseOfficer ? <button className="button" type="button" disabled={busy} onClick={() => { setError(""); setDialog({ kind: "period", period }); }}><Edit3 size={16} aria-hidden="true" />Sửa</button> : null}
                        {period.canRegister ? <button className="button primary" type="button" disabled={busy || !data.profileComplete} onClick={() => { setError(""); setDialog({ kind: "topic", period }); }}><Plus size={16} aria-hidden="true" />Đăng ký đề tài</button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title={isStaff ? "Đề tài của sinh viên" : "Đề tài của nhóm tôi"} subtitle={isStaff ? "Duyệt đăng ký, theo dõi tài liệu, chấm điểm và xếp giải" : "Chỉ Trưởng nhóm tải và thay tài liệu, đến hạn cuối thì khoá"}>
        {isStaff && data.periods.length > 1 ? (
          <label className="filter-field">
            <span>Đợt</span>
            <select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)}>
              <option value="">Tất cả</option>
              {data.periods.map((period) => <option key={period.id} value={period.id}>{period.year}</option>)}
            </select>
          </label>
        ) : null}
        {topics.length === 0
          ? <EmptyState title="Chưa có đề tài" message={isStaff ? "Chưa có nhóm sinh viên nào đăng ký đề tài trong đợt bạn phụ trách." : "Bấm Đăng ký đề tài ở đợt đang mở, hoặc chờ Trưởng nhóm thêm bạn vào nhóm."} />
          : <div className="document-groups">{topics.map(renderTopic)}</div>}
      </SectionCard>

      {dialog?.kind === "period" ? dialogShell(dialog.period ? "Cập nhật đợt Sinh viên NCKH" : "Lập đợt Sinh viên NCKH", "Hạn cuối áp dụng cho mọi tài liệu của các nhóm; văn bản mẫu là DOC, DOCX hoặc PDF", (
        <form className="admin-form" onSubmit={(event) => submitPeriod(event, dialog.period)}>
          <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
            {dialog.period ? null : <label className="field"><span>Năm</span><input name="year" type="number" min={2000} max={2100} defaultValue={new Date().getFullYear()} required /></label>}
            {!dialog.period || dialog.period.canEdit ? (
              <>
                <label className="field"><span>Tên đợt</span><input name="title" maxLength={300} defaultValue={dialog.period?.title ?? ""} required /></label>
                <label className="field"><span>Số thành viên tối đa mỗi đề tài (tính cả Trưởng nhóm, không quá 5)</span><input name="maxMembers" type="number" min={1} max={5} defaultValue={dialog.period?.maxMembers ?? 5} required /></label>
              </>
            ) : null}
            {!dialog.period || dialog.period.canManage ? <label className="field"><span>Hạn cuối nộp và thay tài liệu</span><input name="submissionDeadline" type="date" defaultValue={dialog.period ? toIntakeDateInput(dialog.period.submissionDeadline) : ""} required /></label> : <input type="hidden" name="submissionDeadline" value={toIntakeDateInput(dialog.period.submissionDeadline)} />}
            {dialog.period && data.canChooseOfficer ? (
              <label className="field">
                <span>Chuyên viên phụ trách</span>
                <select name="responsibleOfficerUserId" defaultValue={dialog.period.responsibleOfficer.id}>
                  {[dialog.period.responsibleOfficer, ...officers.filter((officer) => officer.id !== dialog.period!.responsibleOfficer.id)].map((officer) => <option key={officer.id} value={officer.id}>{officer.displayName}</option>)}
                </select>
              </label>
            ) : null}
            {!dialog.period || dialog.period.canEdit ? DOCUMENT_PURPOSES.map(([purpose, label]) => (
              <label className="field" key={purpose}>
                <span>Mẫu {label}{dialog.period?.templates.some((file) => file.purpose === purpose) ? " (chọn tệp mới để thay)" : ""}</span>
                <input name={`template-${purpose}`} type="file" accept={DOCUMENT_ACCEPT} />
              </label>
            )) : null}
            {dialogError}
            <button className="button primary" type="submit">{dialog.period ? "Lưu thay đổi" : "Lập đợt"}</button>
          </fieldset>
        </form>
      )) : null}

      {dialog?.kind === "topic" ? dialogShell(dialog.topic ? "Sửa đề tài" : `Đăng ký đề tài – đợt ${dialog.period.year}`, "Chuyên viên phụ trách duyệt đăng ký trước khi nhóm nộp báo cáo", (
        <form className="admin-form" onSubmit={(event) => submitTopic(event, dialog.period, dialog.topic)}>
          <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
            <label className="field"><span>Tên đề tài</span><input name="title" maxLength={500} defaultValue={dialog.topic?.title ?? ""} required /></label>
            <label className="field"><span>Tóm tắt (không bắt buộc)</span><textarea name="summary" rows={4} maxLength={4000} defaultValue={dialog.topic?.summary ?? ""} /></label>
            <div className="form-grid two">
              <label className="field"><span>Giảng viên hướng dẫn</span><input name="advisorName" maxLength={160} defaultValue={dialog.topic?.advisorName ?? ""} required /></label>
              <label className="field"><span>Đơn vị của giảng viên hướng dẫn</span><input name="advisorUnit" maxLength={240} defaultValue={dialog.topic?.advisorUnit ?? ""} required /></label>
            </div>
            {dialog.topic ? null : <label className="field"><span>Đơn đăng ký đề tài (DOC, DOCX hoặc PDF)</span><input name="file" type="file" accept={DOCUMENT_ACCEPT} required /></label>}
            {dialogError}
            <button className="button primary" type="submit">{dialog.topic ? "Lưu và gửi duyệt" : "Đăng ký đề tài"}</button>
          </fieldset>
        </form>
      )) : null}

      {dialog?.kind === "reject" ? dialogShell("Từ chối đăng ký đề tài", dialog.topic.title, (
        <form className="admin-form" onSubmit={(event) => { event.preventDefault(); const reason = text(new FormData(event.currentTarget), "reason"); void act(() => rejectStudentResearchTopic(dialog.topic.id, reason), "Đã từ chối đăng ký đề tài."); }}>
          <label className="field"><span>Lý do từ chối (Trưởng nhóm sẽ thấy để sửa và gửi lại)</span><textarea name="reason" rows={4} maxLength={1000} required /></label>
          {dialogError}
          <button className="button danger" type="submit" disabled={busy}>Từ chối</button>
        </form>
      )) : null}

      {dialog?.kind === "deadline" ? dialogShell("Đổi hạn của đề tài", `${dialog.topic.title} · Hạn hiện tại: ${formatIntakeDate(dialog.topic.deadline)}`, (
        <form className="admin-form" onSubmit={(event) => { event.preventDefault(); const value = text(new FormData(event.currentTarget), "deadline"); if (value) void act(() => setStudentResearchTopicDeadline(dialog.topic.id, intakeDateToIso(value, true)), "Đã đặt hạn riêng cho đề tài."); }}>
          <label className="field"><span>Hạn riêng của đề tài (đặt sau hôm nay để mở khoá)</span><input name="deadline" type="date" defaultValue={toIntakeDateInput(dialog.topic.deadline)} required /></label>
          {dialogError}
          <div className="button-row">
            <button className="button primary" type="submit" disabled={busy}>Lưu hạn riêng</button>
            {dialog.topic.deadlineOverride ? <button className="button" type="button" disabled={busy} onClick={() => void act(() => setStudentResearchTopicDeadline(dialog.topic.id, null), "Đề tài quay về hạn chung của đợt.")}>Bỏ hạn riêng</button> : null}
          </div>
        </form>
      )) : null}

      {dialog?.kind === "close" ? dialogShell("Chấm điểm và đóng đề tài", `${dialog.topic.title} · Sau khi đóng không sửa được điểm và tài liệu`, (
        <form className="admin-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void act(() => closeStudentResearchTopic(dialog.topic.id, Number(text(form, "score")), text(form, "award") || null), "Đã chấm điểm và đóng đề tài."); }}>
          <label className="field"><span>Điểm (0–100)</span><input name="score" type="number" min={0} max={100} step={0.01} inputMode="decimal" required /></label>
          <label className="field">
            <span>Giải thưởng</span>
            <select name="award" defaultValue="">
              <option value="">Không có giải</option>
              {AWARDS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </label>
          {dialogError}
          <button className="button primary" type="submit" disabled={busy}>Đóng đề tài</button>
        </form>
      )) : null}
    </>
  );
}
