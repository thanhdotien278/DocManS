"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Send, UserMinus, UserPlus } from "lucide-react";
import { RoutingStatus } from "@/components/approvals/routing-status";
import { useSession } from "@/components/auth/session-provider";
import { ReasonDialog } from "@/components/research-proposals/proposal-council-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import {
  ACCEPTANCE_COUNCIL_ROLES, ACCEPTANCE_COUNCIL_ROLE_LABELS, ACCEPTANCE_MINUTES, ACCEPTANCE_RESULT_LABELS, INVITATION_STATUS_LABELS,
  acceptanceCouncilCandidates, decideAcceptanceCouncil, deleteEthicsFile, getAcceptanceCouncil, getAcceptanceDossier, inviteAcceptanceMember,
  projectFileUrl, projectStatusLabel, recordAcceptanceResult, respondAcceptanceInvitation, revokeAcceptanceMember, submitAcceptanceCouncil,
  uploadAcceptanceFile, type AcceptanceCouncilMember, type AcceptanceCouncilRole, type AcceptanceCouncilView
} from "@/lib/projects-api";

const INVITATION_TONE: Record<string, string> = { invited: "warning", accepted: "success", declined: "danger", revoked: "neutral" };
const MISSING_LABELS: Record<string, string> = { comment: "Nhận xét của hội đồng", minutes: "Biên bản họp hội đồng" };

type ApiError = Error & { code?: string; status?: number; body?: { blockers?: string[]; missing?: string[] } };
type DialogKind = { type: "revoke"; memberId: string; name: string } | { type: "decline"; memberId: string } | { type: "sign" } | { type: "reject" } | { type: "result" } | null;
type MinutesFile = { id: string; fileName: string; createdAt: string; canDelete: boolean };

function date(value?: string | null) { return value ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value)) : "—"; }

/**
 * Hội đồng nghiệm thu (Story 6.9 phần 2). Chỉ gọi `GET :id/acceptance-council` nên người chỉ có ghế (đơn vị khác) vẫn mở được.
 * Mọi nút theo `allowedActions`/`blockedActions` của view; nút bị khóa hiện lý do của backend.
 */
