"use client";

import { useEffect, useState } from "react";
import { useAskReason, useConfirm, useNotice } from "@/components/ui/confirm-dialog";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { SectionCard } from "@/components/ui/section-card";
import { formatIntakeDate, intakeDateToIso } from "@/lib/intake-dates";
import {
  addInvitations,
  importInvitations,
  INVITATION_KIND_LABELS,
  INVITATION_STATUS_TONES,
  invitationTemplateUrl,
  listInviteeUnits,
  MAILING_KIND_LABELS,
  PAPER_KIND_LABELS,
  paperDownloadUrl,
  requestPaperRevision,
  revokeInvitation,
  searchInvitableUsers,
  sendMailing,
  withdrawPaper,
  type InvitationKind,
  type MailingKind,
  type ManagedConference,
  type ManagedInvitation,
  type PaperKind,
  type UnitOption
} from "@/lib/conferences-api";

const MAILING_TARGETS: Record<MailingKind, string[]> = { invitation: ["draft", "sent"], reminder: ["sent", "accepted"], change_notice: ["sent", "accepted"], program: ["accepted"], proceedings: ["accepted"] };
const EMPTY_MANUAL = { kind: "speaker" as InvitationKind, fullName: "", academicTitle: "", email: "", isInternal: false, organizationUnitId: "", externalOrganization: "" };

type Props = { conference: ManagedConference; onChanged: () => Promise<void> };

