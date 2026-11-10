"use client";

import Link from "next/link";
import { AtSign, Building2, Landmark, Mail, MailCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { isSelfRegistrationEnabled, registerAccount, type AccountType } from "@/lib/registration-api";

type FieldName = "fullName" | "email" | "username" | "accountType";
type FieldErrors = Partial<Record<FieldName, string>>;

const ACCOUNT_TYPES: { value: AccountType; label: string; hint: string; Icon: typeof Building2 }[] = [
  { value: "INTERNAL", label: "Trong học viện", hint: "Cán bộ, giảng viên, học viên của Học viện Quân y", Icon: Building2 },
  { value: "EXTERNAL", label: "Ngoài học viện", hint: "Nhà nghiên cứu thuộc đơn vị, cơ sở khác", Icon: Landmark }
];

const STEPS = ["Xác minh email", "Đặt mật khẩu", "Chờ duyệt"];

const LOGIN_FOOTER = <>Đã có tài khoản? <Link href="/login">Đăng nhập</Link></>;

export function RegisterForm() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { void isSelfRegistrationEnabled().then(setEnabled); }, []);

  const head = { kicker: "Đăng ký tài khoản", title: "Đăng ký tài khoản nhà nghiên cứu" };

  if (enabled === null) return <AuthShell {...head} description="Đang kiểm tra trạng thái tiếp nhận đăng ký..."><p className="record-meta" role="status">Đang tải...</p></AuthShell>;
  if (!enabled) return (
    <AuthShell {...head} description="Chức năng tự đăng ký hiện chưa được mở." footer={<Link href="/login">Quay lại đăng nhập</Link>}>
      <p className="auth-notice danger" role="alert">Hệ thống hiện không nhận đăng ký tài khoản. Vui lòng liên hệ cán bộ quản lý khoa học để được cấp tài khoản.</p>
    </AuthShell>
  );
  if (done) return (
    <AuthShell kicker="Đã gửi đăng ký" title="Kiểm tra hộp thư của bạn" description={done}>
      <div role="status">
        <p className="auth-notice success"><MailCheck size={18} aria-hidden="true" /><span>Nếu không thấy email, hãy kiểm tra thư mục thư rác (spam).</span></p>
        <ol className="auth-steps" aria-label="Các bước tiếp theo">
          {STEPS.map((step, index) => <li key={step} className={index === 0 ? "current" : undefined}><span className="auth-step-index" aria-hidden="true">{index + 1}</span>{step}{index === 0 ? <span className="record-meta"> (bước hiện tại)</span> : null}</li>)}
        </ol>
        <p className="record-meta">Sau khi xác minh email và đặt mật khẩu, tài khoản cần cán bộ quản lý khoa học duyệt trước khi đăng nhập.</p>
        <Link className="button primary auth-submit" href="/login">Về trang đăng nhập</Link>
      </div>
    </AuthShell>
  );

  const clearField = (name: FieldName) => setFieldErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));

  return (
    <AuthShell {...head} description="Hệ thống gửi liên kết xác minh tới email; tài khoản được dùng sau khi cán bộ quản lý khoa học duyệt." footer={LOGIN_FOOTER}>
      <form className="auth-form" noValidate onSubmit={async (event) => {
        event.preventDefault(); setError("");
        const form = new FormData(event.currentTarget);
        const input = { email: String(form.get("email") ?? "").trim(), username: String(form.get("username") ?? "").trim(), fullName: String(form.get("fullName") ?? "").trim(), accountType: String(form.get("accountType") ?? "") as AccountType };
        const missing: FieldErrors = {};
        if (!input.fullName) missing.fullName = "Nhập họ và tên.";
        if (!input.email) missing.email = "Nhập địa chỉ email.";
        if (!input.username) missing.username = "Nhập tên đăng nhập.";
        if (!input.accountType) missing.accountType = "Chọn đối tượng đăng ký.";
        setFieldErrors(missing);
        if (Object.keys(missing).length) return;
        setBusy(true);
        try { setDone((await registerAccount(input)).message); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể đăng ký."); } finally { setBusy(false); }
      }}>
        <p className="auth-required-note"><span aria-hidden="true" className="required-mark">*</span> Trường bắt buộc</p>

        <div className="field">
          <label htmlFor="register-fullName">Họ và tên <span className="required-mark" aria-hidden="true">*</span></label>
          <div className="field-input with-icon"><UserRound size={18} aria-hidden="true" /><input id="register-fullName" name="fullName" autoComplete="name" maxLength={160} required aria-invalid={Boolean(fieldErrors.fullName)} aria-describedby={fieldErrors.fullName ? "register-fullName-error" : undefined} onChange={() => clearField("fullName")} /></div>
          {fieldErrors.fullName ? <span className="field-error" id="register-fullName-error">{fieldErrors.fullName}</span> : null}
        </div>

        <div className="field">
          <label htmlFor="register-email">Email <span className="required-mark" aria-hidden="true">*</span></label>
          <div className="field-input with-icon"><Mail size={18} aria-hidden="true" /><input id="register-email" name="email" type="email" autoComplete="email" maxLength={254} required aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "register-email-error" : "register-email-hint"} onChange={() => clearField("email")} /></div>
          {fieldErrors.email ? <span className="field-error" id="register-email-error">{fieldErrors.email}</span> : <span className="field-hint" id="register-email-hint">Liên kết xác minh sẽ được gửi tới địa chỉ này.</span>}
        </div>

        <div className="field">
          <label htmlFor="register-username">Tên đăng nhập <span className="required-mark" aria-hidden="true">*</span></label>
          <div className="field-input with-icon"><AtSign size={18} aria-hidden="true" /><input id="register-username" name="username" autoComplete="username" maxLength={32} required aria-invalid={Boolean(fieldErrors.username)} aria-describedby={fieldErrors.username ? "register-username-error" : "register-username-hint"} onChange={() => clearField("username")} /></div>
          {fieldErrors.username ? <span className="field-error" id="register-username-error">{fieldErrors.username}</span> : <span className="field-hint" id="register-username-hint">3–32 ký tự: chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang. Có thể đăng nhập bằng tên đăng nhập hoặc email.</span>}
        </div>

        <fieldset className="choice-group" aria-describedby={fieldErrors.accountType ? "register-accountType-error" : undefined}>
          <legend>Đối tượng <span className="required-mark" aria-hidden="true">*</span></legend>
          <div className="choice-grid">
            {ACCOUNT_TYPES.map(({ value, label, hint, Icon }) => (
              <label className="choice-card" key={value}>
                <input type="radio" name="accountType" value={value} required onChange={() => clearField("accountType")} />
                <Icon size={20} aria-hidden="true" />
                <span><strong>{label}</strong><small>{hint}</small></span>
              </label>
            ))}
          </div>
          {fieldErrors.accountType ? <span className="field-error" id="register-accountType-error">{fieldErrors.accountType}</span> : null}
        </fieldset>

        {error ? <p className="auth-notice danger" role="alert">{error}</p> : null}
        <button className="button primary auth-submit" disabled={busy} type="submit">{busy ? "Đang gửi..." : "Đăng ký tài khoản"}</button>
      </form>
    </AuthShell>
  );
}
