"use client";

import type { ViewerAuthorizationV1 } from "@rtms/permissions";
import { useEffect, useState } from "react";
import { CheckCircle2, Save, Send } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatIntakeDate } from "@/lib/intake-dates";
import {
  loadProposalReviewProgress,
  type ProposalReviewAssignment,
  COUNCIL_POSITION_LABELS,
  type CouncilPosition,
  isNotEntitled,
  saveProposalEvaluationSummary,
  finalizeProposalEvaluationSummary,
  submitCompletedProposalPackage,
  type EvaluationApiError,
  type ProposalReviewProgress
} from "@/lib/proposal-evaluations-api";

function formatDate(value: string) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Chưa có";
}

function formatDueDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value)) : "Không đặt hạn";
}

function reviewRoleLabel(role: string) {
  return COUNCIL_POSITION_LABELS[role as CouncilPosition] ?? role;
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
export function ProposalEvaluationPanel({ proposalId, proposalStatus, onWorkflowChange, canReadProgress, canAssignReviewers, canConsolidate, canFinalize, canSubmitPackage, blockedReason, consolidateBlockedReason, finalizeBlockedReason, submitPackageBlockedReason, contextVersion }: { proposalId: string; proposalStatus: string; onWorkflowChange: () => Promise<void>; canReadProgress: boolean; canAssignReviewers: boolean; canConsolidate: boolean; canFinalize: boolean; canSubmitPackage: boolean; blockedReason: string; consolidateBlockedReason: string; finalizeBlockedReason: string; submitPackageBlockedReason: string; contextVersion?: ViewerAuthorizationV1["contextVersion"] }) {
  const [assignments, setAssignments] = useState<ProposalReviewAssignment[]>([]);
  const [progress, setProgress] = useState<ProposalReviewProgress | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [loadError, setLoadError] = useState("");

  const [summaryText, setSummaryText] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [summaryError, setSummaryError] = useState("");
  // Assigning or revoking a reviewer refreshes this panel. Without this flag that refresh would
  // overwrite a consolidation summary the user is still typing.
  const [summaryDirty, setSummaryDirty] = useState(false);
  const [pendingNames, setPendingNames] = useState<string[]>([]);
  const [savingMode, setSavingMode] = useState<"" | "draft" | "finalize" | "ready">("");
  const [message, setMessage] = useState("");

  async function refresh() {
    try {
      setAssignments([]);
      setProgress(null);
      if (canConsolidate || canFinalize || canSubmitPackage || canReadProgress) {
        try {
          const data = await loadProposalReviewProgress(proposalId);
          setProgress(data);
          setAssignments(data.assignments);
          setSummaryError("");
          if (!summaryDirty) {
            setSummaryText(data.evaluationSummary?.summary ?? "");
            setRecommendation(data.evaluationSummary?.recommendation ?? "");
          }
        } catch (error) {
          setSummaryError(error instanceof Error ? error.message : "Không tải được tiến độ đánh giá.");
        }
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
  }, [proposalId, canReadProgress, canConsolidate, canFinalize, canSubmitPackage, contextVersion?.aggregateVersion]);

  const canManageReviewRound = canAssignReviewers || canConsolidate || canFinalize || canSubmitPackage;

  if (state === "loading") {
    return <p className="state-message">Đang tải tiến độ đánh giá...</p>;
  }

  if (state === "error") {
    return <p className="state-message error">{loadError}</p>;
  }

  if (state === "forbidden") {
    return <SectionCard title="Tiến độ phiếu đánh giá" subtitle="Tiến độ vận hành của vòng đánh giá"><p className="record-meta">{blockedReason || "Không thể tải tiến độ đánh giá."}</p></SectionCard>;
  }

  const summaryStatus = progress?.evaluationSummary?.status;
  const isFinalized = summaryStatus === "finalized";
  const isReadyForApproval = summaryStatus === "ready_for_approval";
  const canEditSummary = canConsolidate && !isFinalized && !isReadyForApproval;

  async function handleSaveSummary() {
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
    setSavingMode("draft");
    try {
      await saveProposalEvaluationSummary(proposalId, { summary: summaryText, recommendation, contextVersion });
      setSummaryDirty(false);
      setMessage("Đã lưu bản nháp tổng hợp.");
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

  async function handleFinalizeSummary() {
    if (!canFinalize || !progress?.allReviewsSubmitted || summaryStatus !== "draft" || !contextVersion) return;
    if (!window.confirm("Chốt bản tổng hợp hiện tại? Sau khi chốt, nội dung và bằng chứng của gói sẽ không thể sửa.")) return;
    setSummaryError("");
    setMessage("");
    setSavingMode("finalize");
    try {
      await finalizeProposalEvaluationSummary(proposalId, contextVersion);
      setSummaryDirty(false);
      setMessage("Đã chốt bản tổng hợp. Có thể trình gói đánh giá tới lãnh đạo.");
      await refresh();
      await onWorkflowChange();
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Không thể chốt bản tổng hợp.");
    } finally {
      setSavingMode("");
    }
  }

  async function handleSubmitCompletedPackage() {
    if (!canSubmitPackage || !progress?.allReviewsSubmitted || summaryStatus !== "finalized" || !contextVersion) return;
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
        title="Tiến độ phiếu đánh giá"
        subtitle="Theo dõi thành viên chấm phiếu, tiến độ và hạn xử lý (việc mời thành viên thực hiện ở panel Hội đồng thẩm định)"
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

        {progress ? <p className="record-meta" role="status">
          Đã gửi {progress.submittedCount}/{progress.activeAssignmentCount} phiếu · Quá hạn: {progress.overdueCount ?? 0}.
          {progress.readinessReasons?.length ? ` ${progress.readinessReasons.join(" ")}` : progress.allReviewsSubmitted ? " Đủ điều kiện tổng hợp." : ""}
        </p> : null}

        {canManageReviewRound && message ? (
          <p className="state-message success" role="status">
            {message}
          </p>
        ) : null}

        {(canManageReviewRound || assignments.length > 0) ? assignments.length ? (
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Danh sách thành viên và tiến độ phiếu">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Thành viên</th>
                  <th>Vai trò</th>
                  <th>Hạn đánh giá</th>
                  <th>Trạng thái</th>
                  {progress ? <th>Tình trạng phiếu</th> : null}
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
                    <td>{formatDueDate(assignment.dueDate)}{assignment.isOverdue ? <span className="record-meta">Quá hạn</span> : null}</td>
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
                      ) : assignment.scoring === false ? (
                        <span className="record-meta">Thư ký: không chấm phiếu</span>
                      ) : (
                        <span className="record-meta">Chưa gửi phiếu</span>
                      )}
                    </td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Chưa có thành viên hội đồng"
            message={canManageReviewRound ? "Mời thành viên ở panel Hội đồng thẩm định để mở vòng đánh giá hồ sơ." : "Chưa ghi nhận assignment hoặc hạn xử lý trong vòng đánh giá hiện tại."}
          />
        ) : (
          <div className="form-section-inline">
            <div className="section-mini-heading">Hạn xử lý vòng đánh giá</div>
            {progress?.reviewDeadlines?.length ? (
              <div className="table-wrap" tabIndex={0} role="region" aria-label="Bảng tổng hợp đánh giá">
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

      </SectionCard>

      {progress && (canConsolidate || canFinalize || canSubmitPackage || progress.evaluationSummary) ? <SectionCard title="Tổng hợp và trình phê duyệt" subtitle={canManageReviewRound ? "Tổng hợp, chốt và lập tờ trình gói đánh giá (Trưởng ban → Trưởng phòng → Giám đốc)" : "Theo dõi kết quả tổng hợp trong phạm vi được cấp"}>
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

        {progress.scoringMemberCount != null ? <p className="record-meta">Thành viên chấm phiếu: {progress.scoringMemberCount}{progress.secretaryAssigned === false ? " · Chưa có thư ký hội đồng" : ""}.</p> : null}
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
              disabled={!canEditSummary}
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
              disabled={!canEditSummary}
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
            {canEditSummary ? <>
            <button
              className="button"
              type="button"
              disabled={!contextVersion || savingMode !== ""}
              onClick={() => void handleSaveSummary()}
            >
              <Save size={16} aria-hidden="true" />
              {savingMode === "draft" ? "Đang lưu" : "Lưu nháp tổng hợp"}
            </button>
            </> : null}
            {canFinalize && summaryStatus === "draft" ? (<button
              className="button primary"
              type="button"
              disabled={!contextVersion || !progress.allReviewsSubmitted || savingMode !== ""}
              title={!progress.allReviewsSubmitted ? finalizeBlockedReason || "Chưa đủ phiếu đánh giá để chốt." : undefined}
              onClick={() => void handleFinalizeSummary()}
            >
              <Send size={16} aria-hidden="true" />
              {savingMode === "finalize" ? "Đang chốt" : "Chốt bản tổng hợp"}
            </button>
            ) : null}
            {canSubmitPackage ? (
              <button
                className="button primary"
                type="button"
                disabled={!contextVersion || summaryStatus !== "finalized" || !progress.allReviewsSubmitted || isReadyForApproval || savingMode !== ""}
                onClick={() => void handleSubmitCompletedPackage()}
                title={summaryStatus !== "finalized" ? "Cần chốt bản tổng hợp trước khi trình gói." : !progress.allReviewsSubmitted ? submitPackageBlockedReason : undefined}
              >
                <Send size={16} aria-hidden="true" />
                {savingMode === "ready" ? "Đang lập tờ trình" : "Lập tờ trình gửi Ban giám đốc"}
              </button>
            ) : null}
          </div>
          {!canConsolidate && !canFinalize && !canSubmitPackage ? (
            <p className="record-meta">{consolidateBlockedReason || "Chỉ Trưởng phòng, Trưởng ban hoặc Chuyên viên phụ trách hồ sơ mới tổng hợp, chốt và lập tờ trình; các vai trò khác chỉ theo dõi."}</p>
          ) : canSubmitPackage && !progress.allReviewsSubmitted && !isReadyForApproval ? (
            <p className="record-meta">{submitPackageBlockedReason || "Chưa đủ phiếu đánh giá để trình gói hoàn tất."}</p>
          ) : canFinalize && summaryStatus === "draft" && !progress.allReviewsSubmitted ? (
            <p className="record-meta">{finalizeBlockedReason || "Chưa đủ phiếu đánh giá để chốt bản tổng hợp."}</p>
          ) : null}
        </form>
      </SectionCard> : summaryError ? <p className="form-error" role="alert">{summaryError}</p> : null}
    </>
  );
}