export function ConferenceInvitationsPanel({ conference, onChanged }: Props) {
  const actions = conference.viewer.actions;
  const canManage = actions.includes("invitation.manage");
  const canSend = actions.includes("mailing.send");
  const canReview = actions.includes("paper.review");
  const confirm = useConfirm();
  const notice = useNotice();
  const askReason = useAskReason();
  const [mode, setMode] = useState<"none" | "account" | "manual" | "excel">("none");
  const [selected, setSelected] = useState<string[]>([]);
  const [kindFilter, setKindFilter] = useState<"" | InvitationKind>("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [mailing, setMailing] = useState<{ kind: MailingKind; message: string } | null>(null);
  const [revision, setRevision] = useState<{ invitation: ManagedInvitation; kind: PaperKind; reason: string; dueAt: string } | null>(null);

  const visible = conference.invitations.filter((item) => (!kindFilter || item.kind === kindFilter) && (!statusFilter || item.status === statusFilter));
  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  const selectable = (item: ManagedInvitation) => item.status !== "revoked" && item.status !== "declined";

  async function run(work: () => Promise<unknown>, success?: string) {
    setBusy(true);
    try { await work(); await onChanged(); if (success) await notice(success); }
    catch (error) { await notice(error instanceof Error ? error.message : "Không thực hiện được thao tác."); }
    finally { setBusy(false); }
  }

  function openMailing(kind: MailingKind) {
    const targets = conference.invitations.filter((item) => selected.includes(item.id) && MAILING_TARGETS[kind].includes(item.status));
    if (!targets.length) { void notice(kind === "invitation" ? "Chọn khách mời chưa gửi thư hoặc chờ trả lời để gửi thư mời." : "Chọn khách mời đã gửi thư hoặc đã nhận lời."); return; }
    setMailing({ kind, message: "" });
  }

  async function submitMailing() {
    if (!mailing) return;
    const ids = conference.invitations.filter((item) => selected.includes(item.id) && MAILING_TARGETS[mailing.kind].includes(item.status)).map((item) => item.id);
    if (!(await confirm(`Gửi ${MAILING_KIND_LABELS[mailing.kind].toLowerCase()} cho ${ids.length} người?`, { confirmLabel: "Gửi thư" }))) return;
    const draft = mailing;
    setMailing(null);
    await run(async () => {
      const result = await sendMailing(conference.id, { kind: draft.kind, invitationIds: ids, message: draft.message.trim() || undefined });
      setSelected([]);
      const parts = [`Đã gửi ${result.sent}/${result.recipients} người.`];
      if (result.failed) parts.push(`${result.failed} người gửi lỗi (xem mục Thư đã gửi).`);
      if (result.skipped) parts.push(`${result.skipped} email chưa gửi vì máy chủ chưa cấu hình email.`);
      await notice(parts.join(" "));
    });
  }

  async function revoke(item: ManagedInvitation) {
    const reason = await askReason(`Huỷ lời mời của ${item.fullName}?${item.paper ? " Báo cáo của người này sẽ chuyển sang đã rút." : ""}`, { title: "Huỷ lời mời", confirmLabel: "Huỷ lời mời", tone: "danger" });
    if (reason) await run(() => revokeInvitation(conference.id, item.id, reason));
  }

  async function cancelPaper(item: ManagedInvitation) {
    if (!item.paper) return;
    const reason = await askReason(`Huỷ báo cáo của ${item.fullName}?`, { title: "Huỷ báo cáo", confirmLabel: "Huỷ báo cáo", tone: "danger" });
    if (reason) await run(() => withdrawPaper(item.paper!.id, { version: item.paper!.version, reason }));
  }

  async function submitRevision() {
    if (!revision?.invitation.paper) return;
    const draft = revision;
    setRevision(null);
    await run(() => requestPaperRevision(draft.invitation.paper!.id, { version: draft.invitation.paper!.version, kind: draft.kind, reason: draft.reason.trim(), dueAt: intakeDateToIso(draft.dueAt, true) }), "Đã gửi yêu cầu sửa cho báo cáo viên.");
  }

  return <SectionCard title="Khách mời và bài nộp" subtitle={`${conference.invitations.length} khách mời · thư mời ghi thời gian và địa điểm; báo cáo viên nộp tóm tắt, toàn văn trước hạn`}>
    {canManage ? <div className="button-row">
      <button className={`button ${mode === "account" ? "primary" : ""}`} type="button" onClick={() => setMode(mode === "account" ? "none" : "account")}>Mời người có tài khoản</button>
      <button className={`button ${mode === "manual" ? "primary" : ""}`} type="button" onClick={() => setMode(mode === "manual" ? "none" : "manual")}>Nhập tay</button>
      <button className={`button ${mode === "excel" ? "primary" : ""}`} type="button" onClick={() => setMode(mode === "excel" ? "none" : "excel")}>Nhập từ Excel</button>
    </div> : null}
    {mode === "account" ? <AccountInvite conferenceId={conference.id} onAdded={() => run(() => Promise.resolve())} /> : null}
    {mode === "manual" ? <ManualInvite conferenceId={conference.id} onAdded={() => run(() => Promise.resolve())} /> : null}
    {mode === "excel" ? <ExcelInvite conferenceId={conference.id} onAdded={() => run(() => Promise.resolve())} /> : null}

    <div className="form-grid two">
      <label className="field"><span>Loại</span><select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as "" | InvitationKind)}><option value="">Tất cả</option><option value="speaker">Báo cáo viên</option><option value="delegate">Đại biểu</option></select></label>
      <label className="field"><span>Lời mời</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Tất cả</option><option value="draft">Chưa gửi</option><option value="sent">Chờ trả lời</option><option value="accepted">Đã nhận lời</option><option value="declined">Từ chối</option><option value="revoked">Đã huỷ</option></select></label>
    </div>
    {canSend ? <div className="button-row">
      <span>{selected.length ? `Đã chọn ${selected.length}` : "Chọn khách mời để gửi thư"}</span>
      <button className="button" type="button" onClick={() => setSelected(visible.filter(selectable).map((item) => item.id))}>Chọn tất cả đang hiện</button>
      <button className="button" type="button" disabled={!selected.length} onClick={() => setSelected([])}>Bỏ chọn</button>
      <button className="button primary" type="button" disabled={busy || !selected.length} onClick={() => openMailing("invitation")}>Gửi thư mời</button>
      <button className="button" type="button" disabled={busy || !selected.length} onClick={() => openMailing("reminder")}>Gửi thư nhắc</button>
      <button className="button" type="button" disabled={busy || !selected.length} onClick={() => openMailing("change_notice")}>Thông báo thay đổi</button>
    </div> : null}

    {!visible.length ? <p>{conference.invitations.length ? "Không có khách mời phù hợp bộ lọc." : "Chưa có khách mời."}</p> : <div className="table-wrap"><table className="data-table">
      <thead><tr>{canSend ? <th /> : null}<th>Khách mời</th><th>Loại</th><th>Lời mời</th><th>Bài nộp</th>{canManage || canReview ? <th /> : null}</tr></thead>
      <tbody>{visible.map((item) => <tr key={item.id}>
        {canSend ? <td><input type="checkbox" aria-label={`Chọn ${item.fullName}`} disabled={!selectable(item)} checked={selected.includes(item.id)} onChange={() => toggle(item.id)} /></td> : null}
        <td>
          <strong>{[item.academicTitle, item.fullName].filter(Boolean).join(" ")}</strong><br />
          <small>{item.organizationUnit?.name ?? item.externalOrganization ?? (item.isInternal ? "Trong Học viện" : "Ngoài Học viện")} · {item.email ?? "không có email"}</small><br />
          <small>{item.hasAccount ? (item.accountStatus === "pending_activation" ? "Tài khoản chưa đặt mật khẩu" : "Có tài khoản") : "Chưa có tài khoản"}</small>
        </td>
        <td>{INVITATION_KIND_LABELS[item.kind]}</td>
        <td>
          <span className={`status-badge ${INVITATION_STATUS_TONES[item.status] ?? "neutral"}`}>{item.statusLabel}</span>
          {item.responseOverdue ? <><br /><span className="status-badge danger">Quá hạn trả lời</span></> : null}
          {item.declineReason ? <><br /><small>Lý do: {item.declineReason}</small></> : null}
          {item.revokeReason ? <><br /><small>Lý do huỷ: {item.revokeReason}</small></> : null}
        </td>
        <td>{item.paper ? <PaperCell invitation={item} /> : item.kind === "speaker" ? <small>Tạo khi nhận lời</small> : "—"}</td>
        {canManage || canReview ? <td><div className="button-row">
          {canReview && item.paper && item.paper.status !== "withdrawn" && item.paper.status !== "scheduled" && item.paper.latestAbstract && !item.paper.openRevisions.some((r) => r.kind === "abstract") ? <button className="button" type="button" disabled={busy} onClick={() => setRevision({ invitation: item, kind: "abstract", reason: "", dueAt: "" })}>Yêu cầu sửa tóm tắt</button> : null}
          {canReview && item.paper && item.paper.status !== "withdrawn" && item.paper.status !== "scheduled" && item.paper.latestFullPaper && !item.paper.openRevisions.some((r) => r.kind === "full_paper") ? <button className="button" type="button" disabled={busy} onClick={() => setRevision({ invitation: item, kind: "full_paper", reason: "", dueAt: "" })}>Yêu cầu sửa toàn văn</button> : null}
          {canReview && item.paper && item.paper.status !== "withdrawn" ? <button className="button" type="button" disabled={busy} onClick={() => void cancelPaper(item)}>Huỷ báo cáo</button> : null}
          {canManage && ["draft", "sent", "accepted"].includes(item.status) ? <button className="button danger" type="button" disabled={busy} onClick={() => void revoke(item)}>Huỷ lời mời</button> : null}
        </div></td> : null}
      </tr>)}</tbody>
    </table></div>}

    {mailing ? <ModalDialog title={MAILING_KIND_LABELS[mailing.kind]} onClose={() => setMailing(null)} footer={<div className="button-row"><button className="button" type="button" onClick={() => setMailing(null)}>Hủy</button><button className="button primary" type="button" disabled={mailing.kind === "change_notice" && !mailing.message.trim()} onClick={() => void submitMailing()}>Gửi</button></div>}>
      <p>Thư ghi tên hội nghị, thời gian tổ chức, địa điểm; báo cáo viên có thêm hạn nộp tóm tắt và toàn văn. Người chưa có tài khoản nhận email kèm đường link Nhận lời / Từ chối.</p>
      <label className="field"><span>{mailing.kind === "change_notice" ? "Nội dung thay đổi" : "Lời nhắn thêm (tuỳ chọn)"}</span><textarea rows={4} maxLength={5000} value={mailing.message} onChange={(event) => setMailing({ ...mailing, message: event.target.value })} /></label>
    </ModalDialog> : null}

    {revision ? <ModalDialog title={`Yêu cầu sửa ${PAPER_KIND_LABELS[revision.kind].toLowerCase()}`} onClose={() => setRevision(null)} footer={<div className="button-row"><button className="button" type="button" onClick={() => setRevision(null)}>Hủy</button><button className="button primary" type="button" disabled={!revision.reason.trim() || !revision.dueAt} onClick={() => void submitRevision()}>Gửi yêu cầu</button></div>}>
      <p>{revision.invitation.fullName}: {revision.invitation.paper?.title ?? "báo cáo"}</p>
      <label className="field"><span>Nội dung cần sửa</span><textarea rows={4} maxLength={2000} value={revision.reason} onChange={(event) => setRevision({ ...revision, reason: event.target.value })} /></label>
      <label className="field"><span>Hạn nộp lại</span><input type="date" value={revision.dueAt} max={conference.endsAt.slice(0, 10)} onChange={(event) => setRevision({ ...revision, dueAt: event.target.value })} /></label>
    </ModalDialog> : null}
  </SectionCard>;
}

