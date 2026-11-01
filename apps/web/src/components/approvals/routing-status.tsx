"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { advanceSubmission, loadSubjectSubmissions, returnSubmission, type ApprovalSubmission } from "@/lib/approval-routing-api";

const ACTION_LABELS: Record<string, string> = { SUBMIT: "Trình", FORWARD: "Trưởng ban chuyển Trưởng phòng", APPROVE: "Duyệt", REJECT: "Không phê duyệt", RETURN: "Trả lại", CANCEL: "Thay bằng tờ trình mới" };

/**
 * Trạng thái và lịch sử tờ trình của hồ sơ theo scope người xem. Nút chuyển tiếp/trả lại chỉ hiện khi backend
 * trả `actions`; người không được xem tờ trình nội bộ (403) thì không hiện gì.
 */
export function RoutingStatus({ subjectType, subjectId, refreshKey, onChanged }: { subjectType: "proposal" | "project"; subjectId: string; refreshKey?: string; onChanged?: () => void }) {
  const [submissions, setSubmissions] = useState<ApprovalSubmission[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setSubmissions((await loadSubjectSubmissions(subjectType, subjectId)).submissions);
    } catch {
      setSubmissions(null);
    }
  }, [subjectType, subjectId]);

  useEffect(() => { void reload(); }, [reload, refreshKey]);

  async function act(item: ApprovalSubmission, kind: "advance" | "return") {
    const note = (notes[item.id] ?? "").trim();
    if (kind === "return" && !note) { setError("Nhập lý do trả lại."); return; }
    setBusy(true);
    setError("");
    try {
      await (kind === "advance" ? advanceSubmission(item, note) : returnSubmission(item, note));
      setNotes((current) => ({ ...current, [item.id]: "" }));
      await reload();
      onChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không xử lý được tờ trình.");
      await reload();
    } finally {
      setBusy(false);
    }
  }

  if (!submissions?.length) return null;

  return (
    <SectionCard title="Tờ trình qua Phòng KHQS" subtitle="Người lập → Trưởng ban QLKH → Trưởng phòng KHQS → Ban giám đốc">
      {error ? <p role="alert" className="field-error">{error}</p> : null}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Thủ tục</th><th>Tình trạng</th><th>Diễn biến</th></tr>
          </thead>
          <tbody>
            {submissions.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="record-title">{item.kindLabel}</span>
                  <span className="record-meta">Người ký: {item.signerLabel} · Người lập: {item.submittedByName}</span>
                </td>
                <td>
                  <span className="record-title">{item.status === "PENDING" ? item.stageLabel : item.statusLabel}</span>
                  {item.status !== "PENDING" && item.status !== "APPROVED" && item.lastNote ? <span className="record-meta">Lý do: {item.lastNote}</span> : null}
                  {item.actions.advance || item.actions.return ? (
                    <div>
                      <label className="record-meta" htmlFor={`approval-note-${item.id}`}>Ghi chú / lý do trả lại</label>
                      <textarea id={`approval-note-${item.id}`} value={notes[item.id] ?? ""} maxLength={2000} disabled={busy} onChange={(event) => setNotes({ ...notes, [item.id]: event.target.value })} />
                      {item.actions.advance ? <button type="button" className="button" disabled={busy} onClick={() => void act(item, "advance")}>{item.stage === "BOARD_REVIEW" ? "Chuyển Trưởng phòng" : "Trình Ban giám đốc"}</button> : null}
                      {item.actions.return ? <button type="button" className="button secondary" disabled={busy} onClick={() => void act(item, "return")}>Trả lại người lập</button> : null}
                    </div>
                  ) : null}
                </td>
                <td>
                  {item.steps.map((step, index) => (
                    <span key={index} className="record-meta" style={{ display: "block" }}>
                      {new Date(step.createdAt).toLocaleString("vi-VN")} · {ACTION_LABELS[step.action] ?? step.action} · {step.actorName}{step.note ? ` — ${step.note}` : ""}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
