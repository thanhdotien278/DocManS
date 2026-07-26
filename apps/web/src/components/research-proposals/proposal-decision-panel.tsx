"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { decideProposal, isNotEntitled, loadProposalDecisionPackage, type ProposalDecisionPackage } from "@/lib/proposal-evaluations-api";

function formatDate(value: string) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Chưa có";
}

/**
 * ST-3.5 — the approval authority's decision package and approve/reject action.
 *
 * The package is a single authority-scoped read: reviews, consolidated outcome, file count and the
 * workflow trail behind them. A conflict is shown with its reason rather than silently hiding the
 * buttons (UX-DR27), and the backend re-checks authority, state and conflict on the action itself.
 */
export function ProposalDecisionPanel({ proposalId, onDecision }: { proposalId: string; onDecision: () => void }) {
  const [decisionPackage, setDecisionPackage] = useState<ProposalDecisionPackage | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyDecision, setBusyDecision] = useState<"" | "approve" | "reject">("");

  async function refresh() {
    try {
      setDecisionPackage(await loadProposalDecisionPackage(proposalId));
      setState("ready");
    } catch (error) {
      // Only leadership gets the authority read model; anything else is a real failure to report.
      if (isNotEntitled(error)) {
        setState("forbidden");
        return;
      }
      setLoadError(error instanceof Error ? error.message : "Không tải được hồ sơ trình phê duyệt.");
      setState("error");
    }
  }

  useEffect(() => {
    void refresh();
  }, [proposalId]);

  if (state === "loading") {
    return <p className="state-message">Đang tải hồ sơ trình phê duyệt...</p>;
  }

  if (state === "error") {
    return <p className="state-message error">{loadError}</p>;
  }

  if (state === "forbidden" || !decisionPackage) {
    return null;
  }

  const { conflict, evaluationSummary, progress } = decisionPackage;

  async function handleDecide(decision: "approve" | "reject") {
    setError("");
    setMessage("");

    if (decision === "reject" && !note.trim()) {
      setError("Nhập lý do khi không phê duyệt hồ sơ.");
      return;
    }

    const confirmText =
      decision === "approve"
        ? "Phê duyệt hồ sơ này? Hồ sơ sẽ chuyển sang trạng thái đã duyệt."
        : "Không phê duyệt hồ sơ này? Quyết định và lý do sẽ được lưu vào lịch sử.";
    if (!window.confirm(confirmText)) {
      return;
    }

    setBusyDecision(decision);
    try {
      const result = await decideProposal(proposalId, decision, note.trim());
      setMessage(`Đã ghi nhận quyết định: ${result.decision.decisionLabel}.`);
      setNote("");
      await refresh();
      onDecision();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Không thể ghi nhận quyết định.");
    } finally {
      setBusyDecision("");
    }
  }

  return (
    <SectionCard
      title="Hồ sơ trình phê duyệt"
      subtitle="Kết quả đánh giá, tổng hợp của chuyên viên và quyết định của lãnh đạo"
      action={<StatusBadge status={decisionPackage.proposalStatus} />}
    >
      <div className="meta-grid">
        <div className="meta-item">
          <span className="meta-label">Phiếu đánh giá đã gửi</span>
          <span className="meta-value">
            {progress.submittedCount}/{progress.activeAssignmentCount}
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Điểm trung bình</span>
          <span className="meta-value">
            {progress.averageTotalScore === null ? "Chưa có" : `${progress.averageTotalScore}/${progress.maxTotalScore}`}
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Tài liệu đính kèm</span>
          <span className="meta-value">{decisionPackage.attachmentCount}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Kết luận tổng hợp</span>
          <span className="meta-value">{evaluationSummary?.recommendationLabel || "Chưa tổng hợp"}</span>
        </div>
      </div>

      {conflict.conflicted ? (
        <p className="state-message warning" role="status">
          {conflict.viewerMessage}
        </p>
      ) : null}

      {evaluationSummary ? (
        <div className="form-section-inline">
          <div className="section-mini-heading">Tổng hợp của chuyên viên</div>
          <p className="record-title">{evaluationSummary.summary}</p>
          <p className="record-meta">
            {evaluationSummary.updatedByDisplayName || "Chuyên viên quản lý khoa học"} · Chuyển trình{" "}
            {formatDate(evaluationSummary.markedReadyAt)}
          </p>
        </div>
      ) : (
        <EmptyState title="Chưa có tổng hợp kết quả" message="Chuyên viên quản lý khoa học cần tổng hợp kết quả trước khi trình phê duyệt." />
      )}

      {decisionPackage.reviews.length ? (
        <div className="form-section-inline">
          <div className="section-mini-heading">Nhận xét của người đánh giá</div>
          <div className="timeline">
            {decisionPackage.reviews.map((review) => (
              <article className="timeline-item" key={review.id}>
                <span className="timeline-dot" />
                <div>
                  <p className="timeline-title">
                    {review.reviewerDisplayName} · {review.totalScore}/{review.maxTotalScore} điểm
                  </p>
                  <p className="timeline-meta">
                    {review.recommendationLabel} · {formatDate(review.submittedAt)}
                  </p>
                  <p className="timeline-meta">{review.comment}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {decisionPackage.decisions.length ? (
        <div className="form-section-inline">
          <div className="section-mini-heading">Quyết định đã ban hành</div>
          <div className="timeline">
            {decisionPackage.decisions.map((decision) => (
              <article className="timeline-item" key={decision.id}>
                <span className="timeline-dot" />
                <div>
                  <p className="timeline-title">{decision.decisionLabel}</p>
                  <p className="timeline-meta">
                    {decision.decidedByDisplayName || "Lãnh đạo"} · {formatDate(decision.decidedAt)}
                  </p>
                  {decision.note ? <p className="timeline-meta">{decision.note}</p> : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <form className="admin-form compact-form" onSubmit={(event) => event.preventDefault()}>
        <label className="field">
          <span>Ý kiến quyết định (bắt buộc khi không phê duyệt)</span>
          <textarea
            rows={3}
            maxLength={2000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={!decisionPackage.canDecide}
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="state-message success">{message}</p> : null}

        <div className="button-row">
          <button
            className="button primary"
            type="button"
            disabled={!decisionPackage.canDecide || busyDecision !== ""}
            onClick={() => void handleDecide("approve")}
          >
            <CheckCircle2 size={16} aria-hidden="true" />
            {busyDecision === "approve" ? "Đang xử lý" : "Phê duyệt"}
          </button>
          <button
            className="button danger"
            type="button"
            disabled={!decisionPackage.canDecide || busyDecision !== ""}
            onClick={() => void handleDecide("reject")}
          >
            <XCircle size={16} aria-hidden="true" />
            {busyDecision === "reject" ? "Đang xử lý" : "Không phê duyệt"}
          </button>
        </div>
        {!decisionPackage.canDecide && !conflict.conflicted ? (
          <p className="record-meta">
            Hồ sơ đang ở trạng thái &quot;{decisionPackage.proposalStatusLabel}&quot; nên chưa thể ra quyết định phê duyệt.
          </p>
        ) : null}
      </form>
    </SectionCard>
  );
}
