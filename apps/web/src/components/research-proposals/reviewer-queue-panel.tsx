"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
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
  const [actionError, setActionError] = useState("");

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

  async function respond(invitation: ReviewInvitationPreview, decision: "accept" | "decline") {
    setActionError("");
    let reason = "";
    if (decision === "decline") {
      reason = window.prompt("Nhập lý do từ chối lời mời:")?.trim() ?? "";
      if (!reason) {
        setActionError("Cần nhập lý do khi từ chối lời mời.");
        return;
      }
    }
    try {
      await respondToReviewInvitation(invitation.proposalId, invitation.id, decision, reason);
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không thể trả lời lời mời.");
    }
  }

  if (state === "loading") {
    return <p className="state-message">Đang tải danh sách hồ sơ được phân công...</p>;
  }

  if (state === "error") {
    return <p className="state-message error">Không thể tải danh sách hồ sơ được phân công.</p>;
  }

  const invitations = assignments.filter((assignment): assignment is ReviewInvitationPreview => assignment.access === "preview");
  const granted = assignments.filter((assignment): assignment is ReviewerGrantedItem => assignment.access === "granted");
  const pendingCount = granted.filter((assignment) => assignment.myReviewStatus !== "submitted").length;

  return (
    <SectionCard
      title="Hồ sơ được phân công"
      subtitle={`${granted.length} hồ sơ · ${pendingCount} phiếu chưa gửi · ${invitations.length} lời mời`}
    >
      {actionError ? <p className="form-error">{actionError}</p> : null}
      {invitations.length ? (
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
                    {invitation.invitationStatus === "invited" ? (
                      <>
                        <button className="button primary" type="button" onClick={() => void respond(invitation, "accept")}>Chấp nhận</button>{" "}
                        <button className="button" type="button" onClick={() => void respond(invitation, "decline")}>Từ chối</button>
                      </>
                    ) : (
                      <span className="record-meta">{invitation.invitationStatusLabel} · chờ Ban giám đốc ký thành lập hội đồng</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                      ) : (
                        <span className="record-meta">Chưa gửi phiếu</span>
                      )}
                    </td>
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
                  Phiếu của tôi: {assignment.myReviewStatus === "submitted" ? "Đã gửi" : "Chưa gửi"}
                </span>
              </article>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  );
}
