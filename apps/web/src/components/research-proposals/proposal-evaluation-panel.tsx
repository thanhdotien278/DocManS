"use client";

import type { ViewerAuthorizationV1 } from "@rtms/permissions";
import { useEffect, useState } from "react";
import { CheckCircle2, Save, Send, UserMinus, UserPlus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatIntakeDate, intakeDateToIso } from "@/lib/intake-dates";
import {
  assignProposalReviewer,
  loadReviewerCandidates,
  type ReviewerCandidates,
  loadProposalReviewProgress,
  loadProposalReviewAssignments,
  type ProposalReviewAssignment,
  revokeProposalReviewAssignment,
  isNotEntitled,
  saveProposalEvaluationSummary,
  submitCompletedProposalPackage,
  type EvaluationApiError,
  type ProposalReviewProgress,
  type ReviewAssignmentRole
} from "@/lib/proposal-evaluations-api";

function formatDate(value: string) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Chưa có";
}

function formatDueDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value)) : "Không đặt hạn";
}

function reviewRoleLabel(role: string) {
  return role === "reviewer" ? "Người phản biện" : role === "committee_member" ? "Thành viên hội đồng" : role;
}

function reviewStatusLabel(status: string) {
  return status === "assigned" ? "Đang phân công" : status === "completed" ? "Đã hoàn thành" : status;
}

/**
 * ST-3.2 + ST-3.4 — the scientific-management view of one proposal's evaluation round: who is
 * assigned, who has answered, and the consolidated outcome that moves the proposal on to the
 * approval authority.
 *
 * Actions follow the backend record capability, so a blocked
 * control explains itself instead of disappearing (UX-DR27). The backend remains authoritative.
 */
