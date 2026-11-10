"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isSelfRegistrationEnabled, registerAccount, type AccountType } from "@/lib/registration-api";

export function RegisterForm() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { void isSelfRegistrationEnabled().then(setEnabled); }, []);

  if (enabled === null) return <p className="record-meta">Đang tải...</p>;
  if (!enabled) return <p className="form-error" role="alert">Hệ thống hiện không nhận đăng ký tài khoản. <Link href="/login">Quay lại đăng nhập</Link></p>;
  if (done) return <div role="status"><p>{done}</p><p className="record-meta">Sau khi xác minh email và đặt mật khẩu, tài khoản cần cán bộ quản lý khoa học duyệt trước khi đăng nhập.</p><Link className="button primary" href="/login">Về trang đăng nhập</Link></div>;

  return <form className="admin-form" onSubmit={async (event) => {
    event.preventDefault(); setError("");
    const form = new FormData(event.currentTarget);
    const input = { email: String(form.get("email") ?? "").trim(), username: String(form.get("username") ?? "").trim(), fullName: String(form.get("fullName") ?? "").trim(), accountType: String(form.get("accountType") ?? "") as AccountType };
    if (!input.email || !input.username || !input.fullName || !input.accountType) return setError("Vui lòng nhập đầy đủ thông tin.");
    setBusy(true);
    try { setDone((await registerAccount(input)).message); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể đăng ký."); } finally { setBusy(false); }
  }}>
    <label className="field"><span>Họ và tên</span><input name="fullName" autoComplete="name" maxLength={160} /></label>
    <label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" maxLength={254} /></label>
    <label className="field"><span>Tên đăng nhập</span><input name="username" autoComplete="username" maxLength={32} /></label>
    <p className="record-meta">3–32 ký tự: chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang. Có thể đăng nhập bằng tên đăng nhập hoặc email.</p>
    <fieldset className="field">
      <legend>Đối tượng</legend>
      <label><input type="radio" name="accountType" value="INTERNAL" /> Trong học viện</label>
      <label><input type="radio" name="accountType" value="EXTERNAL" /> Ngoài học viện</label>
    </fieldset>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <button className="button primary" disabled={busy} type="submit">{busy ? "Đang gửi" : "Đăng ký"}</button>
    <p className="record-meta">Đã có tài khoản? <Link href="/login">Đăng nhập</Link></p>
  </form>;
}
