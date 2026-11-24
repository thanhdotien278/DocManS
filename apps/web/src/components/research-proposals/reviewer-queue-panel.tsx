"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ReasonDialog } from "@/components/research-proposals/proposal-council-panel";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { loadMyReviewAssignments, respondToReviewInvitation, type ReviewInvitationPreview, type ReviewerGrantedItem, type ReviewerQueueItem } from "@/lib/proposal-evaluations-api";

function formatDate(value: string) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value)) : "Không đặt hạn";
}

function getDueMeta(dueDate?: string, isSubmitted = false) {
  if (isSubmitted) return { label: "Đã gửi", tone: "approved" as const };
  if (!dueDate) return { label: "Không đặt hạn", tone: "neutral" as const };
  const diffDays = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (Number.isNaN(diffDays)) return { label: dueDate, tone: "neutral" as const };
  if (diffDays < 0) return { label: `Quá hạn ${Math.abs(diffDays)} ngày`, tone: "blocked" as const };
  if (diffDays <= 3) return { label: `Còn ${diffDays} ngày`, tone: "pending" as const };
  return { label: `Còn ${diffDays} ngày`, tone: "info" as const };
}

/**
 * ST-3.2 — the reviewer's queue. It is built from assignment records, so it can only ever contain
 * proposals this reviewer was assigned to; there is no client-side filter of a wider list.
 */
