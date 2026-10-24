"use client";

import { useEffect, useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { decideEvaluationCouncil, isNotEntitled, loadEvaluationCouncil, submitEvaluationCouncil, type EvaluationCouncil } from "@/lib/proposal-evaluations-api";

/**
 * Story 5.10 — hội đồng đánh giá = danh sách phân công của vòng hiện tại. TP/TB/CV lập tờ trình sau khi mọi thành viên
 * đã chấp nhận; GĐ hoặc PGĐ-KH ký. Backend quyết định nút nào bấm được (canOpen/canSign) và lý do khóa.
 */
export function ProposalCouncilPanel({ proposalId, onChanged }: { proposalId: string; onChanged: () => void }) {
  const [council, setCouncil] = useState<EvaluationCouncil | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "hidden" | "error">("loading");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      setCouncil(await loadEvaluationCouncil(proposalId));
      setState("ready");
    } catch (thrown) {
      setState(isNotEntitled(thrown) ? "hidden" : "error");
    }
  }

  useEffect(() => {
    void refresh();
  }, [proposalId]);

  if (state === "loading") return <p className="state-message">Đang tải hội đồng đánh giá...</p>;
  if (state === "hidden") return null;
  if (state === "error" || !council) return <p className="state-message error">Không tải được hội đồng đánh giá.</p>;

  async function run(work: () => Promise<unknown>) {
    setError("");
    setBusy(true);
    try {
      await work();
      setNote("");
      await refresh();
      onChanged();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Không thể thực hiện thao tác.");
    } finally {
      setBusy(false);
    }
  }

  const { approval } = council;
  return (
    <SectionCard title="Hội đồng đánh giá" subtitle={council.established ? "Đã được Ban giám đốc ký thành lập" : approval ? approval.stageLabel : "Chưa lập tờ trình thành lập hội đồng"}>
      {error ? <p className="form-error">{error}</p> : null}
      {council.members.length ? (
        <ul className="plain-list">
          {council.members.map((member) => (
            <li key={member.assignmentId}>
              <span className="record-title">{member.displayName}</span>{" "}
              <span className="record-meta">{member.assignmentRoleLabel} · {member.invitationStatusLabel}{member.declineReason ? ` · Lý do: ${member.declineReason}` : ""}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {council.canOpen ? (
        <button className="button primary" type="button" disabled={busy} onClick={() => void run(() => submitEvaluationCouncil(proposalId, council.contextVersion))}>Lập tờ trình hội đồng</button>
      ) : null}
      {council.canSign || council.canReturn ? (
        <div className="form-row">
          <label className="field">
            <span>Lý do (bắt buộc khi trả lại)</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} />
          </label>
          <button className="button primary" type="button" disabled={busy || !council.canSign} title={council.canSign ? undefined : council.blockedReason} onClick={() => void run(() => decideEvaluationCouncil(proposalId, "sign", note.trim(), council.contextVersion))}>Ký thành lập hội đồng</button>{" "}
          <button className="button" type="button" disabled={busy || !council.canReturn} onClick={() => { if (!note.trim()) { setError("Nhập lý do khi trả lại tờ trình."); return; } void run(() => decideEvaluationCouncil(proposalId, "return", note.trim(), council.contextVersion)); }}>Trả lại</button>
        </div>
      ) : null}
      {!council.canOpen && !council.canSign && council.blockedReason ? <p className="record-meta">{council.blockedReason}</p> : null}
    </SectionCard>
  );
}
