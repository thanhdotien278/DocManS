"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ReasonDialog } from "@/components/research-proposals/proposal-council-panel";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { loadMyReviewAssignments, respondToReviewInvitation, type ReviewInvitationPreview, type ReviewerGrantedItem, type ReviewerQueueItem } from "@/lib/proposal-evaluations-api";

function formatDate(value: string) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value)) : "Không đặt hạn";
}

/**
 * ST-3.2 — the reviewer's queue. It is built from assignment records, so it can only ever contain
 * proposals this reviewer was assigned to; there is no client-side filter of a wider list.
 */
export function ReviewerQueuePanel() {
  const [assignments, setAssignments] = useState<ReviewerQueueItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [responding, setResponding] = useState<{ invitation: ReviewInvitationPreview; decision: "accept" | "decline" } | null>(null);

  async function load() {
    try {
      setAssignments(await loadMyReviewAssignments());
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // Ném lỗi lại để dialog hiển thị ngay tại chỗ; thành công thì đóng dialog và tải lại hàng đợi.
  async function respond(reason: string) {
    if (!responding) return;
    await respondToReviewInvitation(responding.invitation.proposalId, responding.invitation.id, responding.decision, reason);
    setResponding(null);
    await load();
  }

  if (state === "loading") {
    return <p className="state-message">Đang tải danh sách hồ sơ được phân công...</p>;
  }

  if (state === "error") {
    return <p className="state-message error">Không thể tải danh sách hồ sơ được phân công.</p>;
  }

  const invitations = assignments.filter((assignment): assignment is ReviewInvitationPreview => assignment.access === "preview");
  const granted = assignments.filter((assignment): assignment is ReviewerGrantedItem => assignment.access === "granted");
  const isSecretary = (assignment: ReviewerGrantedItem) => assignment.assignmentRole === "council_secretary" || assignment.scoring === false;
  const pendingCount = granted.filter((assignment) => !isSecretary(assignment) && assignment.myReviewStatus !== "submitted").length;
  // Lời mời đã từ chối/đã nhận chỉ hiện nhãn trạng thái: không có nút trả lời, không có liên kết mở hồ sơ.
  const replyCell = (invitation: ReviewInvitationPreview) => invitation.invitationStatus === "invited" ? (
    <>
      <button className="button primary" type="button" onClick={() => setResponding({ invitation, decision: "accept" })}>Chấp nhận</button>{" "}
      <button className="button" type="button" onClick={() => setResponding({ invitation, decision: "decline" })}>Từ chối</button>
    </>
  ) : (
    <span className="record-meta">{invitation.invitationStatus === "accepted" ? "Đã chấp nhận · Chờ Ban giám đốc ký thành lập hội đồng" : invitation.invitationStatus === "declined" ? "Đã từ chối" : invitation.invitationStatusLabel}</span>
  );
  const actionLabel = (assignment: ReviewerGrantedItem) => (isSecretary(assignment) ? "Soạn biên bản" : "Chấm phiếu");

  return (
    <SectionCard
      title="Hồ sơ được phân công"
      subtitle={`${granted.length} hồ sơ · ${pendingCount} phiếu chưa gửi · ${invitations.length} lời mời`}
    >
      {invitations.length ? (
        <>
        <div className="section-mini-heading">Lời mời</div>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Lời mời đánh giá">
          <table className="data-table">
            <thead>
              <tr><th>Hồ sơ</th><th>Vai trò</th><th>Hạn</th><th>Người mời</th><th>Trả lời</th></tr>
            </thead>
            <tbody>
              {invitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td><span className="record-title">{invitation.proposal.title}</span></td>
                  <td>{invitation.assignmentRoleLabel}</td>
                  <td>{formatDate(invitation.dueDate)}</td>
                  <td>{invitation.assignedByDisplayName}</td>
                  <td>
                    {replyCell(invitation)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mobile-list">
          {invitations.map((invitation) => (
            <article className="list-card" key={invitation.id}>
              <span className="record-title">{invitation.proposal.title}</span>
              <span className="record-meta">{invitation.assignmentRoleLabel} · {invitation.dueDate ? `Hạn ${formatDate(invitation.dueDate)}` : "Không đặt hạn"}</span>
              <span className="record-meta">Người mời: {invitation.assignedByDisplayName}</span>
              <div>{replyCell(invitation)}</div>
            </article>
          ))}
        </div>
        </>
      ) : null}
      {granted.length === 0 && invitations.length === 0 ? (
        <EmptyState
          title="Chưa có hồ sơ được phân công"
          message="Khi chuyên viên quản lý khoa học phân công đánh giá, hồ sơ sẽ xuất hiện ở đây."
        />
      ) : granted.length === 0 ? null : (
        <>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Danh sách phân công đánh giá">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hồ sơ</th>
                  <th>Vai trò</th>
                  <th>Hạn đánh giá</th>
                  <th>Trạng thái hồ sơ</th>
                  <th>Phiếu của tôi</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {granted.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>
                      <Link className="record-title" href={`/proposals/${assignment.proposal.id}`}>
                        {assignment.proposal.title}
                      </Link>
                      <span className="record-meta">{assignment.proposal.code || "Chưa cấp mã"}</span>
                    </td>
                    <td>{assignment.assignmentRoleLabel}</td>
                    <td>{formatDate(assignment.dueDate)}</td>
                    <td>
                      <StatusBadge status={assignment.proposal.status} />
                    </td>
                    <td>
                      {assignment.myReviewStatus === "submitted" ? (
                        <>
                          <span className="record-title">Đã gửi</span>
                          <span className="record-meta">{formatDate(assignment.myReviewSubmittedAt)}</span>
                        </>
                      ) : isSecretary(assignment) ? (
                        <span className="record-meta">Thư ký: không chấm phiếu</span>
                      ) : (
                        <span className="record-meta">Chưa gửi phiếu</span>
                      )}
                    </td>
                    <td><Link className="button" href={`/proposals/${assignment.proposal.id}`}>{actionLabel(assignment)}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-list">
            {granted.map((assignment) => (
              <article className="list-card" key={assignment.id}>
                <div className="list-card-header">
                  <Link className="record-title" href={`/proposals/${assignment.proposal.id}`}>
                    {assignment.proposal.title}
                  </Link>
                  <StatusBadge status={assignment.proposal.status} />
                </div>
                <span className="record-meta">
                  {assignment.assignmentRoleLabel}
                  {assignment.dueDate ? ` · Hạn ${formatDate(assignment.dueDate)}` : " · Không đặt hạn"}
                </span>
                <span className="record-meta">
                  {isSecretary(assignment) ? "Thư ký: không chấm phiếu" : `Phiếu của tôi: ${assignment.myReviewStatus === "submitted" ? "Đã gửi" : "Chưa gửi"}`}
                </span>
                <Link className="button" href={`/proposals/${assignment.proposal.id}`}>{actionLabel(assignment)}</Link>
              </article>
            ))}
          </div>
        </>
      )}
      {responding?.decision === "decline" ? (
        <ReasonDialog title="Từ chối lời mời" description={responding.invitation.proposal.title} reasonLabel="Lý do từ chối" confirmLabel="Gửi từ chối" onConfirm={respond} onClose={() => setResponding(null)} />
      ) : null}
      {responding?.decision === "accept" ? (
        <ReasonDialog title="Chấp nhận lời mời" description={`${responding.invitation.assignmentRoleLabel} · ${responding.invitation.proposal.title}. Sau khi Ban giám đốc ký thành lập hội đồng, bạn được đọc hồ sơ.`} confirmLabel="Chấp nhận" onConfirm={respond} onClose={() => setResponding(null)} />
      ) : null}
    </SectionCard>
  );
}
