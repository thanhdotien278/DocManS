"use client";

import { useEffect, useState } from "react";
import { useConfirm, useNotice } from "@/components/ui/confirm-dialog";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { SectionCard } from "@/components/ui/section-card";
import type { ApiError } from "@/lib/api-client";
import { programTime } from "@/lib/conference-program-word";
import { formatIntakeDate, toIntakeDateInput } from "@/lib/intake-dates";
import {
  createSession,
  deleteSession,
  getProgram,
  getPublished,
  publishProgram,
  sendMailing,
  setSessionSlots,
  setSlotTime,
  updateProgramSettings,
  updateSession,
  uploadProceedings,
  type ManagedConference,
  type ProgramSession,
  type ProgramSlot,
  type ProgramState,
  type PublishedProgram,
  type SessionInput
} from "@/lib/conferences-api";
import { ProceedingsLink, PublishedProgramView } from "./program-view";

/** Giờ nhập theo lịch Việt Nam (ngày YYYY-MM-DD, giờ HH:MM) → thời điểm ISO. */
function vietnamInstant(day: string, time: string) {
  return new Date(`${day}T${time}:00+07:00`).toISOString();
}

function timeInput(value: string) {
  return programTime(value);
}

type BreakForm = { label: string; start: string; end: string };
type SessionForm = { id?: string; kind: "plenary" | "track"; name: string; room: string; chairName: string; secretaryName: string; day: string; start: string; end: string; slotMinutes: string; sortOrder: number; breaks: BreakForm[] };

function sessionToForm(session: ProgramSession): SessionForm {
  return {
    id: session.id, kind: session.kind, name: session.name, room: session.room ?? "", chairName: session.chairName ?? "", secretaryName: session.secretaryName ?? "",
    day: toIntakeDateInput(session.startsAt), start: timeInput(session.startsAt), end: timeInput(session.endsAt), slotMinutes: session.slotMinutes ? String(session.slotMinutes) : "", sortOrder: session.sortOrder,
    breaks: session.breaks.map((item) => ({ label: item.label, start: timeInput(item.startsAt), end: timeInput(item.endsAt) }))
  };
}

function formToInput(form: SessionForm): SessionInput {
  return {
    kind: form.kind, name: form.name.trim(), room: form.room.trim() || null, chairName: form.chairName.trim() || null, secretaryName: form.secretaryName.trim() || null,
    startsAt: vietnamInstant(form.day, form.start), endsAt: vietnamInstant(form.day, form.end), slotMinutes: form.slotMinutes ? Number(form.slotMinutes) : null, sortOrder: form.sortOrder,
    breaks: form.breaks.filter((item) => item.start && item.end).map((item) => ({ label: item.label.trim() || "Giải lao", startsAt: vietnamInstant(form.day, item.start), endsAt: vietnamInstant(form.day, item.end) }))
  };
}

