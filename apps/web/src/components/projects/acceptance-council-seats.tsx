"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { INVITATION_STATUS_LABELS, listMyAcceptanceSeats, projectStatusLabel, type AcceptanceCouncilSeat } from "@/lib/projects-api";

/** Ghế hội đồng nghiệm thu (đang mời/đã nhận lời) của người xem; rỗng thì ẩn, lỗi thì báo một dòng. */
export function AcceptanceCouncilSeats() {
  const [seats, setSeats] = useState<AcceptanceCouncilSeat[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { listMyAcceptanceSeats().then(setSeats).catch((thrown) => setError(thrown instanceof Error ? thrown.message : "Không tải được danh sách.")); }, []);
  if (error) return <p className="state-message error" role="alert">Không tải được hội đồng nghiệm thu của bạn: {error}</p>;
  if (!seats.length) return null;
  const status = (seat: AcceptanceCouncilSeat) => seat.establishedAt ? "Đã thành lập" : INVITATION_STATUS_LABELS[seat.invitationStatus];
  const tone = (seat: AcceptanceCouncilSeat) => seat.invitationStatus === "invited" ? "warning" : "success";
  const href = (seat: AcceptanceCouncilSeat) => `/projects/${seat.projectId}/acceptance-council`;
  return (
    <SectionCard title="Hội đồng nghiệm thu" subtitle="Lời mời và vị trí của bạn trong hội đồng nghiệm thu đề tài.">
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Hội đồng nghiệm thu của tôi">
        <table className="data-table">
          <thead><tr><th>Đề tài</th><th>Vị trí</th><th>Trạng thái</th><th>Trạng thái đề tài</th><th>Thao tác</th></tr></thead>
          <tbody>
            {seats.map((seat) => (
              <tr key={seat.memberId}>
                <td><span className="record-title">{seat.projectTitle}</span></td>
                <td>{seat.councilRoleLabel}</td>
                <td><span className={`status-badge ${tone(seat)}`}>{status(seat)}</span></td>
                <td>{projectStatusLabel(seat.projectStatus)}</td>
                <td><Link className="button" href={href(seat)}>{seat.invitationStatus === "invited" ? "Xem lời mời" : "Mở hội đồng"}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-list">
        {seats.map((seat) => (
          <article className="list-card" key={seat.memberId}>
            <div className="list-card-header">
              <span className="record-title">{seat.projectTitle}</span>
              <span className={`status-badge ${tone(seat)}`}>{status(seat)}</span>
            </div>
            <span className="record-meta">{seat.councilRoleLabel} · {projectStatusLabel(seat.projectStatus)}</span>
            <Link className="button" href={href(seat)}>{seat.invitationStatus === "invited" ? "Xem lời mời" : "Mở hội đồng"}</Link>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
