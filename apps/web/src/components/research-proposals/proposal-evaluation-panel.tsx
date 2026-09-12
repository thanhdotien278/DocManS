"use client";

import type { ViewerAuthorizationV1 } from "@rtms/permissions";
import { useEffect, useState } from "react";
import { CheckCircle2, Save, Send, UserMinus, UserPlus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  assignProposalReviewer,
  loadReviewerCandidates,
  type ReviewerCandidates,
  loadProposalReviewProgress,
  revokeProposalReviewAssignment,
  isNotEntitled,
  saveProposalEvaluationSummary,
  type EvaluationApiError,
  type ProposalReviewProgress,
  type ReviewAssignmentRole
} from "@/lib/proposal-evaluations-api";

function formatDate(value: string) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Chưa có";
}

function formatDueDate(value: string) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value)) : "Không đặt hạn";
}

/**
 * ST-3.2 + ST-3.4 — the scientific-management view of one proposal's evaluation round: who is
 * assigned, who has answered, and the consolidated outcome that moves the proposal on to the
 * approval authority.
 *
 * Actions are shown whenever the viewer is staff and only disabled by workflow state, so a blocked
 * control explains itself instead of disappearing (UX-DR27). The backend remains authoritative.
 */
export function ProposalEvaluationPanel({ proposalId, onWorkflowChange, canAssignReviewers, canConsolidate, blockedReason, contextVersion }: { proposalId: string; onWorkflowChange: () => void; canAssignReviewers: boolean; canConsolidate: boolean; blockedReason: string; contextVersion?: ViewerAuthorizationV1["contextVersion"] }) {
  const [progress, setProgress] = useState<ProposalReviewProgress | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [loadError, setLoadError] = useState("");

  const [candidates, setCandidates] = useState<ReviewerCandidates>({ profiles: [], accounts: [] });
  const [profileId, setProfileId] = useState("");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveUntil, setEffectiveUntil] = useState("");
  const [reviewerUsername, setReviewerUsername] = useState("");
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
      const data = await loadProposalReviewProgress(proposalId);
      setProgress(data);
      if (canAssignReviewers) setCandidates(await loadReviewerCandidates(proposalId, candidateQuery));
      if (!summaryDirty) {
        setSummaryText(data.evaluationSummary?.summary ?? "");
        setRecommendation(data.evaluationSummary?.recommendation ?? "");
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
  }, [proposalId]);

  if (state === "loading") {
    return <p className="state-message">Đang tải tiến độ đánh giá...</p>;
  }

  if (state === "error") {
    return <p className="state-message error">{loadError}</p>;
  }

  if (state === "forbidden" || !progress) {
    return <SectionCard title="Phân công đánh giá" subtitle="Người phản biện và thành viên hội đồng"><button className="button primary" type="button" disabled title={blockedReason}>Phân công người đánh giá</button><p className="record-meta">{blockedReason}</p></SectionCard>;
  }

  const canAssign = canAssignReviewers;
  const isReadyForApproval = progress.evaluationSummary?.status === "ready_for_approval";

  async function handleAssign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAssignError("");
    setMessage("");

    if (!reviewerUsername.trim()) {
      setAssignError("Nhập tài khoản hệ thống của người đánh giá.");
      return;
    }

    if (!window.confirm("Xác nhận người đánh giá, hồ sơ nhà khoa học, vai trò và thời hạn phân công?")) return;
    setIsAssigning(true);
    try {
      await assignProposalReviewer(proposalId, {
        reviewerUsername: reviewerUsername.trim(),
        researcherProfileId: profileId, contextVersion,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : undefined,
        effectiveUntil: effectiveUntil ? new Date(effectiveUntil).toISOString() : undefined,
        assignmentRole,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined
      });
      setReviewerUsername(""); setProfileId("");
      setDueDate("");
      setMessage("Đã phân công người đánh giá.");
      await refresh();
      onWorkflowChange();
    } catch (error) {
      setAssignError(error instanceof Error ? error.message : "Không thể phân công người đánh giá.");
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleRevoke(assignmentId: string, reviewerName: string) {
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
      await refresh();
      onWorkflowChange();
    } catch (error) {
      setAssignError(error instanceof Error ? error.message : "Không thể thu hồi phân công.");
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
    if (markReady && !window.confirm("Chuyển hồ sơ sang trạng thái chờ phê duyệt? Vòng đánh giá sẽ được đóng lại.")) {
      return;
    }

    setSavingMode(markReady ? "ready" : "draft");
    try {
      await saveProposalEvaluationSummary(proposalId, { summary: summaryText, recommendation, markReady });
      setSummaryDirty(false);
      setMessage(markReady ? "Đã chuyển hồ sơ sang chờ phê duyệt." : "Đã lưu bản nháp tổng hợp.");
      await refresh();
      onWorkflowChange();
    } catch (error) {
      const evaluationError = error as EvaluationApiError;
      setSummaryError(evaluationError.message);
      setPendingNames((evaluationError.pendingReviewers ?? []).map((item) => item.reviewerDisplayName).filter(Boolean));
    } finally {
      setSavingMode("");
    }
  }

  return (
    <>
      <SectionCard
        title="Phân công đánh giá"
        subtitle="Người phản biện và thành viên hội đồng được phân công cho hồ sơ này"
        action={<StatusBadge status={progress.proposalStatus} />}
      >
        <div className="meta-grid">
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
              {progress.averageTotalScore === null ? "Chưa có" : `${progress.averageTotalScore}/${progress.maxTotalScore}`}
            </span>
          </div>
        </div>

        {assignError ? <p className="form-error">{assignError}</p> : null}
        {message ? (
          <p className="state-message success" role="status">
            {message}
          </p>
        ) : null}

        {progress.assignments.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Người đánh giá</th>
                  <th>Vai trò</th>
                  <th>Hạn đánh giá</th>
                  <th>Tình trạng phiếu</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {progress.assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>
                      <span className="record-title">{assignment.reviewerDisplayName}</span>
                      <span className="record-meta">
                        {assignment.reviewerUnit} · Phân công {formatDate(assignment.assignedAt)}
                      </span>
                    </td>
                    <td>{assignment.assignmentRoleLabel}</td>
                    <td>{formatDueDate(assignment.dueDate)}</td>
                    <td>
                      {assignment.status === "revoked" ? (
                        <span className="record-meta">{assignment.statusLabel}</span>
                      ) : assignment.reviewStatus === "submitted" ? (
                        <>
                          <span className="record-title">
                            Đã gửi · {assignment.reviewTotalScore}/{progress.maxTotalScore}
                          </span>
                          <span className="record-meta">{assignment.reviewRecommendationLabel}</span>
                        </>
                      ) : (
                        <span className="record-meta">Chưa gửi phiếu</span>
                      )}
                    </td>
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
        )}

        <form className="admin-form compact-form" onSubmit={(event) => void handleAssign(event)}>
          <div className="section-mini-heading">Phân công mới</div>
          <label className="field"><span>Tìm hồ sơ nhà khoa học</span><input value={candidateQuery} onChange={(e) => setCandidateQuery(e.target.value)} /></label>
          <button className="button" type="button" disabled={!canAssign || isAssigning} onClick={() => void loadReviewerCandidates(proposalId, candidateQuery).then(setCandidates).catch((error) => setAssignError(error.message))}>Tìm người đánh giá</button>
          <label className="field"><span>Hồ sơ nhà khoa học *</span><select required value={profileId} disabled={!canAssign} onChange={(e) => { setProfileId(e.target.value); const profile = candidates.profiles.find((p) => p.id === e.target.value); setReviewerUsername(candidates.accounts.find((a) => a.id === profile?.linkedUserId)?.username ?? ""); }}><option value="">Chọn hồ sơ đang hoạt động</option>{candidates.profiles.map((p) => <option key={p.id} value={p.id}>{p.fullName}{p.linkedUserId ? "" : " — cần liên kết tài khoản"}</option>)}</select></label>
          <p className="record-meta">Nếu hồ sơ chưa liên kết, phân công sẽ ghi nhận liên kết với tài khoản bạn chọn. <a href="/researcher-profiles">Quản lý hồ sơ nhà khoa học</a></p>
          <div className="form-grid two"><label className="field"><span>Hiệu lực từ (để trống: ngay lập tức)</span><input type="datetime-local" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} disabled={!canAssign} /></label><label className="field"><span>Hiệu lực đến (tùy chọn)</span><input type="datetime-local" value={effectiveUntil} onChange={(e) => setEffectiveUntil(e.target.value)} disabled={!canAssign} /></label></div>
          <div className="form-grid two">
            <label className="field">
              <span>Tài khoản người đánh giá</span>
              <select value={reviewerUsername} onChange={(event) => setReviewerUsername(event.target.value)} disabled={!canAssign} required>
                <option value="">Chọn tài khoản đã kiểm tra xung đột</option>
                {candidates.accounts.filter((a) => !candidates.profiles.find((p) => p.id === profileId)?.linkedUserId || candidates.profiles.find((p) => p.id === profileId)?.linkedUserId === a.id).map((account) => <option key={account.id} value={account.username}>{account.displayName} ({account.username})</option>)}
              </select>
            </label>
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
              <input type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} disabled={!canAssign} />
            </label>
          </div>
          <button className="button primary" type="submit" disabled={!canAssign || isAssigning}>
            <UserPlus size={16} aria-hidden="true" />
            {isAssigning ? "Đang phân công" : "Phân công đánh giá"}
          </button>
          {!canAssign ? (
            <p className="record-meta">
              Hồ sơ đang ở trạng thái &quot;{progress.proposalStatusLabel}&quot; nên không thể thay đổi phân công đánh giá.
            </p>
          ) : null}
        </form>
      </SectionCard>

      <SectionCard title="Tổng hợp kết quả đánh giá" subtitle="Kết luận của chuyên viên trước khi trình lãnh đạo phê duyệt">
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
        ) : (
          <EmptyState title="Chưa có phiếu đánh giá" message="Nội dung nhận xét sẽ hiện ở đây khi người đánh giá gửi phiếu." />
        )}

        {progress.pendingCount > 0 ? (
          <p className="state-message warning" role="status">
            Còn {progress.pendingCount} phiếu chưa gửi:{" "}
            {progress.pendingReviewers.map((item) => item.reviewerDisplayName).join(", ")}.
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
            <button
              className="button"
              type="button"
              disabled={!canConsolidate || savingMode !== ""}
              onClick={() => void handleSaveSummary(false)}
            >
              <Save size={16} aria-hidden="true" />
              {savingMode === "draft" ? "Đang lưu" : "Lưu nháp tổng hợp"}
            </button>
            <button
              className="button primary"
              type="button"
              disabled={!canConsolidate || isReadyForApproval || !progress.allReviewsSubmitted || savingMode !== ""}
              onClick={() => void handleSaveSummary(true)}
            >
              <Send size={16} aria-hidden="true" />
              {savingMode === "ready" ? "Đang chuyển" : "Chuyển chờ phê duyệt"}
            </button>
          </div>
          {!canConsolidate ? (
            <p className="record-meta">Chỉ hồ sơ đang đánh giá hoặc chờ phê duyệt mới được tổng hợp kết quả.</p>
          ) : !progress.allReviewsSubmitted && !isReadyForApproval ? (
            <p className="record-meta">
              {progress.activeAssignmentCount === 0
                ? "Chưa phân công người đánh giá nên chưa thể chuyển hồ sơ sang chờ phê duyệt."
                : "Còn phiếu đánh giá chưa gửi nên chưa thể chuyển hồ sơ sang chờ phê duyệt."}
            </p>
          ) : null}
        </form>
      </SectionCard>
    </>
  );
}