export function ConferenceProgramPanel({ conference, onConferenceChanged }: { conference: ManagedConference; onConferenceChanged: () => Promise<void> }) {
  const actions = conference.viewer.actions;
  const canManage = actions.includes("program.manage");
  const canProceedings = actions.includes("proceedings.manage");
  const confirm = useConfirm();
  const notice = useNotice();
  const [state, setState] = useState<ProgramState | null>(null);
  const [published, setPublished] = useState<PublishedProgram | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<SessionForm | null>(null);
  const [minutes, setMinutes] = useState("");
  const [manual, setManual] = useState<{ slot: ProgramSlot; day: string; start: string; end: string } | null>(null);
  const [book, setBook] = useState<{ file: File | null; isbn: string; note: string }>({ file: null, isbn: "", note: "" });

  async function load() {
    try {
      const [program, latest] = await Promise.all([getProgram(conference.id), getPublished(conference.id)]);
      setState(program); setPublished(latest.program); setMinutes(String(program.defaultSlotMinutes)); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được chương trình."); }
  }
  useEffect(() => { void load(); }, [conference.id, conference.status]);

  async function run(work: () => Promise<ProgramState | unknown>, success?: string) {
    setBusy(true);
    try {
      const result = await work();
      if (result && typeof result === "object" && "sessions" in result) setState(result as ProgramState);
      else await load();
      if (success) await notice(success);
    } catch (cause) { await notice(cause instanceof Error ? cause.message : "Không thực hiện được thao tác."); }
    finally { setBusy(false); }
  }

  const accepted = conference.invitations.filter((item) => item.status === "accepted").map((item) => item.id);

  async function publish() {
    setBusy(true);
    try {
      let result;
      try { result = await publishProgram(conference.id); }
      catch (cause) {
        const apiError = cause as ApiError;
        if (apiError.code !== "PROGRAM_UNSCHEDULED") throw cause;
        if (!(await confirm(`${apiError.message} Vẫn chốt chương trình?`, { confirmLabel: "Vẫn chốt" }))) return;
        result = await publishProgram(conference.id, true);
      }
      await onConferenceChanged();
      await load();
      if (accepted.length && (await confirm(`Đã chốt chương trình bản ${result.versionNumber} (${result.papers} báo cáo). Gửi chương trình cho ${accepted.length} khách mời đã nhận lời ngay bây giờ?`, { confirmLabel: "Gửi chương trình" }))) {
        const sent = await sendMailing(conference.id, { kind: "program", invitationIds: accepted });
        await onConferenceChanged();
        await notice(`Đã gửi chương trình cho ${sent.sent}/${sent.recipients} người.`);
      }
    } catch (cause) { await notice(cause instanceof Error ? cause.message : "Không chốt được chương trình."); }
    finally { setBusy(false); }
  }

  async function sendKind(kind: "program" | "proceedings") {
    if (!accepted.length) { await notice("Chưa có khách mời nào nhận lời."); return; }
    if (!(await confirm(`Gửi ${kind === "program" ? "chương trình" : "kỷ yếu"} cho ${accepted.length} khách mời đã nhận lời?`, { confirmLabel: "Gửi" }))) return;
    await run(async () => { const sent = await sendMailing(conference.id, { kind, invitationIds: accepted }); await onConferenceChanged(); await notice(`Đã gửi cho ${sent.sent}/${sent.recipients} người.`); });
  }

  async function moveSlot(session: ProgramSession, index: number, delta: number) {
    const ids = session.slots.map((slot) => slot.paperId);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await run(() => setSessionSlots(conference.id, session.id, ids));
  }

  if (error) return <SectionCard title="Chương trình chi tiết"><p role="alert">{error}</p></SectionCard>;
  if (!state) return <SectionCard title="Chương trình chi tiết"><p>Đang tải…</p></SectionCard>;
  const otherPapers = (session: ProgramSession) => [
    ...state.unscheduled.map((paper) => ({ id: paper.id, label: `${paper.title ?? "(chưa có tên)"} · ${paper.speaker}`, from: "Chưa xếp" })),
    ...state.sessions.filter((item) => item.id !== session.id).flatMap((item) => item.slots.map((slot) => ({ id: slot.paperId, label: `${slot.title ?? ""} · ${slot.speaker}`, from: item.name })))
  ];
  const conferenceDay = toIntakeDateInput(conference.startsAt);

  return <SectionCard title="Chương trình chi tiết" subtitle={canManage ? "Nhập phiên toàn thể và các tiểu ban theo danh sách trưởng tiểu ban gửi; hệ thống xếp giờ theo thời lượng mỗi báo cáo." : conference.status === "inviting" || conference.status === "preparing" ? "Lập chương trình sau khi đóng nhận bài." : undefined}>
    {state.changedSincePublish ? <p role="status"><span className="status-badge warning">Đã sửa sau lần chốt gần nhất</span> Chốt lại và gửi thông báo thay đổi để khách mời có bản mới.</p> : null}
    {canManage ? <div className="button-row">
      <label className="field"><span>Thời lượng mặc định mỗi báo cáo (phút)</span><input type="number" min={1} max={240} value={minutes} onChange={(event) => setMinutes(event.target.value)} /></label>
      <button className="button" type="button" disabled={busy || Number(minutes) === state.defaultSlotMinutes || !(Number(minutes) >= 1)} onClick={() => void run(() => updateProgramSettings(conference.id, Number(minutes)))}>Lưu thời lượng</button>
      <button className="button" type="button" disabled={busy} onClick={() => setForm({ kind: state.sessions.some((item) => item.kind === "plenary") ? "track" : "plenary", name: "", room: "", chairName: "", secretaryName: "", day: conferenceDay, start: "08:00", end: "11:30", slotMinutes: "", sortOrder: state.sessions.length, breaks: [] })}>Thêm phiên</button>
      <button className="button primary" type="button" disabled={busy || !state.sessions.length || state.issues.length > 0} onClick={() => void publish()}>Chốt chương trình</button>
    </div> : null}

    {state.issues.length ? <div role="alert"><strong>Cần sửa trước khi chốt:</strong><ul>{state.issues.map((issue, index) => <li key={index}>{issue.message}</li>)}</ul></div> : null}
    {state.unscheduled.length ? <p className="field-hint">{state.unscheduled.length} báo cáo đã nộp toàn văn chưa được xếp: {state.unscheduled.map((paper) => paper.speaker).join(", ")}.</p> : null}

    {state.sessions.map((session) => <div key={session.id} className="form-section-inline">
      <div className="button-row">
        <strong>{session.kind === "plenary" ? "Phiên toàn thể" : "Tiểu ban"}: {session.name}</strong>
        <span>{formatIntakeDate(session.startsAt)} · {programTime(session.startsAt)} – {programTime(session.endsAt)}{session.room ? ` · ${session.room}` : ""} · {session.slotMinutes ?? state.defaultSlotMinutes} phút/báo cáo</span>
        {canManage ? <>
          <button className="button" type="button" disabled={busy} onClick={() => setForm(sessionToForm(session))}>Sửa</button>
          <button className="button danger" type="button" disabled={busy} onClick={() => void (async () => { if (await confirm(`Xoá phiên ${session.name}? Báo cáo trong phiên trở về danh sách chưa xếp.`, { confirmLabel: "Xoá phiên", tone: "danger" })) await run(() => deleteSession(conference.id, session.id)); })()}>Xoá</button>
        </> : null}
      </div>
      {session.chairName || session.secretaryName ? <p><small>{[session.chairName ? `Chủ toạ: ${session.chairName}` : "", session.secretaryName ? `Thư ký: ${session.secretaryName}` : ""].filter(Boolean).join(" · ")}</small></p> : null}
      {session.breaks.length ? <p><small>Nghỉ: {session.breaks.map((item) => `${item.label} ${programTime(item.startsAt)}–${programTime(item.endsAt)}`).join("; ")}</small></p> : null}
      {session.slots.length ? <div className="table-wrap"><table className="data-table">
        <thead><tr><th>#</th><th>Giờ</th><th>Báo cáo</th><th>Báo cáo viên</th>{canManage ? <th /> : null}</tr></thead>
        <tbody>{session.slots.map((slot, index) => <tr key={slot.id}>
          <td>{index + 1}</td>
          <td>{slot.startsAt && slot.endsAt ? `${programTime(slot.startsAt)} – ${programTime(slot.endsAt)}` : "—"}{slot.manuallyAdjusted ? <><br /><span className="status-badge info">Đặt tay</span></> : null}{slot.overflowMinutes ? <><br /><span className="status-badge danger">Vượt {slot.overflowMinutes} phút</span></> : null}</td>
          <td>{slot.title ?? "(chưa có tên)"}</td>
          <td>{slot.speaker}</td>
          {canManage ? <td><div className="button-row">
            <button className="button" type="button" aria-label="Lên" disabled={busy || index === 0} onClick={() => void moveSlot(session, index, -1)}>↑</button>
            <button className="button" type="button" aria-label="Xuống" disabled={busy || index === session.slots.length - 1} onClick={() => void moveSlot(session, index, 1)}>↓</button>
            <button className="button" type="button" disabled={busy} onClick={() => setManual({ slot, day: toIntakeDateInput(session.startsAt), start: slot.startsAt ? programTime(slot.startsAt) : programTime(session.startsAt), end: slot.endsAt ? programTime(slot.endsAt) : programTime(session.startsAt) })}>Đặt giờ</button>
            {slot.manuallyAdjusted ? <button className="button" type="button" disabled={busy} onClick={() => void run(() => setSlotTime(conference.id, slot.id, { clear: true }))}>Bỏ đặt tay</button> : null}
            <button className="button" type="button" disabled={busy} onClick={() => void run(() => setSessionSlots(conference.id, session.id, session.slots.filter((item) => item.id !== slot.id).map((item) => item.paperId)))}>Bỏ khỏi phiên</button>
          </div></td> : null}
        </tr>)}</tbody>
      </table></div> : <p><small>Chưa có báo cáo trong phiên.</small></p>}
      {canManage && otherPapers(session).length ? <label className="field"><span>Thêm báo cáo vào phiên</span><select value="" disabled={busy} onChange={(event) => { const paperId = event.target.value; if (paperId) void run(() => setSessionSlots(conference.id, session.id, [...session.slots.map((slot) => slot.paperId), paperId])); }}>
        <option value="">Chọn báo cáo</option>
        {otherPapers(session).map((paper) => <option key={paper.id} value={paper.id}>{paper.label} ({paper.from})</option>)}
      </select></label> : null}
    </div>)}

    {state.versions.length ? <p><small>Các lần chốt: {state.versions.map((item) => `bản ${item.versionNumber} (${formatIntakeDate(item.publishedAt)}, ${item.publishedBy.displayName})`).join("; ")}</small></p> : null}
    {published ? <>
      <h3>Chương trình đã chốt</h3>
      {actions.includes("mailing.send") ? <div className="button-row"><button className="button" type="button" disabled={busy} onClick={() => void sendKind("program")}>Gửi chương trình cho khách mời</button></div> : null}
      <PublishedProgramView program={published} />
    </> : null}

    {published || state.proceedings.length ? <>
      <h3>Kỷ yếu</h3>
      {state.proceedings[0] ? <ProceedingsLink conferenceId={conference.id} proceedings={state.proceedings[0]} /> : <p>Chưa tải kỷ yếu.</p>}
      {canProceedings ? <div className="form-section-inline">
        <div className="form-grid two">
          <label className="field"><span>Tệp kỷ yếu (.pdf hoặc .docx)</span><input type="file" accept=".pdf,.doc,.docx" onChange={(event) => setBook({ ...book, file: event.target.files?.[0] ?? null })} /></label>
          <label className="field"><span>ISBN (tuỳ chọn)</span><input value={book.isbn} maxLength={40} onChange={(event) => setBook({ ...book, isbn: event.target.value })} /></label>
          <label className="field"><span>Ghi chú (tuỳ chọn)</span><input value={book.note} maxLength={1000} onChange={(event) => setBook({ ...book, note: event.target.value })} /></label>
        </div>
        <div className="button-row">
          <button className="button primary" type="button" disabled={busy || !book.file} onClick={() => void run(async () => { const result = await uploadProceedings(conference.id, book.file!, { isbn: book.isbn.trim() || undefined, note: book.note.trim() || undefined }); setBook({ file: null, isbn: "", note: "" }); return result; }, "Đã tải kỷ yếu lên.")}>{state.proceedings.length ? "Tải bản kỷ yếu mới" : "Tải kỷ yếu lên"}</button>
          {state.proceedings.length ? <button className="button" type="button" disabled={busy} onClick={() => void sendKind("proceedings")}>Gửi kỷ yếu cho khách mời</button> : null}
        </div>
      </div> : null}
    </> : null}

    {form ? <ModalDialog title={form.id ? "Sửa phiên" : "Thêm phiên"} onClose={() => setForm(null)} footer={<div className="button-row"><button className="button" type="button" onClick={() => setForm(null)}>Hủy</button><button className="button primary" type="button" disabled={busy || !form.name.trim() || !form.day || !form.start || !form.end || form.end <= form.start} onClick={() => { const input = formToInput(form); const id = form.id; setForm(null); void run(() => (id ? updateSession(conference.id, id, input) : createSession(conference.id, input))); }}>Lưu</button></div>}>
      <div className="form-grid two">
        <label className="field"><span>Loại phiên</span><select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as "plenary" | "track" })}><option value="plenary">Phiên toàn thể (mọi người cùng dự)</option><option value="track">Tiểu ban (chạy song song)</option></select></label>
        <label className="field"><span>Tên phiên</span><input value={form.name} maxLength={300} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className="field"><span>Phòng</span><input value={form.room} maxLength={200} onChange={(event) => setForm({ ...form, room: event.target.value })} /></label>
        <label className="field"><span>Chủ toạ / trưởng tiểu ban</span><input value={form.chairName} maxLength={300} onChange={(event) => setForm({ ...form, chairName: event.target.value })} /></label>
        <label className="field"><span>Thư ký</span><input value={form.secretaryName} maxLength={300} onChange={(event) => setForm({ ...form, secretaryName: event.target.value })} /></label>
        <label className="field"><span>Ngày</span><input type="date" value={form.day} min={toIntakeDateInput(conference.startsAt)} max={toIntakeDateInput(conference.endsAt)} onChange={(event) => setForm({ ...form, day: event.target.value })} /></label>
        <label className="field"><span>Giờ bắt đầu</span><input type="time" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} /></label>
        <label className="field"><span>Giờ kết thúc</span><input type="time" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} /></label>
        <label className="field"><span>Thời lượng mỗi báo cáo (phút, để trống = mặc định)</span><input type="number" min={1} max={240} value={form.slotMinutes} onChange={(event) => setForm({ ...form, slotMinutes: event.target.value })} /></label>
      </div>
      <fieldset className="form-section-inline"><legend>Khoảng nghỉ</legend>
        {form.breaks.map((item, index) => <div className="form-grid two" key={index}>
          <label className="field"><span>Tên</span><input value={item.label} maxLength={100} placeholder="Giải lao" onChange={(event) => setForm({ ...form, breaks: form.breaks.map((entry, i) => (i === index ? { ...entry, label: event.target.value } : entry)) })} /></label>
          <label className="field"><span>Từ</span><input type="time" value={item.start} onChange={(event) => setForm({ ...form, breaks: form.breaks.map((entry, i) => (i === index ? { ...entry, start: event.target.value } : entry)) })} /></label>
          <label className="field"><span>Đến</span><input type="time" value={item.end} onChange={(event) => setForm({ ...form, breaks: form.breaks.map((entry, i) => (i === index ? { ...entry, end: event.target.value } : entry)) })} /></label>
          <div className="button-row"><button className="button" type="button" onClick={() => setForm({ ...form, breaks: form.breaks.filter((_, i) => i !== index) })}>Bỏ</button></div>
        </div>)}
        <div className="button-row"><button className="button" type="button" onClick={() => setForm({ ...form, breaks: [...form.breaks, { label: "Giải lao", start: "", end: "" }] })}>Thêm khoảng nghỉ</button></div>
      </fieldset>
    </ModalDialog> : null}

    {manual ? <ModalDialog title="Đặt giờ báo cáo" onClose={() => setManual(null)} footer={<div className="button-row"><button className="button" type="button" onClick={() => setManual(null)}>Hủy</button><button className="button primary" type="button" disabled={busy || !manual.start || !manual.end || manual.end <= manual.start} onClick={() => { const draft = manual; setManual(null); void run(() => setSlotTime(conference.id, draft.slot.id, { startsAt: vietnamInstant(draft.day, draft.start), endsAt: vietnamInstant(draft.day, draft.end) })); }}>Lưu</button></div>}>
      <p>{manual.slot.title ?? ""} · {manual.slot.speaker}</p>
      <p className="field-hint">Giờ đặt tay được giữ nguyên khi hệ thống xếp lại; các báo cáo khác xếp vào chỗ trống quanh nó.</p>
      <div className="form-grid two">
        <label className="field"><span>Từ</span><input type="time" value={manual.start} onChange={(event) => setManual({ ...manual, start: event.target.value })} /></label>
        <label className="field"><span>Đến</span><input type="time" value={manual.end} onChange={(event) => setManual({ ...manual, end: event.target.value })} /></label>
      </div>
    </ModalDialog> : null}
  </SectionCard>;
}