export function ReviewerQueuePanel() {
  const [assignments, setAssignments] = useState<ReviewerQueueItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [responding, setResponding] = useState<{ invitation: ReviewInvitationPreview; decision: "accept" | "decline" } | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "submitted">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notice, setNotice] = useState("");

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
    const { invitation, decision } = responding;
    await respondToReviewInvitation(invitation.proposalId, invitation.id, decision, reason);
    setResponding(null);
    setNotice(
      decision === "decline"
        ? "Đã từ chối lời mời. Chuyên viên quản lý khoa học đã được thông báo."
        : "Đã chấp nhận lời mời tham gia hội đồng. Bạn xem được hồ sơ sau khi Ban giám đốc ký thành lập hội đồng."
    );
    await load();
  }

  const invitations = useMemo(
    () => assignments.filter((assignment): assignment is ReviewInvitationPreview => assignment.access === "preview"),
    [assignments]
  );
  const granted = useMemo(
    () => assignments.filter((assignment): assignment is ReviewerGrantedItem => assignment.access === "granted"),
    [assignments]
  );
  const isSecretary = (assignment: ReviewerGrantedItem) => assignment.assignmentRole === "council_secretary" || assignment.scoring === false;
  const pendingCount = useMemo(
    () => granted.filter((assignment) => !isSecretary(assignment) && assignment.myReviewStatus !== "submitted").length,
    [granted]
  );
  const openInviteCount = useMemo(
    () => invitations.filter((invitation) => invitation.invitationStatus === "invited").length,
    [invitations]
  );
  const submittedCount = useMemo(
    () => granted.filter((assignment) => assignment.myReviewStatus === "submitted").length,
    [granted]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleInvitations = useMemo(() => {
    if (filterTab === "submitted") return [];
    return invitations.filter((invitation) => {
      if (filterTab === "pending" && invitation.invitationStatus !== "invited") return false;
      if (!normalizedQuery) return true;
      return (
        invitation.proposal.title.toLowerCase().includes(normalizedQuery) ||
        invitation.assignmentRoleLabel.toLowerCase().includes(normalizedQuery) ||
        invitation.assignedByDisplayName.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [filterTab, invitations, normalizedQuery]);

  const visibleGranted = useMemo(() => {
    return granted.filter((assignment) => {
      if (filterTab === "pending" && (isSecretary(assignment) || assignment.myReviewStatus === "submitted")) return false;
      if (filterTab === "submitted" && assignment.myReviewStatus !== "submitted") return false;
      if (!normalizedQuery) return true;
      return (
        assignment.proposal.title.toLowerCase().includes(normalizedQuery) ||
        (assignment.proposal.code ?? "").toLowerCase().includes(normalizedQuery) ||
        assignment.assignmentRoleLabel.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [filterTab, granted, normalizedQuery]);

  if (state === "loading") {
    return <p className="state-message">Đang tải danh sách hồ sơ được phân công...</p>;
  }

  if (state === "error") {
    return <p className="state-message error">Không thể tải danh sách hồ sơ được phân công.</p>;
  }

  // Lời mời đã từ chối/đã nhận chỉ hiện nhãn trạng thái: không có nút trả lời, không có liên kết mở hồ sơ.
  const replyCell = (invitation: ReviewInvitationPreview) => invitation.invitationStatus === "invited" ? (
    <>
      <button className="button primary" type="button" onClick={() => setResponding({ invitation, decision: "accept" })}>Chấp nhận</button>{" "}
      <button className="button" type="button" onClick={() => setResponding({ invitation, decision: "decline" })}>Từ chối</button>
    </>
  ) : (
    <span className="record-meta">{invitation.invitationStatus === "accepted" ? "Đã chấp nhận · Chờ Ban giám đốc ký thành lập hội đồng" : invitation.invitationStatus === "declined" ? "Đã từ chối" : invitation.invitationStatusLabel}</span>
  );
  const actionLabel = (assignment: ReviewerGrantedItem) => (isSecretary(assignment) ? "Soạn biên bản" : assignment.myReviewStatus === "submitted" ? "Xem phiếu đã gửi" : "Chấm phiếu");

  return (
    <SectionCard
      title="Hồ sơ được phân công"
      subtitle={`${granted.length} hồ sơ · ${pendingCount} phiếu chưa gửi · ${invitations.length} lời mời`}
    >
      {notice ? <p className="state-message success" role="status">{notice}</p> : null}
      {assignments.length > 0 ? (
        <div className="toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div className="button-row" role="tablist" aria-label="Lọc nhiệm vụ phản biện">
            <button type="button" role="tab" aria-selected={filterTab === "all"} className={`button ${filterTab === "all" ? "primary" : ""}`} onClick={() => setFilterTab("all")}>
              Tất cả ({assignments.length})
            </button>
            <button type="button" role="tab" aria-selected={filterTab === "pending"} className={`button ${filterTab === "pending" ? "primary" : ""}`} onClick={() => setFilterTab("pending")}>
              Chờ xử lý ({pendingCount + openInviteCount})
            </button>
            <button type="button" role="tab" aria-selected={filterTab === "submitted"} className={`button ${filterTab === "submitted" ? "primary" : ""}`} onClick={() => setFilterTab("submitted")}>
              Đã gửi phiếu ({submittedCount})
            </button>
          </div>
          <label className="field" style={{ minWidth: "240px", margin: 0 }}>
            <span className="sr-only">Tìm kiếm hồ sơ phản biện</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm tên hồ sơ, mã, vai trò..."
              />
            </div>
          </label>
        </div>
      ) : null}

      {visibleInvitations.length ? (
        <>
        <div className="section-mini-heading">Lời mời</div>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Lời mời đánh giá">
          <table className="data-table">
            <thead>
              <tr><th>Hồ sơ</th><th>Vai trò</th><th>Hạn</th><th>Người mời</th><th>Trả lời</th></tr>
            </thead>
            <tbody>
              {visibleInvitations.map((invitation) => (
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
          {visibleInvitations.map((invitation) => (
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
      {visibleGranted.length === 0 && visibleInvitations.length === 0 ? (
        <EmptyState
          title={assignments.length === 0 ? "Chưa có hồ sơ được phân công" : "Không có hồ sơ phù hợp"}
          message={
            assignments.length === 0
              ? "Khi chuyên viên quản lý khoa học phân công đánh giá, hồ sơ sẽ xuất hiện ở đây."
              : "Đổi bộ lọc hoặc từ khóa tìm kiếm để xem các nhiệm vụ khác."
          }
        />
      ) : visibleGranted.length === 0 ? null : (
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
                {visibleGranted.map((assignment) => {
                  const due = getDueMeta(assignment.dueDate, assignment.myReviewStatus === "submitted");
                  return (
                  <tr key={assignment.id}>
                    <td>
                      <Link className="record-title" href={`/proposals/${assignment.proposal.id}`}>
                        {assignment.proposal.title}
                      </Link>
                      <span className="record-meta">{assignment.proposal.code || "Chưa cấp mã"}</span>
                    </td>
                    <td>{assignment.assignmentRoleLabel}</td>
                    <td>
                      <span>{formatDate(assignment.dueDate)}</span>
                      {assignment.dueDate && assignment.myReviewStatus !== "submitted" ? (
                        <span className="record-meta" style={{ display: "block" }}>{due.label}</span>
                      ) : null}
                    </td>
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
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mobile-list">
            {visibleGranted.map((assignment) => (
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
