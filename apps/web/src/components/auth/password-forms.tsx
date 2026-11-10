"use client";

import Link from "next/link";
import { Check, Circle, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { changePassword, completeAccountActivation, completePasswordReset } from "@/lib/auth-api";

export function ChangePasswordForm() {
  const router = useRouter(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  return <form className="admin-form" onSubmit={async (event) => {
    event.preventDefault(); setError(""); const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? ""); const newPassword = String(form.get("newPassword") ?? "");
    if (newPassword !== String(form.get("confirmPassword") ?? "")) return setError("Mật khẩu xác nhận không khớp.");
    setBusy(true); try { await changePassword(currentPassword, newPassword); router.replace("/login"); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể đổi mật khẩu."); } finally { setBusy(false); }
  }}>
    <label className="field"><span>Mật khẩu hiện tại</span><input name="currentPassword" type="password" autoComplete="current-password" /></label>
    <label className="field"><span>Mật khẩu mới</span><input name="newPassword" type="password" autoComplete="new-password" /></label>
    <label className="field"><span>Xác nhận mật khẩu mới</span><input name="confirmPassword" type="password" autoComplete="new-password" /></label>
    <p className="record-meta">Tối thiểu 12 ký tự, gồm chữ hoa, chữ thường và chữ số; không có khoảng trắng.</p>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <button className="button primary" disabled={busy} type="submit">{busy ? "Đang xử lý" : "Đổi mật khẩu"}</button>
  </form>;
}

const PASSWORD_RULES: { label: string; test: (value: string) => boolean }[] = [
  { label: "Tối thiểu 12 ký tự", test: (value) => value.length >= 12 },
  { label: "Có chữ hoa", test: (value) => /[A-Z]/.test(value) },
  { label: "Có chữ thường", test: (value) => /[a-z]/.test(value) },
  { label: "Có chữ số", test: (value) => /\d/.test(value) },
  { label: "Không có khoảng trắng", test: (value) => value.length > 0 && !/\s/.test(value) }
];

export function ResetPasswordForm() {
  const router = useRouter(); const [activationToken, setActivationToken] = useState(""); const [ready, setReady] = useState(false); const [error, setError] = useState(""); const [confirmError, setConfirmError] = useState(""); const [busy, setBusy] = useState(false); const [pendingApproval, setPendingApproval] = useState(false); const [newPassword, setNewPassword] = useState("");
  useEffect(() => { const params = new URLSearchParams(window.location.search); setActivationToken(params.get("mode") === "activation" ? params.get("token") ?? "" : ""); setReady(true); }, []);
  const isActivation = Boolean(activationToken);
  const footer = <Link href="/login">Về trang đăng nhập</Link>;
  if (!ready) return <AuthShell kicker="Khôi phục truy cập" title="Thiết lập mật khẩu" description="Đang kiểm tra liên kết..."><p className="record-meta" role="status">Đang tải...</p></AuthShell>;
  if (pendingApproval) return (
    <AuthShell kicker="Kích hoạt tài khoản" title="Đã xác minh email" description="Mật khẩu của bạn đã được thiết lập." footer={footer}>
      <div role="status">
        <p className="auth-notice success"><ShieldCheck size={18} aria-hidden="true" /><span>Tài khoản đang chờ cán bộ quản lý khoa học duyệt. Bạn sẽ nhận email khi được duyệt và có thể đăng nhập sau đó.</span></p>
        <ol className="auth-steps" aria-label="Tiến trình kích hoạt">
          <li className="done"><span className="auth-step-index" aria-hidden="true"><Check size={14} /></span>Xác minh email <span className="record-meta">(hoàn thành)</span></li>
          <li className="done"><span className="auth-step-index" aria-hidden="true"><Check size={14} /></span>Đặt mật khẩu <span className="record-meta">(hoàn thành)</span></li>
          <li className="current"><span className="auth-step-index" aria-hidden="true">3</span>Chờ duyệt <span className="record-meta">(bước hiện tại)</span></li>
        </ol>
      </div>
    </AuthShell>
  );
  return (
    <AuthShell kicker={isActivation ? "Kích hoạt tài khoản" : "Khôi phục truy cập"} title="Thiết lập mật khẩu" description={isActivation ? "Liên kết kích hoạt hợp lệ. Đặt mật khẩu để hoàn tất xác minh email." : "Nhập mã đặt lại do quản trị viên cung cấp và mật khẩu mới."} footer={footer}>
      <form className="auth-form" noValidate onSubmit={async (event) => {
        event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); setError("");
        const token = activationToken || String(form.get("token") ?? "").trim();
        const password = String(form.get("newPassword") ?? "");
        const confirmPassword = String(form.get("confirmPassword") ?? "");
        if (!token) return setError("Cần mã đặt lại mật khẩu do quản trị viên cung cấp.");
        if (password !== confirmPassword) { setConfirmError("Mật khẩu xác nhận không khớp."); return; }
        setConfirmError(""); setBusy(true); try {
          if (activationToken) {
            // Story 13.11: tài khoản tự đăng ký còn chờ duyệt nên ở lại trang và báo trạng thái.
            if ((await completeAccountActivation(token, password, confirmPassword)).status === "pending_approval") return setPendingApproval(true);
          } else await completePasswordReset(token, password);
          router.replace("/login");
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể thiết lập mật khẩu."); formElement.reset(); setNewPassword(""); } finally { setBusy(false); }
      }}>
        {isActivation ? null : <div className="field">
          <label htmlFor="reset-token">Mã đặt lại mật khẩu</label>
          <div className="field-input with-icon"><KeyRound size={18} aria-hidden="true" /><input id="reset-token" name="token" autoComplete="one-time-code" /></div>
        </div>}
        <div className="field">
          <label htmlFor="reset-new-password">Mật khẩu mới</label>
          <div className="field-input with-icon"><LockKeyhole size={18} aria-hidden="true" /><input id="reset-new-password" name="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} aria-describedby="reset-password-rules" /></div>
          <ul className="password-rules" id="reset-password-rules" aria-label="Yêu cầu mật khẩu">
            {PASSWORD_RULES.map((rule) => { const ok = rule.test(newPassword); return <li className={ok ? "met" : undefined} key={rule.label}>{ok ? <Check size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}{rule.label}<span className="sr-only">{ok ? " — đạt" : " — chưa đạt"}</span></li>; })}
          </ul>
        </div>
        <div className="field">
          <label htmlFor="reset-confirm-password">Xác nhận mật khẩu mới</label>
          <div className="field-input with-icon"><LockKeyhole size={18} aria-hidden="true" /><input id="reset-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" aria-invalid={Boolean(confirmError)} aria-describedby={confirmError ? "reset-confirm-error" : undefined} onChange={() => setConfirmError("")} /></div>
          {confirmError ? <span className="field-error" id="reset-confirm-error">{confirmError}</span> : null}
        </div>
        {error ? <p className="auth-notice danger" role="alert">{error}</p> : null}
        <button className="button primary auth-submit" disabled={busy} type="submit">{busy ? "Đang xử lý..." : isActivation ? "Thiết lập mật khẩu" : "Đặt lại mật khẩu"}</button>
      </form>
    </AuthShell>
  );
}
