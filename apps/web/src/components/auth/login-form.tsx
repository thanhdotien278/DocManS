"use client";

import Link from "next/link";
import { ArrowRight, KeyRound, LockKeyhole, UserRound } from "lucide-react";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/auth/password-input";
import { useSession } from "@/components/auth/session-provider";
import { loginWithPassword, resendLoginOtp, verifyLoginOtp, type LoginOtpChallenge } from "@/lib/auth-api";
import { isSelfRegistrationEnabled } from "@/lib/registration-api";

export function LoginForm() {
  const router = useRouter();
  const { refreshCurrentUser } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canRegister, setCanRegister] = useState(false);
  // Bước 2 (xác thực hai lớp): mã gửi qua thư công vụ sau khi mật khẩu đúng.
  const [otp, setOtp] = useState<LoginOtpChallenge | null>(null);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => { void isSelfRegistrationEnabled().then(setCanRegister); }, []);

  async function enterSystem() {
    const refreshedAccount = await refreshCurrentUser();
    if (!refreshedAccount) {
      setError("Không thể xác nhận phiên đăng nhập. Vui lòng thử lại.");
      return;
    }

    startTransition(() => {
      // Science-management staff keep their dashboard landing even after their own CV profile is linked (Story 13.10).
      const managesScience = refreshedAccount.systemRole === "RESEARCH_MANAGEMENT_HEAD" || refreshedAccount.systemRole === "RESEARCH_MANAGEMENT_STAFF";
      router.replace(refreshedAccount.mustChangePassword ? "/change-password" : refreshedAccount.researcherProfileId && !managesScience ? "/my-profile" : "/dashboard");
      router.refresh();
    });
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otp) return;
    setError("");
    setNotice("");
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Mã xác thực gồm 6 chữ số.");
      return;
    }
    setIsSubmitting(true);
    const result = await verifyLoginOtp(otp.challengeId, code.trim());
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      if (result.expired) {
        setOtp(null);
        setCode("");
        setPassword("");
      }
      return;
    }
    await enterSystem();
  }

  async function handleResend() {
    if (!otp) return;
    setError("");
    setNotice("");
    setIsSubmitting(true);
    const result = await resendLoginOtp(otp.challengeId);
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOtp(result.otp);
    setCode("");
    setNotice(`Đã gửi mã mới tới ${result.otp.emailHint}.`);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Vui lòng nhập đầy đủ tên đăng nhập/email và mật khẩu.");
      return;
    }

    setIsSubmitting(true);
    const result = await loginWithPassword(username, password);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    if ("otp" in result) {
      setOtp(result.otp);
      setCode("");
      setNotice("");
      return;
    }

    await enterSystem();
  }

  if (otp) {
    return (
      <form className="login-form" onSubmit={handleVerify}>
        <p className="section-copy">
          Mã xác thực 6 chữ số đã được gửi tới thư công vụ <strong>{otp.emailHint}</strong>. Mã có hiệu lực trong 10 phút.
        </p>
        <div className="field">
          <label htmlFor="login-otp">Mã xác thực</label>
          <div className="field-input with-icon">
            <KeyRound size={18} aria-hidden="true" />
            <input
              autoComplete="one-time-code"
              autoFocus
              id="login-otp"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              pattern="\d{6}"
              placeholder="Nhập 6 chữ số"
              value={code}
            />
          </div>
        </div>

        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {notice ? <p className="record-meta" role="status">{notice}</p> : null}

        <button className="button primary login-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Đang xác thực..." : "Xác thực và đăng nhập"}
          <ArrowRight size={17} aria-hidden="true" />
        </button>
        <p className="record-meta">
          <button className="button" disabled={isSubmitting} type="button" onClick={() => void handleResend()}>Gửi lại mã</button>{" "}
          <button
            className="button"
            disabled={isSubmitting}
            type="button"
            onClick={() => { setOtp(null); setCode(""); setPassword(""); setError(""); setNotice(""); }}
          >
            Đăng nhập lại
          </button>
        </p>
      </form>
    );
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="username">Tên đăng nhập hoặc email</label>
        <div className="field-input with-icon">
          <UserRound size={18} aria-hidden="true" />
          <input
            autoComplete="username"
            id="username"
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Nhập tên đăng nhập hoặc email"
            type="text"
            value={username}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="password">Mật khẩu</label>
        <div className="field-input with-icon">
          <LockKeyhole size={18} aria-hidden="true" />
          <PasswordInput
            autoComplete="current-password"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nhập mật khẩu"
            value={password}
          />
        </div>
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error} <Link href="/forgot-password">Quên mật khẩu?</Link>
        </p>
      ) : null}

      <button className="button primary login-submit" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập hệ thống"}
        <ArrowRight size={17} aria-hidden="true" />
      </button>
      <p className="record-meta"><Link href="/forgot-password">Quên mật khẩu?</Link></p>
      {canRegister ? <p className="record-meta">Chưa có tài khoản? <Link href="/register">Đăng ký tài khoản</Link></p> : null}
    </form>
  );
}
