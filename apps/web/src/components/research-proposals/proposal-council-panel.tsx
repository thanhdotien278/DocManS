"use client";

import { useEffect, useRef, useState } from "react";
import { Send, UserMinus, UserPlus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog } from "@/components/ui/dialog";
import { SectionCard } from "@/components/ui/section-card";
import { formatIntakeDate, intakeDateToIso } from "@/lib/intake-dates";
import {
  assignProposalReviewer,
  decideEvaluationCouncil,
  isNotEntitled,
  loadEvaluationCouncil,
  loadReviewerCandidates,
  revokeProposalReviewAssignment,
  submitEvaluationCouncil,
  type CouncilPosition,
  type CouncilStatus,
  type EvaluationApiError,
  type EvaluationCouncil,
  type ReviewerCandidates
} from "@/lib/proposal-evaluations-api";

const STATUS_TONE: Record<CouncilStatus, string> = { NOT_APPLICABLE: "neutral", FORMING: "warning", READY_TO_SUBMIT: "info", IN_APPROVAL: "info", ESTABLISHED: "success" };
const INVITATION_TONE = { invited: "warning", accepted: "success", declined: "danger" } as const;

/** Dialog xác nhận có (hoặc không) ô lý do; dùng cho thu hồi, ký, trả lại và từ chối lời mời. */
export function ReasonDialog({ title, description, reasonLabel, requireReason = true, confirmLabel, onConfirm, onClose }: { title: string; description?: string; reasonLabel?: string; requireReason?: boolean; confirmLabel: string; onConfirm: (reason: string) => Promise<void>; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const needsReason = Boolean(reasonLabel);
  const blocked = needsReason && requireReason && !reason.trim();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (blocked || busy) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm(reason.trim());
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Không thể thực hiện thao tác.");
      setBusy(false);
    }
  }

  return (
    <Dialog className="form-dialog" label={title} onClose={() => { if (!busy) onClose(); }}>
      <SectionCard title={title} subtitle={description}>
        <form className="admin-form" onSubmit={(event) => void submit(event)}>
          {needsReason ? (
            <label className="field">
              <span>{reasonLabel}{requireReason ? " *" : ""}</span>
              <textarea autoFocus rows={3} maxLength={1000} required={requireReason} value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
          ) : null}
          <p className="form-error" role="alert" aria-live="polite">{error}</p>
          <div className="button-row">
            <button className="button" type="button" disabled={busy} onClick={onClose}>Hủy</button>
            <button className="button primary" type="submit" disabled={busy || blocked} title={blocked ? "Nhập lý do để tiếp tục" : undefined}>{busy ? "Đang xử lý" : confirmLabel}</button>
          </div>
        </form>
      </SectionCard>
    </Dialog>
  );
}

type DialogKind = { type: "revoke"; assignmentId: string; name: string } | { type: "sign" } | { type: "return" } | null;

/**
 * Hội đồng thẩm định (spec hội đồng §10 S2/S4/S5). Mọi nút do `viewer.*` của backend quyết định; nút bị khóa vẫn hiện
 * kèm lý do. 401/403 thì panel ẩn (người xem không thuộc nhóm lập/rà soát/ký).
 */
