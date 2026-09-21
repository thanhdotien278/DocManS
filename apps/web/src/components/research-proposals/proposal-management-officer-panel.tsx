"use client";

import { useEffect, useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import {
  assignProposalManagementOfficer,
  loadProposalManagementOfficerCandidates,
  revokeProposalManagementOfficer,
  type ProposalManagementOfficerState
} from "@/lib/research-proposals-api";
import type { ViewerAuthorizationV1 } from "@rtms/permissions";

type Candidate = { id: string; username: string | null; displayName: string; unit: string };

export function ProposalManagementOfficerPanel({
  proposalId,
  state,
  contextVersion,
  canAssign,
  canRevoke,
  onChanged
}: {
  proposalId: string;
  state?: ProposalManagementOfficerState;
  contextVersion?: ViewerAuthorizationV1["contextVersion"];
  canAssign: boolean;
  canRevoke: boolean;
  onChanged: () => Promise<void> | void;
}) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [officerUserId, setOfficerUserId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!canAssign) return;
    void loadProposalManagementOfficerCandidates(proposalId).then(setCandidates).catch(() => setError("Không tải được danh sách cán bộ phụ trách."));
  }, [canAssign, proposalId]);

  async function assign() {
    if (!officerUserId || !reason.trim()) {
      setError("Chọn cán bộ và nhập lý do phân công.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await assignProposalManagementOfficer(proposalId, { officerUserId, reason: reason.trim(), contextVersion });
      setOfficerUserId("");
      setReason("");
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể phân công cán bộ phụ trách.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!reason.trim()) {
      setError("Nhập lý do thu hồi.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await revokeProposalManagementOfficer(proposalId, { reason: reason.trim(), contextVersion });
      setReason("");
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể thu hồi cán bộ phụ trách.");
    } finally {
      setBusy(false);
    }
  }

  if (!canAssign && !canRevoke && !state?.current) return null;

  return (
    <SectionCard title="Cán bộ phụ trách hồ sơ" subtitle="Phân công ở cấp bản ghi và được lưu lịch sử để kiểm soát phạm vi xử lý.">
      {state?.current ? (
        <div className="meta-grid">
          <div className="meta-item"><span className="meta-label">Đang phụ trách</span><span className="meta-value">{state.current.officerDisplayName} ({state.current.officerUsername})</span></div>
          <div className="meta-item"><span className="meta-label">Phân công từ</span><span className="meta-value">{new Date(state.current.effectiveFrom).toLocaleString("vi-VN")}</span></div>
        </div>
      ) : <p className="record-meta">Hồ sơ chưa có cán bộ phụ trách đang hoạt động.</p>}

      {canAssign ? (
        <div className="form-grid two">
          <label className="field">
            <span>{state?.current ? "Cán bộ thay thế" : "Cán bộ phụ trách"}</span>
            <select value={officerUserId} onChange={(event) => setOfficerUserId(event.target.value)} disabled={busy}>
              <option value="">Chọn cán bộ</option>
              {candidates.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.displayName} — {candidate.unit}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Lý do</span>
            <input maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy} />
          </label>
          <button className="button primary" type="button" onClick={() => void assign()} disabled={busy || !officerUserId}>{busy ? "Đang lưu" : state?.current ? "Phân công lại" : "Phân công"}</button>
        </div>
      ) : null}

      {canRevoke && state?.current ? <button className="button danger" type="button" onClick={() => void revoke()} disabled={busy}>Thu hồi phân công</button> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {state?.history?.length ? <p className="record-meta">Lịch sử phân công: {state.history.length} bản ghi.</p> : null}
    </SectionCard>
  );
}
