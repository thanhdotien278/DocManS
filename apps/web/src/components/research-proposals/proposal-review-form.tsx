"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Save, Send } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import {
  isNotEntitled,
  loadMyProposalReview,
  saveMyProposalReview,
  submitMyProposalReview,
  type EvaluationApiError,
  type MyProposalReview
} from "@/lib/proposal-evaluations-api";

function formatDate(value: string) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "";
}

/**
 * ST-3.3 — the assigned reviewer's own scoring form.
 *
 * The rubric, its maxima and the recommendation options all come from the backend, so the form can
 * never present a criterion the server would reject. A submitted review renders read-only rather
 * than disappearing, so the reviewer can still see what they sent.
 */
export function ProposalReviewForm({ proposalId, onReviewSubmitted, canSubmitReview, blockedReason }: { proposalId: string; onReviewSubmitted: () => void; canSubmitReview: boolean; blockedReason: string }) {
  const [review, setReview] = useState<MyProposalReview | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [busyMode, setBusyMode] = useState<"" | "draft" | "submit">("");

  function applyReview(next: MyProposalReview) {
    setReview(next);
    setScores(Object.fromEntries(next.criteria.map((criterion) => [criterion.code, String(next.scoreData[criterion.code] ?? "")])));
    setComment(next.comment);
    setRecommendation(next.recommendation);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await loadMyProposalReview(proposalId);
        if (!cancelled) {
          applyReview(data);
          setState("ready");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        // Not the assigned reviewer — this panel simply does not apply to them. Any other failure
        // is surfaced rather than hidden behind an empty space.
        if (isNotEntitled(error)) {
          setState("forbidden");
          return;
        }
        setLoadError(error instanceof Error ? error.message : "Không tải được phiếu đánh giá.");
        setState("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [proposalId]);

  const runningTotal = useMemo(
    () =>
      Object.values(scores).reduce((total, value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? total + parsed : total;
      }, 0),
    [scores]
  );

  if (state === "loading") {
    return <p className="state-message">Đang tải phiếu đánh giá...</p>;
  }

  if (state === "error") {
    return <p className="state-message error">{loadError}</p>;
  }

  if (state === "forbidden" || !review) {
    return <SectionCard title="Phiếu đánh giá của tôi" subtitle="Chấm điểm và nhận xét theo phân công"><button className="button" type="button" disabled title={blockedReason}>Lưu nháp</button><p className="record-meta">{blockedReason}</p></SectionCard>;
  }

  const isSubmitted = review.status === "submitted";
  const canEdit = canSubmitReview && review.canEdit;

  function collectScores() {
    return Object.fromEntries(
      Object.entries(scores)
        .filter(([, value]) => value !== "")
        .map(([code, value]) => [code, Number(value)])
    );
  }

  function handleError(error: unknown) {
    const evaluationError = error as EvaluationApiError;
    setFieldErrors(evaluationError.fieldErrors ?? {});
    setFormError(evaluationError.message ?? "Không thể lưu phiếu đánh giá.");
  }

  async function handleSaveDraft() {
    setFieldErrors({});
    setFormError("");
    setMessage("");
    setBusyMode("draft");
    try {
      applyReview(await saveMyProposalReview(proposalId, { scoreData: collectScores(), comment, recommendation }));
      setMessage("Đã lưu nháp phiếu đánh giá.");
    } catch (error) {
      handleError(error);
    } finally {
      setBusyMode("");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError("");
    setMessage("");

    if (!window.confirm("Gửi phiếu đánh giá? Sau khi gửi, phiếu không còn được chỉnh sửa.")) {
      return;
    }

    setBusyMode("submit");
    try {
      applyReview(await submitMyProposalReview(proposalId, { scoreData: collectScores(), comment, recommendation }));
      setMessage("Đã gửi phiếu đánh giá.");
      onReviewSubmitted();
    } catch (error) {
      handleError(error);
    } finally {
      setBusyMode("");
    }
  }

  return (
    <SectionCard
      title="Phiếu đánh giá của tôi"
      subtitle={isSubmitted ? "Phiếu đã gửi và ở chế độ chỉ đọc" : "Chấm điểm theo từng tiêu chí, nhận xét và chọn kết luận đề nghị"}
    >
      <form className="admin-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="form-section-inline">
          <div className="section-mini-heading">Điểm theo tiêu chí</div>
          {review.criteria.map((criterion) => (
            <label className="field" key={criterion.code}>
              <span>
                {criterion.label} (tối đa {criterion.maxScore})
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={criterion.maxScore}
                step={1}
                disabled={!canEdit}
                aria-invalid={fieldErrors.scoreData ? true : undefined}
                aria-describedby={fieldErrors.scoreData ? "review-score-error" : undefined}
                value={scores[criterion.code] ?? ""}
                onChange={(event) => setScores((current) => ({ ...current, [criterion.code]: event.target.value }))}
              />
            </label>
          ))}
          {fieldErrors.scoreData ? (
            <span className="field-error" id="review-score-error">
              {fieldErrors.scoreData}
            </span>
          ) : null}
          <p className="record-meta">
            Tổng điểm hiện tại: {runningTotal}/{review.maxTotalScore}
          </p>
        </div>

        <div className="form-section-inline">
          <div className="section-mini-heading">Nhận xét và kết luận</div>
          <label className="field">
            <span>Nhận xét đánh giá</span>
            <textarea
              rows={5}
              maxLength={5000}
              disabled={!canEdit}
              aria-invalid={fieldErrors.comment ? true : undefined}
              aria-describedby={fieldErrors.comment ? "review-comment-error" : undefined}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            {fieldErrors.comment ? (
              <span className="field-error" id="review-comment-error">
                {fieldErrors.comment}
              </span>
            ) : null}
          </label>
          <label className="field">
            <span>Kết luận đề nghị</span>
            <select
              disabled={!canEdit}
              aria-invalid={fieldErrors.recommendation ? true : undefined}
              aria-describedby={fieldErrors.recommendation ? "review-recommendation-error" : undefined}
              value={recommendation}
              onChange={(event) => setRecommendation(event.target.value)}
            >
              <option value="">-- Chọn kết luận --</option>
              {review.recommendations.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldErrors.recommendation ? (
              <span className="field-error" id="review-recommendation-error">
                {fieldErrors.recommendation}
              </span>
            ) : null}
          </label>
        </div>

        {formError ? (
          <p className="form-error" role="alert">
            {formError}
          </p>
        ) : null}
        {message ? (
          <p className="state-message success" role="status">
            {message}
          </p>
        ) : null}
        {isSubmitted ? (
          <p className="state-message success compact-state">
            <CheckCircle2 size={16} aria-hidden="true" /> Đã gửi lúc {formatDate(review.submittedAt)} · Tổng {review.totalScore}/
            {review.maxTotalScore} · {review.recommendationLabel}
          </p>
        ) : null}

        <div className="button-row">
          <button className="button" type="button" disabled={!canEdit || busyMode !== ""} onClick={() => void handleSaveDraft()}>
            <Save size={16} aria-hidden="true" />
            {busyMode === "draft" ? "Đang lưu" : "Lưu nháp"}
          </button>
          <button className="button primary" type="submit" disabled={!canEdit || busyMode !== ""}>
            <Send size={16} aria-hidden="true" />
            {busyMode === "submit" ? "Đang gửi" : "Gửi phiếu đánh giá"}
          </button>
        </div>
        {!canEdit && !isSubmitted ? (
          <p className="record-meta">{blockedReason || "Hồ sơ không ở trạng thái cho phép nhập kết quả đánh giá."}</p>
        ) : null}
      </form>
    </SectionCard>
  );
}
