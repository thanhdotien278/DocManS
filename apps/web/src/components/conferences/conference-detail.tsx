"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAskReason, useConfirm, useNotice } from "@/components/ui/confirm-dialog";
import { SectionCard } from "@/components/ui/section-card";
import { formatIntakeDate } from "@/lib/intake-dates";
import {
  assignConferenceOfficer,
  CONFERENCE_EVENT_LABELS,
  CONFERENCE_LEVEL_LABELS,
  CONFERENCE_STATUS_TONES,
  conferenceExportUrl,
  getConference,
  listHostUnits,
  listOfficerCandidates,
  MAILING_KIND_LABELS,
  revokeConferenceOfficer,
  transitionConference,
  updateConference,
  type ConferenceDetail as Detail,
  type ConferenceInfo,
  type ManagedConference,
  type UnitOption
} from "@/lib/conferences-api";
import { ConferenceFields, conferenceFormProblem, conferenceToForm, formToPayload, type ConferenceFormState } from "./conference-form";
import { ConferenceInvitationsPanel } from "./conference-invitations-panel";
import { ConferenceProgramPanel } from "./conference-program-panel";

const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function ConferenceInfoCard({ conference, action }: { conference: ConferenceInfo; action?: React.ReactNode }) {
  const period = formatIntakeDate(conference.startsAt) === formatIntakeDate(conference.endsAt) ? formatIntakeDate(conference.startsAt) : `${formatIntakeDate(conference.startsAt)} – ${formatIntakeDate(conference.endsAt)}`;
  return <SectionCard title={conference.title} subtitle={`${conference.code} · ${CONFERENCE_LEVEL_LABELS[conference.level]} · ${conference.hostOrganizationUnit.name}`} action={action}>
    <p><span className={`status-badge ${CONFERENCE_STATUS_TONES[conference.status] ?? "neutral"}`}>{conference.statusLabel}</span></p>
    {conference.cancelReason ? <p role="status">Lý do huỷ: {conference.cancelReason}</p> : null}
    <dl className="document-meta-list">
      <div><dt>Thời gian</dt><dd>{period}</dd></div>
      <div><dt>Địa điểm</dt><dd>{conference.location}</dd></div>
      <div><dt>Hạn nộp tóm tắt</dt><dd>{formatIntakeDate(conference.abstractDeadline)}</dd></div>
      <div><dt>Hạn nộp toàn văn</dt><dd>{formatIntakeDate(conference.fullPaperDeadline)}</dd></div>
      {conference.responseDeadline ? <div><dt>Hạn trả lời thư mời</dt><dd>{formatIntakeDate(conference.responseDeadline)}</dd></div> : null}
    </dl>
    {conference.description ? <p style={{ whiteSpace: "pre-wrap" }}>{conference.description}</p> : null}
  </SectionCard>;
}

