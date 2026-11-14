"use client";

import { useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { milestoneStatusLabel, type ProjectRecord } from "@/lib/projects-api";

type Run = (path: string, body?: Record<string, unknown>, confirmText?: string, method?: string) => Promise<boolean>;
type MilestoneRow = { title: string; dueDate: string; isImportant: boolean; responsibleMemberId: string };
type CheckpointRow = { title: string; dueDate: string; milestonePosition: string };
type Editing = { kind: "milestone" | "checkpoint"; id: string; title: string; dueDate: string; description: string; responsibleMemberId: string };

const emptyMilestone: MilestoneRow = { title: "", dueDate: "", isImportant: true, responsibleMemberId: "" };
const emptyCheckpoint: CheckpointRow = { title: "", dueDate: "", milestonePosition: "" };

function day(value?: string | null) { return value?.slice(0, 10) ?? ""; }
function date(value?: string | null) { return value ? new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC" }).format(new Date(value)) : "Chưa có"; }

/** Story 6.2: lập nhiều mốc/điểm báo cáo khi chuẩn bị; CV phụ trách sửa mốc thường khi đang thực hiện. Mốc quan trọng đổi qua yêu cầu điều chỉnh. */
export function ProjectPlanSection({ project, busy, canSetup, canMaintain, run }: { project: ProjectRecord; busy: boolean; canSetup: boolean; canMaintain: boolean; run: Run }) {
  const [milestones, setMilestones] = useState<MilestoneRow[]>([emptyMilestone]);
  const [checkpoints, setCheckpoints] = useState<CheckpointRow[]>([]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const activeMembers = project.members.filter((item) => item.status === "ACTIVE");
  const memberName = (memberId?: string | null) => project.members.find((item) => item.id === memberId)?.name ?? "Chưa phân công";
  const importantIds = new Set(project.milestones.filter((item) => item.isImportant).map((item) => item.id));
  const showSetup = canSetup && !project.milestones.length && !project.checkpoints.length;
  const setupReady = milestones.length + checkpoints.length > 0 && milestones.every((row) => row.title.trim() && row.dueDate) && checkpoints.every((row) => row.title.trim() && row.dueDate);
  const memberOptions = activeMembers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>);

  function saveSetup() {
    void run("setup", {
      milestones: milestones.map((row) => ({ title: row.title.trim(), dueDate: row.dueDate, isImportant: row.isImportant, ...(row.responsibleMemberId ? { responsibleMemberId: row.responsibleMemberId } : {}) })),
      checkpoints: checkpoints.map((row) => ({ title: row.title.trim(), dueDate: row.dueDate, ...(row.milestonePosition === "" ? {} : { milestonePosition: Number(row.milestonePosition) }) }))
    }, `Lưu ${milestones.length} mốc và ${checkpoints.length} điểm báo cáo cho đề tài? Sau khi lưu không thể thiết lập lại.`);
  }

  function saveEdit() {
    if (!editing) return;
    const original = editing.kind === "milestone" ? project.milestones.find((item) => item.id === editing.id) : project.checkpoints.find((item) => item.id === editing.id);
    if (!original) return;
    const changes: Record<string, unknown> = {};
    if (editing.title.trim() !== original.title) changes.title = editing.title.trim();
    if (editing.dueDate !== day(original.dueDate)) changes.dueDate = editing.dueDate;
    if (editing.kind === "milestone" && "responsibleMemberId" in original) {
      if (editing.responsibleMemberId !== (original.responsibleMemberId ?? "")) changes.responsibleMemberId = editing.responsibleMemberId || null;
      if (editing.description.trim() !== (original.description ?? "")) changes.description = editing.description.trim() || null;
    }
    if (!Object.keys(changes).length) { setEditing(null); return; }
    void run(`${editing.kind === "milestone" ? "milestones" : "checkpoints"}/${editing.id}`, { changes }, "Lưu thay đổi mốc này?", "PATCH").then((ok) => { if (ok) setEditing(null); });
  }

  const editable = (kind: Editing["kind"], item: { status: string; isImportant?: boolean; milestoneId?: string | null }) => canMaintain && item.status !== "completed" && !(kind === "milestone" ? item.isImportant : item.milestoneId && importantIds.has(item.milestoneId));
  const editForm = (withMilestoneFields: boolean) => editing ? <div className="form-grid two">
    <label className="field"><span>Tên</span><input value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} /></label>
    <label className="field"><span>Ngày đến hạn</span><input type="date" min={day(project.startDate)} max={day(project.endDate)} value={editing.dueDate} onChange={(event) => setEditing({ ...editing, dueDate: event.target.value })} /></label>
    {withMilestoneFields ? <><label className="field"><span>Thành viên phụ trách</span><select value={editing.responsibleMemberId} onChange={(event) => setEditing({ ...editing, responsibleMemberId: event.target.value })}><option value="">Chưa phân công</option>{memberOptions}</select></label>
      <label className="field"><span>Mô tả</span><textarea value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} /></label></> : null}
    <div className="button-row"><button className="button primary" type="button" disabled={busy || !editing.title.trim() || !editing.dueDate} onClick={saveEdit}>Lưu thay đổi</button><button className="button" type="button" disabled={busy} onClick={() => setEditing(null)}>Hủy</button></div>
  </div> : null;

  return <>
    {showSetup ? <SectionCard title="Lập mốc và điểm báo cáo" subtitle="Thiết lập một lần trước khi bắt đầu thực hiện. Hạn phải nằm trong thời gian đề tài.">
      <h3>Mốc thực hiện</h3>
      {milestones.map((row, index) => <div className="form-grid two" key={`m-${index}`}>
        <label className="field"><span>Tên mốc {index + 1}</span><input value={row.title} onChange={(event) => setMilestones(milestones.map((item, at) => at === index ? { ...item, title: event.target.value } : item))} /></label>
        <label className="field"><span>Ngày đến hạn</span><input type="date" min={day(project.startDate)} max={day(project.endDate)} value={row.dueDate} onChange={(event) => setMilestones(milestones.map((item, at) => at === index ? { ...item, dueDate: event.target.value } : item))} /></label>
        <label className="field"><span>Thành viên phụ trách</span><select value={row.responsibleMemberId} onChange={(event) => setMilestones(milestones.map((item, at) => at === index ? { ...item, responsibleMemberId: event.target.value } : item))}><option value="">Chưa phân công</option>{memberOptions}</select></label>
        <label className="field"><span><input type="checkbox" checked={row.isImportant} onChange={(event) => setMilestones(milestones.map((item, at) => at === index ? { ...item, isImportant: event.target.checked } : item))} /> Mốc quan trọng (chỉ đổi qua yêu cầu điều chỉnh)</span></label>
        <div className="button-row"><button className="button" type="button" disabled={busy} onClick={() => { setMilestones(milestones.filter((_, at) => at !== index)); setCheckpoints(checkpoints.map((item) => item.milestonePosition === String(index) ? { ...item, milestonePosition: "" } : item.milestonePosition !== "" && Number(item.milestonePosition) > index ? { ...item, milestonePosition: String(Number(item.milestonePosition) - 1) } : item)); }}>Bỏ mốc {index + 1}</button></div>
      </div>)}
      <div className="button-row"><button className="button" type="button" disabled={busy || milestones.length >= 100} onClick={() => setMilestones([...milestones, { ...emptyMilestone, isImportant: false }])}>Thêm mốc</button></div>
      <h3>Điểm báo cáo</h3>
      {!checkpoints.length ? <p>Chưa có điểm báo cáo.</p> : null}
      {checkpoints.map((row, index) => <div className="form-grid two" key={`c-${index}`}>
        <label className="field"><span>Tên điểm báo cáo {index + 1}</span><input value={row.title} onChange={(event) => setCheckpoints(checkpoints.map((item, at) => at === index ? { ...item, title: event.target.value } : item))} /></label>
        <label className="field"><span>Ngày đến hạn</span><input type="date" min={day(project.startDate)} max={day(project.endDate)} value={row.dueDate} onChange={(event) => setCheckpoints(checkpoints.map((item, at) => at === index ? { ...item, dueDate: event.target.value } : item))} /></label>
        <label className="field"><span>Gắn với mốc</span><select value={row.milestonePosition} onChange={(event) => setCheckpoints(checkpoints.map((item, at) => at === index ? { ...item, milestonePosition: event.target.value } : item))}><option value="">Không gắn mốc</option>{milestones.map((item, at) => <option key={at} value={String(at)}>{item.title.trim() || `Mốc ${at + 1}`}</option>)}</select></label>
        <div className="button-row"><button className="button" type="button" disabled={busy} onClick={() => setCheckpoints(checkpoints.filter((_, at) => at !== index))}>Bỏ điểm báo cáo {index + 1}</button></div>
      </div>)}
      <div className="button-row"><button className="button" type="button" disabled={busy || checkpoints.length >= 100} onClick={() => setCheckpoints([...checkpoints, emptyCheckpoint])}>Thêm điểm báo cáo</button><button className="button primary" type="button" disabled={busy || !setupReady} onClick={saveSetup}>Lưu mốc triển khai</button></div>
    </SectionCard> : null}

    <SectionCard title="Mốc và lịch báo cáo" subtitle={canMaintain ? "Mốc thường và điểm báo cáo mở được cập nhật trực tiếp; mốc quan trọng cần yêu cầu điều chỉnh." : undefined}>
      {!project.milestones.length && !project.checkpoints.length ? <p>Chưa thiết lập mốc.</p> : null}
      {project.milestones.length ? <><h3>Mốc thực hiện</h3><ul>{project.milestones.map((item) => <li key={item.id}>
        {item.title} · {date(item.dueDate)} · {milestoneStatusLabel(item.status)}{item.isImportant ? " · Mốc quan trọng" : ""} · Phụ trách: {memberName(item.responsibleMemberId)}
        {editable("milestone", item) && editing?.id !== item.id ? <> <button className="button" type="button" disabled={busy} onClick={() => setEditing({ kind: "milestone", id: item.id, title: item.title, dueDate: day(item.dueDate), description: item.description ?? "", responsibleMemberId: item.responsibleMemberId ?? "" })}>Sửa</button></> : null}
        {editing?.id === item.id ? editForm(true) : null}
      </li>)}</ul></> : null}
      {project.checkpoints.length ? <><h3>Điểm báo cáo</h3><ul>{project.checkpoints.map((item) => <li key={item.id}>
        {item.title} · {date(item.dueDate)} · {milestoneStatusLabel(item.status)}
        {editable("checkpoint", item) && editing?.id !== item.id ? <> <button className="button" type="button" disabled={busy} onClick={() => setEditing({ kind: "checkpoint", id: item.id, title: item.title, dueDate: day(item.dueDate), description: "", responsibleMemberId: "" })}>Sửa</button></> : null}
        {editing?.id === item.id ? editForm(false) : null}
      </li>)}</ul></> : null}
    </SectionCard>
  </>;
}
