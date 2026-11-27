"use client";

import { useState } from "react";
import { useNotice } from "@/components/ui/confirm-dialog";
import { exportProgramWord, programTime, sessionsByDay } from "@/lib/conference-program-word";
import { formatIntakeDate } from "@/lib/intake-dates";
import { proceedingsDownloadUrl, type ProceedingsInfo, type PublishedProgram } from "@/lib/conferences-api";

/** Chương trình chi tiết đã chốt: theo ngày, phiên toàn thể và các tiểu ban, kèm nút tải bản Word. */
export function PublishedProgramView({ program }: { program: PublishedProgram }) {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try { await exportProgramWord(program.snapshot, program.versionNumber); }
    catch (error) { await notice(error instanceof Error ? error.message : "Không xuất được bản Word."); }
    finally { setBusy(false); }
  }
  return <div className="form-section-inline">
    <div className="button-row">
      <span>Bản {program.versionNumber}, chốt ngày {formatIntakeDate(program.publishedAt)}</span>
      <button className="button" type="button" disabled={busy} onClick={() => void download()}>{busy ? "Đang xuất" : "Tải bản Word"}</button>
    </div>
    {sessionsByDay(program.snapshot).map(([day, sessions]) => <div key={day} className="form-section-inline">
      <h3>Ngày {day}</h3>
      {sessions.map((session, index) => <div key={`${session.name}-${index}`}>
        <p><strong>{session.kind === "plenary" ? "Phiên toàn thể" : "Tiểu ban"}: {session.name}</strong> · {programTime(session.startsAt)} – {programTime(session.endsAt)}{session.room ? ` · ${session.room}` : ""}</p>
        {session.chairName || session.secretaryName ? <p><small>{[session.chairName ? `Chủ toạ: ${session.chairName}` : "", session.secretaryName ? `Thư ký: ${session.secretaryName}` : ""].filter(Boolean).join(" · ")}</small></p> : null}
        <div className="table-wrap"><table className="data-table">
          <thead><tr><th>Thời gian</th><th>Tên báo cáo</th><th>Báo cáo viên</th></tr></thead>
          <tbody>{session.items.map((item, itemIndex) => item.type === "break"
            ? <tr key={itemIndex}><td>{programTime(item.startsAt)} – {programTime(item.endsAt)}</td><td colSpan={2}><em>{item.label}</em></td></tr>
            : <tr key={itemIndex}><td>{programTime(item.startsAt)} – {programTime(item.endsAt)}</td><td>{item.title}</td><td>{item.speaker}{item.organization ? <><br /><small>{item.organization}</small></> : null}</td></tr>)}</tbody>
        </table></div>
      </div>)}
    </div>)}
  </div>;
}

export function ProceedingsLink({ conferenceId, proceedings }: { conferenceId: string; proceedings: ProceedingsInfo }) {
  return <p>
    <a className="button" href={proceedingsDownloadUrl(conferenceId, proceedings.id)}>Tải kỷ yếu</a>{" "}
    <small>{proceedings.fileName} · bản {proceedings.versionNumber} · {formatIntakeDate(proceedings.uploadedAt)}{proceedings.isbn ? ` · ISBN ${proceedings.isbn}` : ""}</small>
  </p>;
}