export function ConferenceDetail({ id }: { id: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");

  async function refresh() {
    try { setDetail(await getConference(id)); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được hội nghị."); }
  }
  useEffect(() => { void refresh(); }, [id]);

  if (error) return <p role="alert">{error}</p>;
  if (!detail) return <p>Đang tải…</p>;
  if (detail.mode === "participant") {
    return <div className="form-section-inline">
      <ConferenceInfoCard conference={detail.conference} />
      <p>Xem lời mời và nộp bài tại <Link href="/my-conferences">Hội nghị của tôi</Link>.</p>
    </div>;
  }
  return <ManagementWorkspace conference={detail.conference} onChanged={refresh} />;
}

function ManagementWorkspace({ conference, onChanged }: { conference: ManagedConference; onChanged: () => Promise<void> }) {
  const actions = conference.viewer.actions;
  const confirm = useConfirm();
  const notice = useNotice();
  const askReason = useAskReason();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ConferenceFormState>(conferenceToForm(conference));
  const [units, setUnits] = useState<UnitOption[]>([conference.hostOrganizationUnit]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setForm(conferenceToForm(conference));
    // Chỉ Trưởng phòng đổi được đơn vị chủ trì (sang đơn vị trong phạm vi của mình).
    if (actions.includes("officer.assign")) void listHostUnits().then((items) => setUnits(items.some((unit) => unit.id === conference.hostOrganizationUnit.id) ? items : [conference.hostOrganizationUnit, ...items])).catch(() => undefined);
  }, [editing]);

  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    try { await work(); await onChanged(); }
    catch (cause) { await notice(cause instanceof Error ? cause.message : "Không thực hiện được thao tác."); }
    finally { setBusy(false); }
  }

  async function save() {
    await run(async () => {
      const result = await updateConference(conference.id, { version: conference.version, ...formToPayload(form) });
      setEditing(false);
      if (result.mode === "management" && result.changeNoticeSuggested) await notice("Thời gian, địa điểm hoặc hạn nộp đã thay đổi sau khi gửi thư mời. Hãy chọn khách mời và gửi Thông báo thay đổi.");
    });
  }

  async function transition(action: "close-submission" | "complete" | "cancel") {
    if (action === "cancel") {
      const reason = await askReason("Huỷ hội nghị? Khách mời không còn nộp bài được.", { title: "Huỷ hội nghị", confirmLabel: "Huỷ hội nghị", tone: "danger" });
      if (reason) await run(() => transitionConference(conference.id, "cancel", { version: conference.version, reason }));
      return;
    }
    const message = action === "close-submission" ? "Đóng nhận bài? Sau khi đóng, báo cáo viên chỉ nộp lại được theo yêu cầu sửa còn hạn." : "Kết thúc hội nghị? Sau đó không còn thao tác nào trên hội nghị.";
    if (await confirm(message, { confirmLabel: action === "close-submission" ? "Đóng nhận bài" : "Kết thúc" })) await run(() => transitionConference(conference.id, action, { version: conference.version }));
  }

  const headerActions = <div className="button-row">
    {actions.includes("edit") && !editing ? <button className="button" type="button" onClick={() => setEditing(true)}>Sửa thông tin</button> : null}
    {actions.includes("close-submission") ? <button className="button" type="button" disabled={busy} onClick={() => void transition("close-submission")}>Đóng nhận bài</button> : null}
    {actions.includes("complete") ? <button className="button" type="button" disabled={busy} onClick={() => void transition("complete")}>Kết thúc hội nghị</button> : null}
    {actions.includes("export") ? <a className="button" href={conferenceExportUrl(conference.id)}>Xuất Excel</a> : null}
    {actions.includes("cancel") ? <button className="button danger" type="button" disabled={busy} onClick={() => void transition("cancel")}>Huỷ hội nghị</button> : null}
  </div>;

  const counts = summarize(conference);
  return <div className="form-section-inline">
    {editing ? <SectionCard title="Sửa thông tin hội nghị">
      <ConferenceFields form={form} onChange={setForm} units={units} unitLocked={!actions.includes("officer.assign")} />
      {conferenceFormProblem(form) ? <p className="field-hint">{conferenceFormProblem(form)}</p> : null}
      <div className="button-row"><button className="button primary" type="button" disabled={busy || !!conferenceFormProblem(form)} onClick={() => void save()}>Lưu</button><button className="button" type="button" onClick={() => setEditing(false)}>Đóng</button></div>
    </SectionCard> : <ConferenceInfoCard conference={conference} action={headerActions} />}

    <div className="kpi-grid">
      <div className="kpi-card"><span className="kpi-label">Đã mời</span><span className="kpi-value">{counts.invited}</span><span className="kpi-meta">{counts.draft} chưa gửi thư</span></div>
      <div className="kpi-card info"><span className="kpi-label">Nhận lời</span><span className="kpi-value">{counts.accepted}</span><span className="kpi-meta">{counts.waiting} chờ trả lời · {counts.declined} từ chối</span></div>
      <div className="kpi-card warning"><span className="kpi-label">Tóm tắt</span><span className="kpi-value">{counts.abstracts}/{counts.speakers}</span><span className="kpi-meta">báo cáo viên đã nhận lời</span></div>
      <div className="kpi-card"><span className="kpi-label">Toàn văn</span><span className="kpi-value">{counts.fullPapers}/{counts.speakers}</span><span className="kpi-meta">{counts.revisions} đang chờ sửa</span></div>
    </div>

    <OfficerCard conference={conference} busy={busy} run={run} />
    <ConferenceInvitationsPanel conference={conference} onChanged={onChanged} />
    {conference.status !== "draft" && conference.status !== "preparing" ? <ConferenceProgramPanel conference={conference} onConferenceChanged={onChanged} /> : null}

    <SectionCard title="Thư đã gửi">
      {!conference.mailings.length ? <p>Chưa gửi thư nào.</p> : <div className="table-wrap"><table className="data-table">
        <thead><tr><th>Thời điểm</th><th>Loại</th><th>Tiêu đề</th><th>Người gửi</th><th>Kết quả</th></tr></thead>
        <tbody>{conference.mailings.map((mailing) => <tr key={mailing.id}>
          <td>{dateTime.format(new Date(mailing.sentAt))}</td><td>{MAILING_KIND_LABELS[mailing.kind]}</td><td>{mailing.subject}{mailing.message ? <><br /><small>{mailing.message}</small></> : null}</td><td>{mailing.sentBy.displayName}</td>
          <td>{mailing.sent}/{mailing.recipientCount} đã gửi{mailing.failed ? ` · ${mailing.failed} lỗi` : ""}{mailing.skipped ? ` · ${mailing.skipped} chưa gửi email (chưa cấu hình)` : ""}</td>
        </tr>)}</tbody>
      </table></div>}
    </SectionCard>

    <SectionCard title="Lịch sử">
      {!conference.events.length ? <p>Chưa có thao tác.</p> : <div className="table-wrap"><table className="data-table">
        <thead><tr><th>Thời điểm</th><th>Thao tác</th><th>Người thực hiện</th><th>Ghi chú</th></tr></thead>
        <tbody>{conference.events.map((event) => <tr key={event.id}>
          <td>{dateTime.format(new Date(event.createdAt))}</td><td>{CONFERENCE_EVENT_LABELS[event.action] ?? event.action}</td><td>{event.actor?.displayName ?? "—"}</td><td>{event.reason ?? eventNote(event.facts)}</td>
        </tr>)}</tbody>
      </table></div>}
    </SectionCard>
  </div>;
}