export function ProposalCouncilPanel({ proposalId, onChanged }: { proposalId: string; onChanged: () => void }) {
  const [council, setCouncil] = useState<EvaluationCouncil | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "hidden" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [blockers, setBlockers] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [submitNote, setSubmitNote] = useState("");

  const [position, setPosition] = useState("");
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<ReviewerCandidates["users"]>([]);
  const [candidateState, setCandidateState] = useState<"idle" | "loading" | "error">("idle");
  const [reviewerUserId, setReviewerUserId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const requestSeq = useRef(0);

  async function refresh() {
    try {
      setCouncil(await loadEvaluationCouncil(proposalId));
      setState("ready");
    } catch (thrown) {
      if (isNotEntitled(thrown)) { setState("hidden"); return; }
      setLoadError(thrown instanceof Error ? thrown.message : "Không tải được hội đồng thẩm định.");
      setState("error");
    }
  }

  useEffect(() => {
    void refresh();
  }, [proposalId]);

  const openSlots = council?.slots.filter((slot) => slot.filled < slot.required) ?? [];
  const canInvite = Boolean(council?.viewer.canInvite) && council?.status !== "IN_APPROVAL";
  const activePosition = openSlots.some((slot) => slot.position === position) ? position : "";

  // Tìm ứng viên theo vị trí, debounce 300 ms; bỏ kết quả của request cũ.
  useEffect(() => {
    if (!canInvite || !activePosition) { setCandidates([]); setCandidateState("idle"); return; }
    const seq = ++requestSeq.current;
    setCandidateState("loading");
    const timer = window.setTimeout(() => {
      loadReviewerCandidates(proposalId, query.trim(), activePosition as CouncilPosition)
        .then((data) => { if (seq === requestSeq.current) { setCandidates(data.users); setCandidateState("idle"); } })
        .catch(() => { if (seq === requestSeq.current) { setCandidates([]); setCandidateState("error"); } });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [proposalId, canInvite, activePosition, query, council?.members.length]);

  if (state === "loading") return <p className="state-message">Đang tải hội đồng thẩm định...</p>;
  if (state === "hidden") return null;
  if (state === "error" || !council) return (
    <p className="state-message error" role="alert">{loadError || "Không tải được hội đồng thẩm định."} <button className="button" type="button" onClick={() => { setState("loading"); void refresh(); }}>Thử lại</button></p>
  );

  const { viewer, approval } = council;

  function fail(thrown: unknown) {
    const apiError = thrown as EvaluationApiError;
    setError(apiError?.message ?? "Không thể thực hiện thao tác.");
    setBlockers(apiError?.blockers ?? []);
    if (apiError?.code === "CONTEXT_VERSION_MISMATCH") void refresh();
  }

  async function run(work: () => Promise<unknown>, success: string) {
    setError("");
    setBlockers([]);
    setMessage("");
    setBusy(true);
    try {
      await work();
      setMessage(success);
      await refresh();
      onChanged();
    } catch (thrown) {
      fail(thrown);
    } finally {
      setBusy(false);
    }
  }

  function invite(event: React.FormEvent) {
    event.preventDefault();
    if (!activePosition) { setError("Chọn vị trí trong hội đồng."); return; }
    if (!reviewerUserId) { setError("Chọn người được mời."); return; }
    void run(async () => {
      await assignProposalReviewer(proposalId, { reviewerUserId, assignmentRole: activePosition as CouncilPosition, dueDate: dueDate ? intakeDateToIso(dueDate, true) : undefined, contextVersion: council!.contextVersion });
      setReviewerUserId("");
      setDueDate("");
      setQuery("");
    }, "Đã gửi lời mời.");
  }

  async function dialogAction(reason: string) {
    if (!dialog) return;
    const version = council!.contextVersion;
    try {
      if (dialog.type === "revoke") await revokeProposalReviewAssignment(proposalId, dialog.assignmentId, reason, version);
      else await decideEvaluationCouncil(proposalId, dialog.type === "sign" ? "sign" : "return", reason, version);
    } catch (thrown) {
      if ((thrown as EvaluationApiError)?.code === "CONTEXT_VERSION_MISMATCH") void refresh();
      throw thrown;
    }
    setMessage(dialog.type === "revoke" ? "Đã thu hồi lời mời." : dialog.type === "sign" ? "Đã ký thành lập hội đồng." : "Đã trả lại tờ trình.");
    setDialog(null);
    await refresh();
    onChanged();
  }

  const showSignControls = council.status === "IN_APPROVAL" && (viewer.canSign || viewer.canReturn || Boolean(viewer.signBlockedReason));
  const subtitle = council.status === "ESTABLISHED"
    ? `Đã thành lập${council.establishedAt ? ` ngày ${formatIntakeDate(council.establishedAt)}` : ""}`
    : council.status === "IN_APPROVAL" && approval ? `${council.statusLabel} · ${approval.stageLabel}` : council.statusLabel;

  return (
    <SectionCard
      title="Hội đồng thẩm định"
      subtitle={subtitle}
      action={<span className={`status-badge ${STATUS_TONE[council.status]}`}>{council.statusLabel}</span>}
    >
      {council.legacyRound ? <p className="record-meta">Hội đồng theo quy tắc cũ (vòng trước khi áp dụng cơ cấu Chủ tịch/Thư ký).</p> : null}

      <p className="record-meta" aria-label="Tiến độ nhận lời theo vị trí">
        {council.slots.map((slot, index) => (
          <span key={slot.position} title={`Đã mời ${slot.filled}, đã nhận lời ${slot.accepted}`}>{index ? " · " : ""}{slot.positionLabel} {slot.accepted}/{slot.required}</span>
        ))}
        {` · Tổng số thành viên cấu hình: ${council.config.memberCount}`}
      </p>

      <p className="form-error" role="alert" aria-live="polite">{error}</p>
      {blockers.length ? <ul className="plain-list form-error">{blockers.map((item) => <li key={item}>{item}</li>)}</ul> : null}
      {message ? <p className="state-message success" role="status">{message}</p> : null}

      {council.members.length ? (
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Danh sách thành viên hội đồng">
          <table className="data-table">
            <thead>
              <tr><th>Họ tên</th><th>Đơn vị</th><th>Vị trí</th><th>Lời mời</th><th>Lý do từ chối</th><th>Hạn</th><th>Người mời</th>{viewer.canRevoke ? <th>Thao tác</th> : null}</tr>
            </thead>
            <tbody>
              {council.members.map((member) => (
                <tr key={member.assignmentId}>
                  <td><span className="record-title">{member.displayName}</span><span className="record-meta">{member.username}</span></td>
                  <td>{member.unit}</td>
                  <td>{member.assignmentRoleLabel}{member.scoring ? "" : <span className="record-meta">Không chấm phiếu</span>}</td>
                  <td><span className={`status-badge ${INVITATION_TONE[member.invitationStatus]}`}>{member.invitationStatusLabel}</span></td>
                  <td>{member.declineReason || "—"}</td>
                  <td>{member.dueDate ? formatIntakeDate(member.dueDate) : "Không đặt hạn"}</td>
                  <td>{member.assignedByDisplayName}</td>
                  {viewer.canRevoke ? (
                    <td>
                      <button className="button icon-button danger" type="button" title="Thu hồi lời mời" aria-label={`Thu hồi lời mời của ${member.displayName}`} disabled={busy} onClick={() => setDialog({ type: "revoke", assignmentId: member.assignmentId, name: member.displayName })}>
                        <UserMinus size={16} aria-hidden="true" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Chưa có thành viên được mời" message={canInvite ? "Chọn vị trí và mời người đầu tiên để lập hội đồng." : "Danh sách thành viên chưa có hoặc không được hiển thị cho tài khoản này."} />
      )}

      {council.status === "IN_APPROVAL" ? (
        <p className="state-message warning" role="status">Danh sách bị khóa trong khi trình ký. Trả lại tờ trình để thay đổi.</p>
      ) : canInvite ? (
        <form className="admin-form compact-form" onSubmit={invite} aria-label="Mời thành viên hội đồng">
          <div className="section-mini-heading">Mời thành viên</div>
          {openSlots.length ? (
            <>
              <div className="form-grid two">
                <label className="field">
                  <span>Vị trí *</span>
                  <select required value={activePosition} onChange={(event) => { setPosition(event.target.value); setReviewerUserId(""); }}>
                    <option value="">Chọn vị trí còn trống</option>
                    {openSlots.map((slot) => <option key={slot.position} value={slot.position}>{slot.positionLabel} (còn {slot.required - slot.filled})</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Hạn đánh giá (tùy chọn)</span>
                  <input type="date" lang="vi" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                </label>
              </div>
              <label className="field">
                <span>Tìm người được mời (tên hoặc tài khoản)</span>
                <input value={query} disabled={!activePosition} onChange={(event) => setQuery(event.target.value)} />
              </label>
              <label className="field">
                <span>Người được mời *</span>
                <select required disabled={!activePosition} value={reviewerUserId} onChange={(event) => setReviewerUserId(event.target.value)}>
                  <option value="">{candidateState === "loading" ? "Đang tìm..." : "Chọn người đủ điều kiện"}</option>
                  {candidates.map((user) => <option key={user.id} value={user.id}>{user.displayName} ({user.username ?? "Chưa có tên đăng nhập"})</option>)}
                </select>
              </label>
              {activePosition && candidateState === "error" ? <p className="form-error" role="alert">Không tải được danh sách người được mời.</p> : null}
              {activePosition && candidateState === "idle" && !candidates.length ? <p className="record-meta">Không có tài khoản phù hợp. Chủ nhiệm, thành viên đề tài, chuyên viên phụ trách và người đã có vị trí không xuất hiện.</p> : null}
              <button className="button primary" type="submit" disabled={busy || !activePosition || !reviewerUserId}>
                <UserPlus size={16} aria-hidden="true" />
                {busy ? "Đang gửi" : "Gửi lời mời"}
              </button>
            </>
          ) : <p className="record-meta">Đã đủ thành viên cho mọi vị trí theo cấu hình ({council.config.memberCount} người).</p>}
        </form>
      ) : viewer.inviteBlockedReason ? (
        <p className="record-meta">{viewer.inviteBlockedReason}</p>
      ) : null}

      {council.status === "FORMING" || council.status === "READY_TO_SUBMIT" ? (
        <div className="form-section-inline">
          <div className="section-mini-heading">Điều kiện trình</div>
          {council.blockers.length ? (
            <ul className="plain-list">{council.blockers.map((item) => <li key={item} className="record-meta">{item}</li>)}</ul>
          ) : <p className="record-meta">Đủ thành viên, mọi người đã chấp nhận.</p>}
        </div>
      ) : null}

      {viewer.canSubmit || (council.status === "READY_TO_SUBMIT" || council.status === "FORMING") && viewer.submitBlockedReason ? (
        <div className="admin-form compact-form">
          {viewer.canSubmit ? (
            <label className="field">
              <span>Ghi chú trình (tùy chọn)</span>
              <textarea rows={2} maxLength={1000} value={submitNote} onChange={(event) => setSubmitNote(event.target.value)} />
            </label>
          ) : null}
          <button
            className="button primary"
            type="button"
            disabled={busy || !viewer.canSubmit}
            title={viewer.canSubmit ? undefined : viewer.submitBlockedReason}
            onClick={() => void run(async () => { await submitEvaluationCouncil(proposalId, council.contextVersion, submitNote.trim()); setSubmitNote(""); }, "Đã lập tờ trình thành lập hội đồng.")}
          >
            <Send size={16} aria-hidden="true" />
            Lập tờ trình thành lập hội đồng
          </button>
          {!viewer.canSubmit && viewer.submitBlockedReason ? <p className="record-meta">{viewer.submitBlockedReason}</p> : null}
        </div>
      ) : null}

      {approval?.lastNote && council.status !== "ESTABLISHED" ? <p className="record-meta">Ghi chú gần nhất ({approval.stageLabel}): {approval.lastNote}</p> : null}

      {showSignControls ? (
        <div className="button-row">
          <button className="button primary" type="button" disabled={busy || !viewer.canSign} title={viewer.canSign ? undefined : viewer.signBlockedReason} onClick={() => setDialog({ type: "sign" })}>Ký thành lập hội đồng</button>
          {viewer.canReturn ? <button className="button" type="button" disabled={busy} onClick={() => setDialog({ type: "return" })}>Trả lại</button> : null}
        </div>
      ) : null}
      {showSignControls && !viewer.canSign && viewer.signBlockedReason ? <p className="record-meta">{viewer.signBlockedReason}</p> : null}

      {dialog?.type === "revoke" ? (
        <ReasonDialog title={`Thu hồi lời mời của ${dialog.name}`} description="Lịch sử lời mời vẫn được giữ lại." reasonLabel="Lý do thu hồi" confirmLabel="Thu hồi" onConfirm={dialogAction} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.type === "sign" ? (
        <ReasonDialog title="Ký thành lập hội đồng" description="Sau khi ký, thành viên được đọc hồ sơ. Không hoàn tác." confirmLabel="Ký thành lập" onConfirm={dialogAction} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.type === "return" ? (
        <ReasonDialog title="Trả lại tờ trình" description="Hội đồng quay về trạng thái sẵn sàng trình để chỉnh sửa." reasonLabel="Lý do trả lại" confirmLabel="Trả lại" onConfirm={dialogAction} onClose={() => setDialog(null)} />
      ) : null}
    </SectionCard>
  );
}