function PaperCell({ invitation }: { invitation: ManagedInvitation }) {
  const paper = invitation.paper!;
  return <details>
    <summary><span className="status-badge info">{paper.statusLabel}</span> {paper.title ?? ""}{paper.openRevisions.length ? <> <span className="status-badge warning">Đang chờ sửa</span></> : null}</summary>
    {paper.withdrawReason ? <p><small>Lý do rút: {paper.withdrawReason}</small></p> : null}
    {paper.authors?.length ? <p><small>Tác giả: {paper.authors.map((author) => `${author.fullName}${author.corresponding ? " (liên hệ)" : ""}`).join(", ")}</small></p> : null}
    {paper.openRevisions.map((request) => <p key={request.id}><small>Yêu cầu sửa {PAPER_KIND_LABELS[request.kind].toLowerCase()} (hạn {formatIntakeDate(request.dueAt)}): {request.reason}</small></p>)}
    <ul>{paper.versions.map((version) => <li key={version.id}>
      <small>{PAPER_KIND_LABELS[version.kind]} lần {version.versionNumber} · {formatIntakeDate(version.submittedAt)}</small>
      {version.file ? <> · <a href={paperDownloadUrl(paper.id, version.id)}>{version.file.originalFileName}</a></> : null}
      {version.abstractText ? <p className="field-hint" style={{ whiteSpace: "pre-wrap" }}>{version.abstractText}</p> : null}
    </li>)}</ul>
  </details>;
}

