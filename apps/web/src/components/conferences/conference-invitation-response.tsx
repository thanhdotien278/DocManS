"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatIntakeDate } from "@/lib/intake-dates";
import { CONFERENCE_LEVEL_LABELS, INVITATION_KIND_LABELS, lookupPublicInvitation, respondPublicInvitation, type PublicInvitation } from "@/lib/conferences-api";

/**
 * Trang công khai mở từ đường link trong thư mời (không cần đăng nhập). Nhận lời: hệ thống tạo tài khoản (nếu
 * chưa có) và chuyển sang trang đặt mật khẩu; đã có tài khoản thì mời đăng nhập.
 */
export function ConferenceInvitationResponse() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<PublicInvitation | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<"declined" | "login" | null>(null);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token") ?? "";
    if (value) window.history.replaceState(null, "", window.location.pathname);
    setToken(value);
    if (!value) { setError("Đường link thư mời không hợp lệ."); return; }
    void lookupPublicInvitation(value).then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : "Đường link thư mời không hợp lệ hoặc đã hết hạn."));
  }, []);

  async function respond(decision: "accept" | "decline") {
    setBusy(true); setError("");
    try {
      const response = await respondPublicInvitation(token, decision, decision === "decline" ? reason.trim() || undefined : undefined);
      if (decision === "decline") { setResult("declined"); return; }
      if (response.activationPath) { window.location.replace(response.activationPath); return; }
      setResult("login");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không ghi nhận được trả lời."); }
    finally { setBusy(false); }
  }

  if (result === "declined") return <p role="status">Đã ghi nhận đồng chí từ chối lời mời. Cảm ơn đồng chí đã phản hồi.</p>;
  if (result === "login") return <p role="status">Đã ghi nhận đồng chí nhận lời. Email này đã có tài khoản: hãy <Link href="/login">đăng nhập</Link> và mở mục Hội nghị của tôi.</p>;
  if (error && !data) return <p role="alert">{error}</p>;
  if (!data) return <p>Đang tải thư mời…</p>;
  const { invitation, conference } = data;
  const name = [invitation.academicTitle, invitation.fullName].filter(Boolean).join(" ");
  const period = formatIntakeDate(conference.startsAt) === formatIntakeDate(conference.endsAt) ? formatIntakeDate(conference.startsAt) : `${formatIntakeDate(conference.startsAt)} – ${formatIntakeDate(conference.endsAt)}`;
  return <div className="form-section-inline">
    <p>Kính gửi {name},</p>
    <p>{conference.hostOrganizationUnit} trân trọng kính mời đồng chí {invitation.kind === "speaker" ? "tham dự và trình bày báo cáo tham luận tại" : "tới dự"} <strong>{conference.title}</strong> ({CONFERENCE_LEVEL_LABELS[conference.level]}).</p>
    <dl className="document-meta-list">
      <div><dt>Vai trò</dt><dd>{INVITATION_KIND_LABELS[invitation.kind]}</dd></div>
      <div><dt>Thời gian</dt><dd>{period}</dd></div>
      <div><dt>Địa điểm</dt><dd>{conference.location}</dd></div>
      {conference.abstractDeadline ? <div><dt>Hạn nộp tóm tắt</dt><dd>{formatIntakeDate(conference.abstractDeadline)}</dd></div> : null}
      {conference.fullPaperDeadline ? <div><dt>Hạn nộp toàn văn</dt><dd>{formatIntakeDate(conference.fullPaperDeadline)}</dd></div> : null}
      {conference.responseDeadline ? <div><dt>Đề nghị trả lời trước</dt><dd>{formatIntakeDate(conference.responseDeadline)}</dd></div> : null}
    </dl>
    {conference.description ? <p style={{ whiteSpace: "pre-wrap" }}>{conference.description}</p> : null}
    <p className="field-hint">Chương trình chi tiết sẽ được gửi sau khi các tiểu ban sắp xếp xong. Khi nhận lời, hệ thống tạo tài khoản {invitation.isInternal ? "nội bộ" : ""} để đồng chí {invitation.kind === "speaker" ? "nộp tóm tắt, toàn văn và " : ""}nhận chương trình, kỷ yếu.</p>
    {error ? <p role="alert">{error}</p> : null}
    {declining ? <div className="form-section-inline">
      <label className="field"><span>Lý do (tuỳ chọn)</span><textarea rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      <div className="button-row"><button className="button danger" type="button" disabled={busy} onClick={() => void respond("decline")}>Xác nhận từ chối</button><button className="button" type="button" onClick={() => setDeclining(false)}>Quay lại</button></div>
    </div> : <div className="button-row">
      <button className="button primary" type="button" disabled={busy} onClick={() => void respond("accept")}>{busy ? "Đang xử lý" : "Nhận lời"}</button>
      <button className="button" type="button" disabled={busy} onClick={() => setDeclining(true)}>Từ chối</button>
    </div>}
  </div>;
}