export function ProposalEvaluationPanel({ proposalId, proposalStatus, onWorkflowChange, canReadProgress, canAssignReviewers, canConsolidate, canSubmitPackage, blockedReason, consolidateBlockedReason, submitPackageBlockedReason, contextVersion }: { proposalId: string; proposalStatus: string; onWorkflowChange: () => Promise<void>; canReadProgress: boolean; canAssignReviewers: boolean; canConsolidate: boolean; canSubmitPackage: boolean; blockedReason: string; consolidateBlockedReason: string; submitPackageBlockedReason: string; contextVersion?: ViewerAuthorizationV1["contextVersion"] }) {
  const [assignments, setAssignments] = useState<ProposalReviewAssignment[]>([]);
  const [progress, setProgress] = useState<ProposalReviewProgress | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [loadError, setLoadError] = useState("");

  const [candidates, setCandidates] = useState<ReviewerCandidates>({ users: [] });
  const [reviewerUserId, setReviewerUserId] = useState("");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveUntil, setEffectiveUntil] = useState("");
  const [assignmentRole, setAssignmentRole] = useState<ReviewAssignmentRole>("reviewer");
  const [dueDate, setDueDate] = useState("");
  const [assignError, setAssignError] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [revokingId, setRevokingId] = useState("");

  const [summaryText, setSummaryText] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [summaryError, setSummaryError] = useState("");
  // Assigning or revoking a reviewer refreshes this panel. Without this flag that refresh would
  // overwrite a consolidation summary the user is still typing.
  const [summaryDirty, setSummaryDirty] = useState(false);
  const [pendingNames, setPendingNames] = useState<string[]>([]);
  const [savingMode, setSavingMode] = useState<"" | "draft" | "ready">("");
  const [message, setMessage] = useState("");

  async function refresh() {
    try {
      if (canAssignReviewers || canConsolidate) {
        setAssignments(await loadProposalReviewAssignments(proposalId));
      } else {
        setAssignments([]);
      }
      setProgress(null);
      if (canConsolidate || canSubmitPackage || canReadProgress) {
        try {
          const data = await loadProposalReviewProgress(proposalId);
          setProgress(data);
          setSummaryError("");
          if (!summaryDirty) {
            setSummaryText(data.evaluationSummary?.summary ?? "");
            setRecommendation(data.evaluationSummary?.recommendation ?? "");
          }
        } catch (error) {
          setSummaryError(error instanceof Error ? error.message : "Không tải được tiến độ đánh giá.");
        }
      }
      if (canAssignReviewers) {
        try {
          setCandidates(await loadReviewerCandidates(proposalId, candidateQuery));
        } catch (error) {
          setCandidates({ users: [] });
          setAssignError(error instanceof Error ? error.message : "Không tải được người đánh giá.");
        }
      } else {
        setCandidates({ users: [] });
      }
      setState("ready");
    } catch (error) {
      // Reviewers and PIs simply do not get this panel. Anything else is a real failure and has to
      // be shown, not silently swallowed as "not entitled".
      if (isNotEntitled(error)) {
        setState("forbidden");
        return;
      }
      setLoadError(error instanceof Error ? error.message : "Không tải được tiến độ đánh giá.");
      setState("error");
    }
  }

  useEffect(() => {
    void refresh();
  }, [proposalId, canReadProgress, canAssignReviewers, canConsolidate, canSubmitPackage, contextVersion?.aggregateVersion]);

  const canManageReviewRound = canAssignReviewers || canConsolidate;

  if (state === "loading") {
    return <p className="state-message">Đang tải tiến độ đánh giá...</p>;
  }

  if (state === "error") {
    return <p className="state-message error">{loadError}</p>;
  }

  if (state === "forbidden") {
    return <SectionCard title={canManageReviewRound ? "Phân công đánh giá" : "Tiến độ đánh giá"} subtitle="Tiến độ vận hành của vòng đánh giá"><p className="record-meta">{blockedReason || "Không thể tải tiến độ đánh giá."}</p></SectionCard>;
  }

  const canAssign = canAssignReviewers && Boolean(contextVersion) && !isAssigning && !revokingId;
  const isReadyForApproval = progress?.evaluationSummary?.status === "ready_for_approval";

  async function handleAssign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAssignError("");
    setMessage("");

    if (!canAssign || !contextVersion) return;

    if (!reviewerUserId) {
      setAssignError("Chọn tài khoản người đánh giá.");
      return;
    }

    if (!window.confirm("Xác nhận người đánh giá, vai trò và thời hạn phân công?")) return;
    setIsAssigning(true);
    try {
      await assignProposalReviewer(proposalId, {
        reviewerUserId, contextVersion,
        effectiveFrom: effectiveFrom ? intakeDateToIso(effectiveFrom) : undefined,
        effectiveUntil: effectiveUntil ? intakeDateToIso(effectiveUntil, true) : undefined,
        assignmentRole,
        dueDate: dueDate ? intakeDateToIso(dueDate, true) : undefined
      });
      setReviewerUserId("");
      setDueDate("");
      setMessage("Đã phân công người đánh giá.");
      await onWorkflowChange();
    } catch (error) {
      setAssignError(error instanceof Error ? error.message : "Không thể phân công người đánh giá.");
      if ((error as EvaluationApiError).code === "CONTEXT_VERSION_MISMATCH") await onWorkflowChange();
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleRevoke(assignmentId: string, reviewerName: string) {
    if (!canAssign || !contextVersion) return;
    setAssignError("");
    setMessage("");
    if (!window.confirm(`Thu hồi phân công đánh giá của ${reviewerName}? Lịch sử phân công vẫn được giữ lại.`)) {
      return;
    }

    const reason = window.prompt("Lý do thu hồi phân công:");
    if (!reason?.trim()) return;
    setRevokingId(assignmentId);
    try {
      await revokeProposalReviewAssignment(proposalId, assignmentId, reason, contextVersion);
      setMessage("Đã thu hồi phân công đánh giá.");
      await onWorkflowChange();
    } catch (error) {
      setAssignError(error instanceof Error ? error.message : "Không thể thu hồi phân công.");
      if ((error as EvaluationApiError).code === "CONTEXT_VERSION_MISMATCH") await onWorkflowChange();
    } finally {
      setRevokingId("");
    }
  }

  async function handleSaveSummary(markReady: boolean) {
    setSummaryError("");
    setPendingNames([]);
    setMessage("");

    if (!summaryText.trim()) {
      setSummaryError("Nhập nội dung tổng hợp kết quả đánh giá.");
      return;
    }
    if (!recommendation) {
      setSummaryError("Chọn kết luận tổng hợp.");
      return;
    }
    if (!contextVersion) {
      setSummaryError("Không xác định được phiên bản quyền của hồ sơ. Vui lòng tải lại.");
      return;
    }
    if (markReady && !window.confirm("Gửi lãnh đạo phê duyệt? Vòng đánh giá sẽ được đóng lại.")) {
      return;
    }

    setSavingMode(markReady ? "ready" : "draft");
    try {
      await saveProposalEvaluationSummary(proposalId, { summary: summaryText, recommendation, markReady, contextVersion });
      setSummaryDirty(false);
      setMessage(markReady ? "Đã gửi hồ sơ tới lãnh đạo phê duyệt." : "Đã lưu bản nháp tổng hợp.");
      await refresh();
      await onWorkflowChange();
    } catch (error) {
      const evaluationError = error as EvaluationApiError;
      setSummaryError(evaluationError.message);
      setPendingNames((evaluationError.pendingReviewers ?? []).map((item) => item.reviewerDisplayName).filter(Boolean));
    } finally {
      setSavingMode("");
    }
  }

  async function handleSubmitCompletedPackage() {
    if (!canSubmitPackage || !progress?.allReviewsSubmitted || !contextVersion) return;
    if (!window.confirm("Trình gói đánh giá đã hoàn tất tới lãnh đạo phê duyệt?")) return;
    setSummaryError("");
    setMessage("");
    setSavingMode("ready");
    try {
      await submitCompletedProposalPackage(proposalId, contextVersion);
      setMessage("Đã trình gói đánh giá hoàn tất tới lãnh đạo phê duyệt.");
      await refresh();
      await onWorkflowChange();
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Không thể trình gói đánh giá.");
    } finally {
      setSavingMode("");
    }
  }

  return (
    <>
      <SectionCard
        title={canManageReviewRound ? "Phân công đánh giá" : "Tiến độ đánh giá"}
        subtitle={canManageReviewRound ? "Người phản biện và thành viên hội đồng được phân công cho hồ sơ này" : "Tổng quan vận hành trong phạm vi quyền được cấp"}
        action={<StatusBadge status={proposalStatus} />}
      >
        {progress ? <div className="meta-grid">
          <div className="meta-item">
            <span className="meta-label">Đang phân công</span>
            <span className="meta-value">{progress.activeAssignmentCount}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Đã gửi phiếu</span>
            <span className="meta-value">{progress.submittedCount}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Còn chờ</span>
            <span className="meta-value">{progress.pendingCount}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Điểm trung bình</span>
            <span className="meta-value">
              {progress.averageTotalScore == null ? (canManageReviewRound ? "Chưa có" : "Ẩn theo chính sách") : `${progress.averageTotalScore}/${progress.maxTotalScore}`}
            </span>
          </div>
        </div> : null}

        {canManageReviewRound && assignError ? <p className="form-error" role="alert">{assignError}</p> : null}
        {canManageReviewRound && message ? (
          <p className="state-message success" role="status">
            {message}
          </p>
        ) : null}

        {canManageReviewRound ? assignments.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Người đánh giá</th>
                  <th>Vai trò</th>
                  <th>Hạn đánh giá</th>
                  <th>Trạng thái phân công</th>
                  {progress ? <th>Tình trạng phiếu</th> : null}
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>
                      <span className="record-title">{assignment.reviewerDisplayName}</span>
                      <span className="record-meta">
                        {assignment.reviewerUnit} · Phân công {formatDate(assignment.assignedAt)}
                      </span>
                      <span className="record-meta">Người phân công: {assignment.assignedByDisplayName}</span>
                    </td>
                    <td>{assignment.assignmentRoleLabel}</td>
                    <td>{formatDueDate(assignment.dueDate)}</td>
                    <td>
                      <span className="record-title">{assignment.statusLabel}</span>
                      <span className="record-meta">Hiệu lực từ {formatIntakeDate(assignment.effectiveFrom)}</span>
                      {assignment.effectiveUntil ? <span className="record-meta">Đến {formatIntakeDate(assignment.effectiveUntil)}</span> : null}
                      {assignment.completedAt ? <span className="record-meta">Hoàn thành {formatDate(assignment.completedAt)}</span> : null}
                      {assignment.revokedAt ? <span className="record-meta">Thu hồi {formatDate(assignment.revokedAt)}</span> : null}
                    </td>
                    {progress ? <td>
                      {assignment.reviewStatus === "submitted" ? (
                        <>
                          <span className="record-title">
                            Đã gửi{progress ? ` · ${assignment.reviewTotalScore}/${progress.maxTotalScore}` : ""}
                          </span>
                          <span className="record-meta">{assignment.reviewRecommendationLabel}</span>
                        </>
                      ) : (
                        <span className="record-meta">Chưa gửi phiếu</span>
                      )}
                    </td> : null}
                    <td>
                      {assignment.status === "assigned" || assignment.status === "completed" ? (
                        <button
                          className="button icon-button danger"
                          type="button"
                          title="Thu hồi phân công"
                          aria-label={`Thu hồi phân công của ${assignment.reviewerDisplayName}`}
                          disabled={!canAssign || revokingId === assignment.id}
                          onClick={() => void handleRevoke(assignment.id, assignment.reviewerDisplayName)}
                        >
                          <UserMinus size={16} aria-hidden="true" />
                        </button>
                      ) : (
                        <span className="record-meta">{assignment.statusLabel}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Chưa phân công người đánh giá"
            message="Phân công người phản biện hoặc thành viên hội đồng để mở vòng đánh giá hồ sơ."
          />
        ) : (
          <div className="form-section-inline">
            <div className="section-mini-heading">Hạn xử lý vòng đánh giá</div>
            {progress?.reviewDeadlines?.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Vai trò</th><th>Trạng thái</th><th>Hạn đánh giá</th></tr></thead>
                  <tbody>
                    {progress.reviewDeadlines.map((deadline, index) => (
                      <tr key={`${deadline.role}-${deadline.dueDate ?? "none"}-${index}`}>
                        <td>{reviewRoleLabel(deadline.role)}</td>
                        <td>{reviewStatusLabel(deadline.status)}</td>
                        <td>{formatDueDate(deadline.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="record-meta">Chưa có hạn xử lý được ghi nhận.</p>}
          </div>
        )}

        {canManageReviewRound ? <form className="admin-form compact-form" onSubmit={(event) => void handleAssign(event)}>
          <div className="section-mini-heading">Phân công mới</div>
          <label className="field"><span>Tìm theo tên hoặc tài khoản</span><input value={candidateQuery} onChange={(e) => setCandidateQuery(e.target.value)} /></label>
          <button className="button" type="button" disabled={!canAssign || isAssigning} onClick={() => void loadReviewerCandidates(proposalId, candidateQuery).then(setCandidates).catch((error) => setAssignError(error.message))}>Tìm người đánh giá</button>
          <label className="field"><span>Tài khoản người đánh giá *</span><select required value={reviewerUserId} disabled={!canAssign} onChange={(e) => setReviewerUserId(e.target.value)}><option value="">Chọn tài khoản đủ điều kiện</option>{candidates.users.map((p) => <option key={p.id} value={p.id}>{p.displayName} ({p.username ?? "Chưa có tên đăng nhập"})</option>)}</select></label>
          {!candidates.users.length ? <p className="record-meta">Không có tài khoản đang hoạt động phù hợp. Chủ nhiệm, thành viên đề tài và người đã được phân công không xuất hiện trong danh sách.</p> : null}
          <div className="form-grid two"><label className="field"><span>Hiệu lực từ (để trống: ngay lập tức)</span><input type="date" lang="vi" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} disabled={!canAssign} /></label><label className="field"><span>Hiệu lực đến (tùy chọn)</span><input type="date" lang="vi" value={effectiveUntil} onChange={(e) => setEffectiveUntil(e.target.value)} disabled={!canAssign} /></label></div>
          <div className="form-grid two">
            <label className="field">
              <span>Vai trò trong vòng đánh giá</span>
              <select
                value={assignmentRole}
                onChange={(event) => setAssignmentRole(event.target.value as ReviewAssignmentRole)}
                disabled={!canAssign}
              >
                <option value="reviewer">Người phản biện</option>
                <option value="committee_member">Thành viên hội đồng</option>
              </select>
            </label>
            <label className="field">
              <span>Hạn đánh giá (tùy chọn)</span>
              <input type="date" lang="vi" value={dueDate} onChange={(event) => setDueDate(event.target.value)} disabled={!canAssign} />
            </label>
          </div>
          <button className="button primary" type="submit" disabled={!canAssign || isAssigning}>
            <UserPlus size={16} aria-hidden="true" />
            {isAssigning ? "Đang phân công" : "Phân công đánh giá"}
          </button>
          {!canAssign ? (
            <p className="record-meta">
              {blockedReason || (!contextVersion ? "Tải lại hồ sơ để cập nhật quyền phân công." : "Đang cập nhật phân công...")}
            </p>
          ) : null}
        </form> : null}
      </SectionCard>

      {progress && (canConsolidate || canSubmitPackage || progress.evaluationSummary) ? <SectionCard title="Tổng hợp và trình phê duyệt" subtitle="Kết luận của chuyên viên trước khi gửi lãnh đạo phê duyệt">
        {progress.reviews.length ? (
          <div className="timeline">
            {progress.reviews.map((review) => (
              <article className="timeline-item" key={review.id}>
                <span className="timeline-dot" />
                <div>
                  <p className="timeline-title">
                    {review.reviewerDisplayName} · {review.totalScore}/{review.maxTotalScore} điểm
                  </p>
                  <p className="timeline-meta">
                    {review.recommendationLabel} · Gửi lúc {formatDate(review.submittedAt)}
                  </p>
                  <p className="timeline-meta">{review.comment}</p>
                </div>
              </article>
            ))}
          </div>
        ) : canConsolidate ? (
          <EmptyState title="Chưa có phiếu đánh giá" message="Nội dung nhận xét sẽ hiện ở đây khi người đánh giá gửi phiếu." />
        ) : <p className="record-meta">Chi tiết phiếu đánh giá được ẩn theo phạm vi giám sát.</p>}

        <p className="record-meta">
          Người phản biện: {progress.reviewerCount}/2 · Thành viên hội đồng: {progress.committeeMemberCount} (tối thiểu 3).
        </p>
        {progress.pendingCount > 0 ? (
          <p className="state-message warning" role="status">
            Còn {progress.pendingCount} phiếu chưa gửi
            {progress.pendingReviewers?.length ? `: ${progress.pendingReviewers.map((item) => item.reviewerDisplayName).join(", ")}.` : "."}
          </p>
        ) : null}

        <form className="admin-form compact-form" onSubmit={(event) => event.preventDefault()}>
          <label className="field">
            <span>Nội dung tổng hợp</span>
            <textarea
              rows={4}
              maxLength={5000}
              value={summaryText}
              onChange={(event) => {
                setSummaryText(event.target.value);
                setSummaryDirty(true);
              }}
              disabled={!canConsolidate}
            />
          </label>
          <label className="field">
            <span>Kết luận tổng hợp</span>
            <select
              value={recommendation}
              onChange={(event) => {
                setRecommendation(event.target.value);
                setSummaryDirty(true);
              }}
              disabled={!canConsolidate}
            >
              <option value="">-- Chọn kết luận --</option>
              {!canConsolidate && recommendation && !progress.recommendations.some((option) => option.code === recommendation) ? <option value={recommendation}>{progress.evaluationSummary?.recommendationLabel ?? recommendation}</option> : null}
              {progress.recommendations.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {summaryError ? <p className="form-error">{summaryError}</p> : null}
          {pendingNames.length ? <p className="record-meta">Chờ phiếu của: {pendingNames.join(", ")}.</p> : null}
          {isReadyForApproval ? (
            <p className="state-message success compact-state">
              <CheckCircle2 size={16} aria-hidden="true" /> Đã chuyển lãnh đạo phê duyệt lúc{" "}
              {formatDate(progress.evaluationSummary?.markedReadyAt ?? "")}.
            </p>
          ) : null}

          <div className="button-row">
            {canConsolidate ? <>
            <button
              className="button"
              type="button"
              disabled={!canConsolidate || !contextVersion || savingMode !== ""}
              onClick={() => void handleSaveSummary(false)}
            >
              <Save size={16} aria-hidden="true" />
              {savingMode === "draft" ? "Đang lưu" : "Lưu nháp tổng hợp"}
            </button>
            <button
              className="button primary"
              type="button"
              disabled={!canConsolidate || !contextVersion || isReadyForApproval || !progress.allReviewsSubmitted || savingMode !== ""}
              onClick={() => void handleSaveSummary(true)}
            >
              <Send size={16} aria-hidden="true" />
              {savingMode === "ready" ? "Đang gửi" : "Gửi lãnh đạo phê duyệt"}
            </button>
            </> : null}
            {canSubmitPackage ? (
              <button
                className="button primary"
                type="button"
                disabled={!contextVersion || !progress.evaluationSummary || !progress.allReviewsSubmitted || isReadyForApproval || savingMode !== ""}
                onClick={() => void handleSubmitCompletedPackage()}
                title={!progress.allReviewsSubmitted ? submitPackageBlockedReason : undefined}
              >
                <Send size={16} aria-hidden="true" />
                {savingMode === "ready" ? "Đang trình" : "Trình gói hoàn tất"}
              </button>
            ) : null}
          </div>
          {!canConsolidate && !canSubmitPackage ? (
            <p className="record-meta">{consolidateBlockedReason || "Chỉ hồ sơ đang đánh giá hoặc chờ phê duyệt mới được tổng hợp kết quả."}</p>
          ) : canSubmitPackage && !progress.allReviewsSubmitted && !isReadyForApproval ? (
            <p className="record-meta">{submitPackageBlockedReason || "Chưa đủ phiếu đánh giá để trình gói hoàn tất."}</p>
          ) : canConsolidate && !progress.allReviewsSubmitted && !isReadyForApproval ? (
            <p className="record-meta">
              {!progress.assignmentRequirementsMet
                ? "Cần đúng 2 người phản biện và ít nhất 3 thành viên hội đồng trước khi gửi lãnh đạo phê duyệt."
                : "Còn phiếu đánh giá chưa gửi nên chưa thể chuyển hồ sơ sang chờ phê duyệt."}
            </p>
          ) : null}
        </form>
      </SectionCard> : summaryError ? <p className="form-error" role="alert">{summaryError}</p> : null}
    </>
  );
}