function AccountInvite({ conferenceId, onAdded }: { conferenceId: string; onAdded: () => Promise<void> }) {
  const notice = useNotice();
  const [keyword, setKeyword] = useState("");
  const [users, setUsers] = useState<Awaited<ReturnType<typeof searchInvitableUsers>>>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (keyword.trim().length < 2) { setUsers([]); return; }
    const timer = setTimeout(() => { void searchInvitableUsers(conferenceId, keyword).then(setUsers).catch(() => setUsers([])); }, 300);
    return () => clearTimeout(timer);
  }, [keyword, conferenceId]);
  async function invite(userId: string, kind: InvitationKind) {
    setBusy(true);
    try { await addInvitations(conferenceId, [{ kind, userId }]); setUsers((current) => current.filter((user) => user.id !== userId)); await onAdded(); }
    catch (error) { await notice(error instanceof Error ? error.message : "Không thêm được khách mời."); }
    finally { setBusy(false); }
  }
  return <div className="form-section-inline">
    <label className="field"><span>Tìm theo tên, tên đăng nhập hoặc email</span><input value={keyword} onChange={(event) => setKeyword(event.target.value)} /></label>
    {users.length ? <div className="table-wrap"><table className="data-table"><tbody>{users.map((user) => <tr key={user.id}>
      <td>{user.displayName}<br /><small>{user.unit} · {user.credentialEmail ?? user.username ?? ""}</small></td>
      <td><div className="button-row"><button className="button" type="button" disabled={busy} onClick={() => void invite(user.id, "speaker")}>Mời báo cáo viên</button><button className="button" type="button" disabled={busy} onClick={() => void invite(user.id, "delegate")}>Mời đại biểu</button></div></td>
    </tr>)}</tbody></table></div> : keyword.trim().length >= 2 ? <p>Không tìm thấy tài khoản.</p> : null}
  </div>;
}

