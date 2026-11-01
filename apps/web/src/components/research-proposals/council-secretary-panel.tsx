"use client";

import type { ViewerAuthorizationV1 } from "@rtms/permissions";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import {
  loadCouncilAnonymousReviews,
  saveProposalEvaluationSummary,
  type CouncilAnonymousReviews,
  type SecretarySummary,
  type ReviewRecommendationOption
} from "@/lib/proposal-evaluations-api";

const FALLBACK_RECOMMENDATIONS: ReviewRecommendationOption[] = [
  { code: "approve", label: "Đề nghị phê duyệt" },
  { code: "revise", label: "Đề nghị chỉnh sửa" },
  { code: "reject", label: "Đề nghị không phê duyệt" }
];

const CRITERION_LABELS: Record<string, string> = {
  "scientific-value": "Giá trị khoa học",
  feasibility: "Tính khả thi",
  "practical-impact": "Hiệu quả ứng dụng",
  "budget-suitability": "Tính hợp lý của kinh phí"
};

/**
 * Spec hội đồng S7 — thư ký xem phiếu ẩn danh (không tên/vai trò người chấm), soạn và lưu nháp tổng hợp/biên bản.
 * Thư ký không chấm, không chốt, không trình: panel chỉ có "Lưu nháp".
 */
export function CouncilSecretaryPanel({ proposalId, contextVersion, onChanged }: { proposalId: string; contextVersion?: ViewerAuthorizationV1["contextVersion"]; onChanged?: () => void }) {
  const [data, setData] = useState<CouncilAnonymousReviews | null>(null);
  const [summary, setSummary] = useState<SecretarySummary | null>(null);
  const [options, setOptions] = useState(FALLBACK_RECOMMENDATIONS);
  const [text, setText] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const reviews = await loadCouncilAnonymousReviews(proposalId);
      setData(reviews);
      // Bản nháp/trạng thái tổng hợp lấy từ chính endpoint của thư ký (không gọi review-progress: thư ký bị 403).
      const saved = reviews.evaluationSummary ?? null;
      setSummary(saved);
      setText((current) => current || saved?.summary || "");
      setRecommendation((current) => current || saved?.recommendation || "");
      setState("ready");
    } catch (thrown) {
      setLoadError(thrown instanceof Error ? thrown.message : "Không tải được phiếu đánh giá.");
      setState("error");
    }
  }

  useEffect(() => {
    void load();
  }, [proposalId]);

  if (state === "loading") return <p className="state-message">Đang tải biên bản và phiếu đánh giá...</p>;
  if (state === "error" || !data) {
    return <p className="state-message error" role="alert">{loadError} <button className="button" type="button" onClick={() => { setState("loading"); void load(); }}>Thử lại</button></p>;
  }

  const locked = summary?.status === "finalized" || summary?.status === "ready_for_approval";

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!text.trim()) { setError("Nhập nội dung tổng hợp/biên bản."); return; }
    if (!recommendation) { setError("Chọn kết luận tổng hợp."); return; }
    if (!contextVersion) { setError("Không xác định được phiên bản quyền của hồ sơ. Vui lòng tải lại."); return; }
    setSaving(true);
    try {
      const result = await saveProposalEvaluationSummary(proposalId, { summary: text, recommendation, contextVersion });
      setSummary(result.evaluationSummary);
      setMessage("Đã lưu bản nháp.");
      onChanged?.();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Không thể lưu bản nháp.");
    } finally {
      setSaving(false);
    }
  }

  const { progress } = data;
  return (
    <SectionCard title="Biên bản và dự thảo tổng hợp" subtitle="Thư ký hội đồng soạn dự thảo; Trưởng phòng, Trưởng ban hoặc Chuyên viên phụ trách chốt và trình">
      <p className="record-meta" role="status">
        Đã gửi {progress.submittedCount}/{progress.scoringMemberCount} phiếu · Còn chờ {progress.pendingCount} · Điểm trung bình: {progress.averageTotalScore == null ? "Chưa có" : progress.averageTotalScore}
      </p>

      {data.reviews.length ? (
        <div className="timeline">
          {data.reviews.map((review) => (
            <article className="timeline-item" key={review.label}>
              <span className="timeline-dot" />
              <div>
                <p className="timeline-title">{review.label} · {review.totalScore ?? "—"}/{review.maxTotalScore} điểm · {review.recommendationLabel}</p>
                <p className="timeline-meta">{Object.entries(review.scoreData).map(([code, score]) => `${CRITERION_LABELS[code] ?? code}: ${score}`).join(" · ")}</p>
                {review.comment ? <p className="timeline-meta">{review.comment}</p> : null}
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState title="Chưa có phiếu nào được gửi" message="Phiếu ẩn danh sẽ hiện ở đây khi thành viên hội đồng gửi phiếu." />}

      <form className="admin-form compact-form" onSubmit={(event) => void save(event)}>
        <label className="field">
          <span>Nội dung tổng hợp/biên bản</span>
          <textarea rows={6} maxLength={5000} disabled={locked} value={text} onChange={(event) => setText(event.target.value)} />
        </label>
        <label className="field">
          <span>Kết luận tổng hợp</span>
          <select disabled={locked} value={recommendation} onChange={(event) => setRecommendation(event.target.value)}>
            <option value="">-- Chọn kết luận --</option>
            {options.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
          </select>
        </label>
        <p className="form-error" role="alert" aria-live="polite">{error}</p>
        {message ? <p className="state-message success" role="status">{message}</p> : null}
        {locked ? (
          <p className="record-meta">Trạng thái: {summary?.statusLabel}. Bản tổng hợp đã được {summary?.updatedByDisplayName || "người có thẩm quyền"} chốt, chỉ đọc.</p>
        ) : (
          <button className="button primary" type="submit" disabled={saving || !contextVersion} title={!contextVersion ? "Tải lại hồ sơ để cập nhật quyền." : undefined}>
            <Save size={16} aria-hidden="true" />
            {saving ? "Đang lưu" : "Lưu nháp"}
          </button>
        )}
      </form>
    </SectionCard>
  );
}
