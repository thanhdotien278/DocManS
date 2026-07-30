"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword, completePasswordReset } from "@/lib/auth-api";

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

export function ResetPasswordForm() {
  const router = useRouter(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  return <form className="admin-form" onSubmit={async (event) => {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    const token = String(form.get("token") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    if (!token) return setError("Cần mã đặt lại mật khẩu do quản trị viên cung cấp.");
    if (newPassword !== String(form.get("confirmPassword") ?? "")) return setError("Mật khẩu xác nhận không khớp.");
    setBusy(true); try { await completePasswordReset(token, newPassword); router.replace("/login"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể đặt lại mật khẩu."); } finally { formElement.reset(); setBusy(false); }
  }}>
    <label className="field"><span>Mã đặt lại mật khẩu</span><input name="token" autoComplete="one-time-code" /></label>
    <label className="field"><span>Mật khẩu mới</span><input name="newPassword" type="password" autoComplete="new-password" /></label>
    <label className="field"><span>Xác nhận mật khẩu mới</span><input name="confirmPassword" type="password" autoComplete="new-password" /></label>
    <p className="record-meta">Tối thiểu 12 ký tự, gồm chữ hoa, chữ thường và chữ số; không có khoảng trắng.</p>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <button className="button primary" disabled={busy} type="submit">{busy ? "Đang xử lý" : "Đặt lại mật khẩu"}</button>
  </form>;
}