function eventNote(facts: Record<string, unknown> | null) {
  if (!facts) return "";
  if (typeof facts.fullName === "string") return facts.fullName;
  if (typeof facts.recipients === "number") return `${facts.recipients} người nhận`;
  if (Array.isArray(facts.fields)) return `Sửa: ${facts.fields.length} mục`;
  if (typeof facts.versionNumber === "number") return `Lần ${facts.versionNumber}`;
  return "";
}

function summarize(conference: ManagedConference) {
  const invitations = conference.invitations.filter((item) => item.status !== "revoked");
  const speakers = invitations.filter((item) => item.kind === "speaker" && item.status === "accepted" && item.paper && item.paper.status !== "withdrawn");
  return {
    invited: invitations.length,
    draft: invitations.filter((item) => item.status === "draft").length,
    waiting: invitations.filter((item) => item.status === "sent").length,
    accepted: invitations.filter((item) => item.status === "accepted").length,
    declined: invitations.filter((item) => item.status === "declined").length,
    speakers: speakers.length,
    abstracts: speakers.filter((item) => item.paper!.latestAbstract).length,
    fullPapers: speakers.filter((item) => item.paper!.latestFullPaper).length,
    revisions: speakers.filter((item) => item.paper!.openRevisions.length).length
  };
}

function OfficerCard({ conference, busy, run }: { conference: ManagedConference; busy: boolean; run: (work: () => Promise<unknown>) => Promise<void> }) {
  const canAssign = conference.viewer.actions.includes("officer.assign");
  const askReason = useAskReason();
  const [candidates, setCandidates] = useState<Awaited<ReturnType<typeof listOfficerCandidates>>>([]);
  const [userId, setUserId] = useState("");
  useEffect(() => { if (canAssign) void listOfficerCandidates().then(setCandidates).catch(() => setCandidates([])); }, [canAssign]);

  async function revoke() {
    const reason = await askReason(`Thu hồi ${conference.officer?.displayName} khỏi vai trò chuyên viên phụ trách?`, { title: "Thu hồi chuyên viên", confirmLabel: "Thu hồi", tone: "danger" });
    if (reason) await run(() => revokeConferenceOfficer(conference.id, { version: conference.version, reason }));
  }

  return <SectionCard title="Chuyên viên phụ trách" subtitle={conference.officer ? undefined : "Hội nghị chưa có chuyên viên phụ trách: chưa mời khách và nhận bài được."}>
    <p>{conference.officer ? <strong>{conference.officer.displayName}</strong> : <span className="status-badge warning">Chưa giao</span>}</p>
    {canAssign ? <div className="form-section-inline">
      <div className="form-grid two">
        <label className="field"><span>{conference.officer ? "Giao lại cho" : "Giao cho"}</span><select value={userId} onChange={(event) => setUserId(event.target.value)}><option value="">Chọn chuyên viên</option>{candidates.filter((user) => user.id !== conference.officer?.id).map((user) => <option key={user.id} value={user.id}>{user.displayName}{user.unit ? ` · ${user.unit}` : ""}</option>)}</select></label>
      </div>
      <div className="button-row">
        <button className="button primary" type="button" disabled={busy || !userId} onClick={() => void run(async () => { await assignConferenceOfficer(conference.id, { version: conference.version, userId }); setUserId(""); })}>{conference.officer ? "Giao lại" : "Giao chuyên viên"}</button>
        {conference.officer ? <button className="button" type="button" disabled={busy} onClick={() => void revoke()}>Thu hồi</button> : null}
      </div>
    </div> : null}
  </SectionCard>;
}