function ManualInvite({ conferenceId, onAdded }: { conferenceId: string; onAdded: () => Promise<void> }) {
  const notice = useNotice();
  const [form, setForm] = useState(EMPTY_MANUAL);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void listInviteeUnits(conferenceId).then(setUnits).catch(() => setUnits([])); }, [conferenceId]);
  const set = (key: keyof typeof EMPTY_MANUAL) => (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value });
  const ready = form.fullName.trim() && form.email.trim() && (!form.isInternal || form.organizationUnitId);
  async function submit() {
    setBusy(true);
    try {
      await addInvitations(conferenceId, [{ kind: form.kind, fullName: form.fullName, academicTitle: form.academicTitle, email: form.email, isInternal: form.isInternal, organizationUnitId: form.isInternal ? form.organizationUnitId : undefined, externalOrganization: form.isInternal ? undefined : form.externalOrganization }]);
      setForm({ ...EMPTY_MANUAL, kind: form.kind, isInternal: form.isInternal, organizationUnitId: form.organizationUnitId });
      await onAdded();
    } catch (error) { await notice(error instanceof Error ? error.message : "Không thêm được khách mời."); }
    finally { setBusy(false); }
  }
  return <div className="form-section-inline">
    <div className="form-grid two">
      <label className="field"><span>Loại</span><select value={form.kind} onChange={set("kind")}><option value="speaker">Báo cáo viên</option><option value="delegate">Đại biểu</option></select></label>
      <label className="field"><span>Họ tên</span><input value={form.fullName} maxLength={200} onChange={set("fullName")} /></label>
      <label className="field"><span>Học hàm, học vị (tuỳ chọn)</span><input value={form.academicTitle} maxLength={100} placeholder="GS.TS, PGS.TS, ThS…" onChange={set("academicTitle")} /></label>
      <label className="field"><span>Email</span><input type="email" value={form.email} maxLength={254} onChange={set("email")} /></label>
      <label className="field"><span>Nơi công tác</span><select value={form.isInternal ? "internal" : "external"} onChange={(event) => setForm({ ...form, isInternal: event.target.value === "internal" })}><option value="external">Ngoài Học viện</option><option value="internal">Trong Học viện</option></select></label>
      {form.isInternal
        ? <label className="field"><span>Đơn vị trong Học viện</span><select value={form.organizationUnitId} onChange={set("organizationUnitId")}><option value="">Chọn đơn vị</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
        : <label className="field"><span>Đơn vị công tác (tuỳ chọn)</span><input value={form.externalOrganization} maxLength={300} onChange={set("externalOrganization")} /></label>}
    </div>
    <p className="field-hint">{form.isInternal ? "Khi nhận lời, hệ thống tạo tài khoản nội bộ thuộc đơn vị đã chọn." : "Khi nhận lời, hệ thống tạo tài khoản ngoài chỉ dùng cho các hội nghị được mời."} Nếu email đã có tài khoản, lời mời gắn luôn vào tài khoản đó.</p>
    <div className="button-row"><button className="button primary" type="button" disabled={busy || !ready} onClick={() => void submit()}>Thêm khách mời</button></div>
  </div>;
}

function ExcelInvite({ conferenceId, onAdded }: { conferenceId: string; onAdded: () => Promise<void> }) {
  const notice = useNotice();
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!file) return;
    setBusy(true); setErrors([]);
    try {
      const result = await importInvitations(conferenceId, file);
      if (result.errors.length) { setErrors(result.errors); return; }
      setFile(null);
      await onAdded();
      await notice(`Đã thêm ${result.created.length} khách mời.`);
    } catch (error) { await notice(error instanceof Error ? error.message : "Không nhập được tệp."); }
    finally { setBusy(false); }
  }
  return <div className="form-section-inline">
    <p className="field-hint">Dùng <a href={invitationTemplateUrl()}>tệp mẫu</a>. Cột &quot;Mã đơn vị trong Học viện&quot; có giá trị nghĩa là người trong Học viện; để trống là người ngoài. Có dòng lỗi thì không dòng nào được thêm.</p>
    <label className="field"><span>Tệp Excel (.xlsx)</span><input type="file" accept=".xlsx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
    {errors.length ? <ul role="alert">{errors.map((error) => <li key={error.row}>Dòng {error.row}: {error.message}</li>)}</ul> : null}
    <div className="button-row"><button className="button primary" type="button" disabled={busy || !file} onClick={() => void submit()}>Nhập khách mời</button></div>
  </div>;
}