export function AcceptanceCouncilPanel({ projectId }: { projectId: string }) {
  const { account } = useSession();
  const [view, setView] = useState<AcceptanceCouncilView | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "hidden" | "error" | "declined">("loading");
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const [details, setDetails] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [submitNote, setSubmitNote] = useState("");
  const [minutes, setMinutes] = useState<MinutesFile[]>([]);
  const [minutesError, setMinutesError] = useState("");
  const [comment, setComment] = useState("");
  const [outcome, setOutcome] = useState<"accepted" | "failed" | "">("");

  const [role, setRole] = useState<AcceptanceCouncilRole | "">("");
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Array<{ id: string; displayName: string; username: string; unit: string | null }>>([]);
  const [candidateState, setCandidateState] = useState<"idle" | "loading" | "error">("idle");
  const [userId, setUserId] = useState("");
  const requestSeq = useRef(0);

  const can = (action: string) => !!view?.allowedActions.includes(`acceptance-council.${action}`);
  // Nút bị khóa chỉ hiện khi người xem có quyền nhưng sai trạng thái; ACTION_NOT_GRANTED thì ẩn hẳn.
  const lockedReason = (action: string) => view?.blockedActions.find((item) => item.action === `acceptance-council.${action}` && item.code !== "ACTION_NOT_GRANTED")?.reason ?? "";

  async function refresh() {
    try {
      const next = await getAcceptanceCouncil(projectId);
      setView(next);
      setStale(false);
      setState("ready");
      // Biên bản chỉ cần cho chủ tịch; danh sách tệp lấy từ hồ sơ nghiệm thu (chủ tịch đọc được sau khi thành lập).
      if (next.establishedAt && !next.result && next.allowedActions.includes("acceptance-council.record-result")) {
        // Lỗi tải hồ sơ: giữ danh sách cũ và báo ngay tại khu biên bản.
        try {
          const dossier = await getAcceptanceDossier(projectId);
          setMinutes(dossier.dossier?.files.filter((file) => file.filePurpose === ACCEPTANCE_MINUTES) ?? []);
          setMinutesError("");
        } catch (thrown) {
          setMinutesError(thrown instanceof Error ? `Không tải được biên bản: ${thrown.message}` : "Không tải được biên bản.");
        }
      } else { setMinutes([]); setMinutesError(""); }
    } catch (thrown) {
      const status = (thrown as ApiError).status;
      if (status === 401 || status === 403) { setState("hidden"); return; }
      setLoadError(thrown instanceof Error ? thrown.message : "Không tải được hội đồng nghiệm thu.");
      setState("error");
    }
  }

  useEffect(() => { void refresh(); }, [projectId]);

  const live = view?.members.filter((row) => row.invitationStatus !== "revoked") ?? [];
  // Đếm cả hàng đã từ chối (chưa thu hồi) như backend, nếu không lời mời sẽ bị COUNCIL_POSITION_FULL.
  const openRoles = view ? ACCEPTANCE_COUNCIL_ROLES.filter((item) => live.filter((row) => row.councilRole === item).length < view.config.structure[item]) : [];
  const forming = !!view && view.projectStatus === "pending_acceptance" && !view.establishedAt && view.approval?.status !== "PENDING";
  const canInvite = forming && can("invite");
  const activeRole = openRoles.includes(role as AcceptanceCouncilRole) ? role : "";
  const inviteBlocked = !activeRole ? "Chọn vị trí còn trống để mời." : !userId ? "Chọn người được mời." : "";

  // Tìm ứng viên, debounce 300 ms; bỏ kết quả của request cũ.
  useEffect(() => {
    if (!canInvite || !activeRole) { setCandidates([]); setCandidateState("idle"); return; }
    const seq = ++requestSeq.current;
    setCandidateState("loading");
    const timer = window.setTimeout(() => {
      acceptanceCouncilCandidates(projectId, query.trim())
        .then((users) => { if (seq === requestSeq.current) { setCandidates(users); setUserId((current) => users.some((user) => user.id === current) ? current : ""); setCandidateState("idle"); } })
        .catch(() => { if (seq === requestSeq.current) { setCandidates([]); setCandidateState("error"); } });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [projectId, canInvite, activeRole, query, live.length]);

  if (state === "loading") return <p className="state-message">Đang tải hội đồng nghiệm thu...</p>;
  if (state === "hidden") return <p className="state-message error" role="alert">Bạn không có quyền xem hội đồng nghiệm thu của đề tài này.</p>;
  if (state === "declined") return (
    <SectionCard title="Hội đồng nghiệm thu">
      <p className="state-message success" role="status">Bạn đã từ chối lời mời tham gia hội đồng nghiệm thu. Người mời đã được thông báo.</p>
      <div className="button-row"><Link className="button" href="/my-reviews">Về trang đánh giá của tôi</Link></div>
    </SectionCard>
  );
  if (state === "error" || !view) return (
    <p className="state-message error" role="alert">{loadError || "Không tải được hội đồng nghiệm thu."} <button className="button" type="button" onClick={() => { setState("loading"); void refresh(); }}>Thử lại</button></p>
  );

  function fail(thrown: unknown) {
    const apiError = thrown as ApiError;
    setError(apiError?.message ?? "Không thể thực hiện thao tác.");
    setStale(apiError?.code === "CONTEXT_VERSION_MISMATCH");
    setDetails(apiError?.code === "COUNCIL_NOT_READY" ? apiError.body?.blockers ?? [] : apiError?.code === "READINESS_INCOMPLETE" ? (apiError.body?.missing ?? []).map((key) => `Thiếu: ${MISSING_LABELS[key] ?? key}`) : []);
  }

  async function run(work: () => Promise<unknown>, success: string) {
    setError(""); setDetails([]); setMessage(""); setStale(false);
    setBusy(true);
    try {
      await work();
      setMessage(success);
      await refresh();
    } catch (thrown) {
      fail(thrown);
    } finally {
      setBusy(false);
    }
  }

  function invite(event: React.FormEvent) {
    event.preventDefault();
    if (!activeRole || !userId) { setError(activeRole ? "Chọn người được mời." : "Chọn vị trí trong hội đồng."); return; }
    void run(async () => {
      await inviteAcceptanceMember(projectId, userId, activeRole, view!.contextVersion);
      setUserId(""); setQuery("");
    }, "Đã gửi lời mời.");
  }

  async function dialogAction(reason: string) {
    if (!dialog) return;
    const version = view!.contextVersion;
    const done = { revoke: "Đã thu hồi lời mời.", decline: "", sign: "Đã ký thành lập hội đồng nghiệm thu.", reject: "Đã từ chối tờ trình hội đồng nghiệm thu.", result: "Đã ghi kết quả nghiệm thu." }[dialog.type];
    try {
      if (dialog.type === "revoke") await revokeAcceptanceMember(projectId, dialog.memberId, reason, version);
      else if (dialog.type === "decline") await respondAcceptanceInvitation(projectId, dialog.memberId, "decline", reason);
      else if (dialog.type === "sign" || dialog.type === "reject") await decideAcceptanceCouncil(projectId, dialog.type === "sign" ? "approve" : "reject", reason, version);
      else await recordAcceptanceResult(projectId, outcome as "accepted" | "failed", comment.trim(), version);
    } catch (thrown) {
      // Lỗi cần hiện ngoài dialog (tải lại, danh sách thiếu) thì đóng dialog; lỗi khác hiện trong dialog.
      const code = (thrown as ApiError)?.code;
      if (code === "CONTEXT_VERSION_MISMATCH" || code === "COUNCIL_NOT_READY" || code === "READINESS_INCOMPLETE") { setDialog(null); fail(thrown); return; }
      throw thrown;
    }
    setDialog(null);
    // Từ chối xong người xem mất ghế: không tải lại view (sẽ 403).
    if (dialog.type === "decline") { setState("declined"); return; }
    setError(""); setDetails([]); setStale(false);
    setMessage(done);
    await refresh();
  }

  async function uploadMinutes(file: File) {
    if (!view?.dossierId) return;
    await run(() => uploadAcceptanceFile(view.dossierId!, file, ACCEPTANCE_MINUTES, view.contextVersion), "Đã tải biên bản họp hội đồng.");
  }

  const { approval, result } = view;
  const pending = approval?.status === "PENDING";
  const ownSeat = view.members.find((row) => row.userId === account?.id && row.invitationStatus !== "revoked") ?? null;
  const ownInvitation = can("respond") && ownSeat?.invitationStatus === "invited" ? ownSeat : null;
  const showRevoke = forming && can("revoke");
  const submitVisible = forming && (can("submit") || !!lockedReason("submit"));
  const submitBlocked = !can("submit") ? lockedReason("submit") : view.blockers.length ? "Chưa đủ điều kiện trình: xem danh sách điều kiện." : "";
  const signVisible = pending && (can("sign") || !!lockedReason("sign"));
  const chairArea = !!view.establishedAt && !result && (can("record-result") || !!lockedReason("record-result"));
  const resultBlocked = !minutes.length ? "Tải biên bản họp hội đồng trước khi ghi kết quả." : !comment.trim() ? "Nhập nhận xét của hội đồng." : !outcome ? "Chọn kết quả Đạt hoặc Không đạt." : "";
  const subtitle = result ? `Đã ghi kết quả ngày ${date(result.recordedAt)}`
    : view.establishedAt ? `Đã thành lập ngày ${date(view.establishedAt)}`
    : pending ? `Đang trình · ${approval!.stageLabel}` : view.readsProject ? "Đang lập hội đồng" : "Lời mời tham gia hội đồng";
  const badge = result ? <span className={`status-badge ${result.outcome === "accepted" ? "success" : "danger"}`}>{ACCEPTANCE_RESULT_LABELS[result.outcome] ?? result.outcome}</span>
    : view.establishedAt ? <span className="status-badge success">Đã thành lập</span>
    : pending ? <span className="status-badge info">Đang trình ký</span> : <span className="status-badge warning">Đang lập</span>;

  const revokeButton = (member: AcceptanceCouncilMember, mobile = false) => member.invitationStatus === "revoked" ? null : mobile
    ? <button className="button danger" type="button" disabled={busy} onClick={() => setDialog({ type: "revoke", memberId: member.id, name: member.displayName })}>Thu hồi</button>
    : <button className="button icon-button danger" type="button" title="Thu hồi lời mời" aria-label={`Thu hồi lời mời của ${member.displayName}`} disabled={busy} onClick={() => setDialog({ type: "revoke", memberId: member.id, name: member.displayName })}><UserMinus size={16} aria-hidden="true" /></button>;
  const reasonText = (member: AcceptanceCouncilMember) => member.invitationStatus === "revoked" ? member.revokeReason : member.declineReason;

  return (
    <div className="form-section-inline">
      <div className="button-row">
        {view.readsProject ? <Link className="button" href={`/projects/${projectId}`}>Quay lại đề tài</Link> : null}
        {view.establishedAt && (view.readsProject || ownSeat?.invitationStatus === "accepted") ? <Link className="button" href={`/projects/${projectId}/acceptance-dossier`}>Mở hồ sơ nghiệm thu</Link> : null}
      </div>

      <SectionCard title={view.projectTitle || "Hội đồng nghiệm thu"} subtitle={`${subtitle} · Đề tài: ${projectStatusLabel(view.projectStatus)}`} action={badge}>
        {view.readsProject ? (
          <p className="record-meta" aria-label="Tiến độ nhận lời theo vị trí">
            {ACCEPTANCE_COUNCIL_ROLES.map((item, index) => {
              const rows = live.filter((row) => row.councilRole === item);
              return <span key={item} title={`Đã mời ${rows.length}, đã nhận lời ${rows.filter((row) => row.invitationStatus === "accepted").length}`}>{index ? " · " : ""}{ACCEPTANCE_COUNCIL_ROLE_LABELS[item]} {rows.filter((row) => row.invitationStatus === "accepted").length}/{view.config.structure[item]}</span>;
            })}
            {` · Tổng số thành viên cấu hình: ${view.config.memberCount}`}
          </p>
        ) : null}

        <p className="form-error" role="alert" aria-live="polite">{error}{stale ? <> <button className="button" type="button" disabled={busy} onClick={() => { setError(""); setStale(false); void refresh(); }}>Tải lại</button></> : null}</p>
        {details.length ? <ul className="plain-list form-error">{details.map((item) => <li key={item}>{item}</li>)}</ul> : null}
        {message ? <p className="state-message success" role="status">{message}</p> : null}

        {ownInvitation ? (
          <div className="form-section-inline">
            <div className="section-mini-heading">Lời mời của bạn</div>
            <p>Bạn được mời làm <strong>{ownInvitation.councilRoleLabel}</strong> hội đồng nghiệm thu đề tài này (mời ngày {date(ownInvitation.invitedAt)}).</p>
            <div className="button-row">
              <button className="button primary" type="button" disabled={busy} onClick={() => void run(() => respondAcceptanceInvitation(projectId, ownInvitation.id, "accept"), "Đã nhận lời tham gia hội đồng nghiệm thu.")}>Nhận lời</button>
              <button className="button danger" type="button" disabled={busy} onClick={() => setDialog({ type: "decline", memberId: ownInvitation.id })}>Từ chối</button>
            </div>
          </div>
        ) : null}

        {view.members.length ? (
          <>
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Danh sách thành viên hội đồng nghiệm thu">
              <table className="data-table">
                <thead>
                  <tr><th>Họ tên</th><th>Đơn vị</th><th>Vị trí</th><th>Lời mời</th><th>Lý do</th><th>Ngày mời</th>{showRevoke ? <th>Thao tác</th> : null}</tr>
                </thead>
                <tbody>
                  {view.members.map((member) => (
                    <tr key={member.id}>
                      <td><span className="record-title">{member.displayName}</span><span className="record-meta">{member.username}</span></td>
                      <td>{member.unit || "—"}</td>
                      <td>{member.councilRoleLabel}</td>
                      <td><span className={`status-badge ${INVITATION_TONE[member.invitationStatus]}`}>{INVITATION_STATUS_LABELS[member.invitationStatus] ?? member.invitationStatus}</span></td>
                      <td>{reasonText(member) || "—"}</td>
                      <td>{date(member.invitedAt)}</td>
                      {showRevoke ? <td>{revokeButton(member)}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-list">
              {view.members.map((member) => (
                <article className="list-card" key={member.id}>
                  <div className="list-card-header">
                    <span className="record-title">{member.displayName}</span>
                    <span className={`status-badge ${INVITATION_TONE[member.invitationStatus]}`}>{INVITATION_STATUS_LABELS[member.invitationStatus] ?? member.invitationStatus}</span>
                  </div>
                  <span className="record-meta">{member.councilRoleLabel} · {member.unit || "—"} · Mời ngày {date(member.invitedAt)}</span>
                  {reasonText(member) ? <span className="record-meta">Lý do: {reasonText(member)}</span> : null}
                  {showRevoke ? revokeButton(member, true) : null}
                </article>
              ))}
            </div>
          </>
        ) : (
          <EmptyState title="Chưa có thành viên được mời" message={canInvite ? "Chọn vị trí và mời người đầu tiên để lập hội đồng." : "Danh sách thành viên chưa có hoặc không được hiển thị cho tài khoản này."} />
        )}

        {pending && view.readsProject ? (
          <p className="state-message warning" role="status">Danh sách bị khóa khi trình ký ({approval!.stageLabel}). Trưởng ban, Trưởng phòng chuyển bước ở mục &quot;Tờ trình qua Phòng KHQS&quot; bên dưới.</p>
        ) : null}

        {canInvite ? (
          <form className="admin-form compact-form" onSubmit={invite} aria-label="Mời thành viên hội đồng nghiệm thu">
            <div className="section-mini-heading">Mời thành viên</div>
            {openRoles.length ? (
              <>
                <label className="field">
                  <span>Vị trí *</span>
                  <select required value={activeRole} onChange={(event) => { setRole(event.target.value as AcceptanceCouncilRole); setUserId(""); }}>
                    <option value="">Chọn vị trí còn trống</option>
                    {openRoles.map((item) => <option key={item} value={item}>{ACCEPTANCE_COUNCIL_ROLE_LABELS[item]} (còn {view.config.structure[item] - live.filter((row) => row.councilRole === item).length})</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Tìm người được mời (tên hoặc tài khoản)</span>
                  <input value={query} disabled={!activeRole} onChange={(event) => setQuery(event.target.value)} />
                </label>
                <label className="field">
                  <span>Người được mời *</span>
                  <select required disabled={!activeRole} value={userId} onChange={(event) => setUserId(event.target.value)}>
                    <option value="">{candidateState === "loading" ? "Đang tìm..." : "Chọn người đủ điều kiện"}</option>
                    {candidates.map((user) => <option key={user.id} value={user.id}>{user.displayName} ({user.username}){user.unit ? ` · ${user.unit}` : ""}</option>)}
                  </select>
                </label>
                {activeRole && candidateState === "error" ? <p className="form-error" role="alert">Không tải được danh sách người được mời.</p> : null}
                {activeRole && candidateState === "idle" && candidates.length >= 50 ? <p className="record-meta">Chỉ hiện 50 người đầu tiên. Nhập thêm tên hoặc tài khoản để thu hẹp.</p> : null}
                {activeRole && candidateState === "idle" && !candidates.length ? <p className="record-meta">Không có tài khoản phù hợp. Thành viên đề tài, Quản trị hệ thống, người chưa có lý lịch khoa học và người đã có vị trí không xuất hiện.</p> : null}
                <button className="button primary" type="submit" disabled={busy || !activeRole || !userId} title={inviteBlocked || undefined} aria-describedby={inviteBlocked ? "acceptance-invite-blocked" : undefined}>
                  <UserPlus size={16} aria-hidden="true" />
                  {busy ? "Đang gửi" : "Gửi lời mời"}
                </button>
                {inviteBlocked ? <p className="record-meta" id="acceptance-invite-blocked">{inviteBlocked}</p> : null}
              </>
            ) : <p className="record-meta">Đã đủ thành viên cho mọi vị trí theo cấu hình ({view.config.memberCount} người).</p>}
          </form>
        ) : forming && lockedReason("invite") ? <p className="record-meta">{lockedReason("invite")}</p> : null}

        {forming && view.readsProject && (canInvite || submitVisible) ? (
          <div className="form-section-inline">
            <div className="section-mini-heading">Điều kiện trình</div>
            {view.blockers.length ? <ul className="plain-list">{view.blockers.map((item) => <li key={item} className="record-meta">{item}</li>)}</ul> : <p className="record-meta">Đủ cơ cấu, mọi thành viên đã nhận lời.</p>}
          </div>
        ) : null}

        {submitVisible ? (
          <div className="admin-form compact-form">
            {can("submit") ? (
              <label className="field">
                <span>Ghi chú trình (tùy chọn)</span>
                <textarea rows={2} maxLength={2000} value={submitNote} onChange={(event) => setSubmitNote(event.target.value)} />
              </label>
            ) : null}
            <button className="button primary" type="button" disabled={busy || !!submitBlocked} title={submitBlocked || undefined}
              onClick={() => void run(async () => { await submitAcceptanceCouncil(projectId, submitNote.trim(), view.contextVersion); setSubmitNote(""); }, "Đã lập tờ trình thành lập hội đồng nghiệm thu.")}>
              <Send size={16} aria-hidden="true" />
              Lập tờ trình thành lập hội đồng
            </button>
            {submitBlocked ? <p className="record-meta">{submitBlocked}</p> : null}
          </div>
        ) : null}

        {approval?.lastNote && !view.establishedAt ? <p className="record-meta">Ghi chú gần nhất ({approval.stageLabel} · {approval.statusLabel}): {approval.lastNote}</p> : null}

        {signVisible ? (
          <>
            <div className="button-row">
              <button className="button primary" type="button" disabled={busy || !can("sign")} title={can("sign") ? undefined : lockedReason("sign")} onClick={() => setDialog({ type: "sign" })}>Ký thành lập</button>
              <button className="button danger" type="button" disabled={busy || !can("sign")} onClick={() => setDialog({ type: "reject" })}>Từ chối</button>
            </div>
            {!can("sign") ? <p className="record-meta">{lockedReason("sign")}</p> : null}
          </>
        ) : null}
      </SectionCard>

      {chairArea ? (
        <SectionCard title="Ghi kết quả nghiệm thu" subtitle="Chủ tịch hội đồng tải biên bản họp, nhập nhận xét và chọn kết quả.">
          {can("record-result") ? (
            <div className="admin-form compact-form">
              <div className="section-mini-heading">Biên bản họp hội đồng *</div>
              {minutesError ? <p className="form-error" role="alert">{minutesError}</p> : null}
              {minutes.length ? <ul className="plain-list">{minutes.map((file) => (
                <li key={file.id}>
                  <a href={projectFileUrl(file.id)}>{file.fileName}</a> <span className="record-meta">· {date(file.createdAt)}</span>
                  {file.canDelete ? <> <button className="button" type="button" disabled={busy} onClick={() => { if (window.confirm(`Xóa tệp ${file.fileName}?`)) void run(() => deleteEthicsFile(file.id, view.contextVersion), "Đã xóa biên bản."); }}>Xóa</button></> : null}
                </li>
              ))}</ul> : <p className="record-meta">Chưa có biên bản.</p>}
              <label className="field">
                <span>Tải biên bản họp hội đồng</span>
                <input type="file" accept=".pdf,.doc,.docx" disabled={busy || !view.dossierId} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadMinutes(file); }} />
              </label>
              <label className="field">
                <span>Nhận xét của hội đồng *</span>
                <textarea rows={4} maxLength={10000} value={comment} onChange={(event) => setComment(event.target.value)} />
              </label>
              <label className="field">
                <span>Kết quả *</span>
                <select value={outcome} onChange={(event) => setOutcome(event.target.value as "accepted" | "failed" | "")}>
                  <option value="">Chọn kết quả</option>
                  <option value="accepted">Đạt</option>
                  <option value="failed">Không đạt</option>
                </select>
              </label>
              <button className="button primary" type="button" disabled={busy || !!resultBlocked} title={resultBlocked || undefined} onClick={() => setDialog({ type: "result" })}>Ghi kết quả nghiệm thu</button>
              {resultBlocked ? <p className="record-meta">{resultBlocked}</p> : null}
            </div>
          ) : <p className="record-meta">{lockedReason("record-result")}</p>}
        </SectionCard>
      ) : null}

      {result ? (
        <SectionCard title="Kết quả nghiệm thu" action={<span className={`status-badge ${result.outcome === "accepted" ? "success" : "danger"}`}>{ACCEPTANCE_RESULT_LABELS[result.outcome] ?? result.outcome}</span>}>
          <p>Kết quả: <strong>{ACCEPTANCE_RESULT_LABELS[result.outcome] ?? result.outcome}</strong> · Ngày ghi: {date(result.recordedAt)}</p>
          <p>Nhận xét của hội đồng: {result.comment || "—"}</p>
          {result.minutesFileId ? <p><a href={projectFileUrl(result.minutesFileId)}>Tải biên bản họp hội đồng</a></p> : null}
        </SectionCard>
      ) : null}

      {approval && view.readsApproval ? <RoutingStatus subjectType="project" subjectId={projectId} refreshKey={`${approval.id}:${approval.stage}:${approval.status}`} onChanged={() => void refresh()} /> : null}

      {dialog?.type === "revoke" ? <ReasonDialog title={`Thu hồi lời mời của ${dialog.name}`} description="Lịch sử lời mời vẫn được giữ lại." reasonLabel="Lý do thu hồi" confirmLabel="Thu hồi" onConfirm={dialogAction} onClose={() => setDialog(null)} /> : null}
      {dialog?.type === "decline" ? <ReasonDialog title="Từ chối lời mời hội đồng nghiệm thu" description="Sau khi từ chối, bạn không còn xem được hội đồng này." reasonLabel="Lý do từ chối" confirmLabel="Từ chối lời mời" onConfirm={dialogAction} onClose={() => setDialog(null)} /> : null}
      {dialog?.type === "sign" ? <ReasonDialog title="Ký thành lập hội đồng nghiệm thu" description="Sau khi ký, hội đồng được thành lập và thành viên được đọc hồ sơ nghiệm thu. Không hoàn tác." confirmLabel="Ký thành lập" onConfirm={dialogAction} onClose={() => setDialog(null)} /> : null}
      {dialog?.type === "reject" ? <ReasonDialog title="Từ chối tờ trình hội đồng nghiệm thu" description="Danh sách thành viên được giữ; người lập thu hồi/mời thêm rồi trình lại." reasonLabel="Lý do từ chối" confirmLabel="Từ chối" onConfirm={dialogAction} onClose={() => setDialog(null)} /> : null}
      {dialog?.type === "result" ? <ReasonDialog title={`Ghi kết quả: ${ACCEPTANCE_RESULT_LABELS[outcome] ?? ""}`} description={`Đề tài sẽ chuyển sang "${outcome === "accepted" ? "Đã nghiệm thu" : "Không đạt"}" kèm nhận xét và biên bản mới nhất. Không hoàn tác.`} confirmLabel="Ghi kết quả" onConfirm={dialogAction} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}
