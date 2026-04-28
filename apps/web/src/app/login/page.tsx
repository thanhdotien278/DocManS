"use client";

import Image from "next/image";
import { LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { accountProfiles, getAccountById } from "@/lib/accounts";
import { useSession } from "@/components/auth/session-provider";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useSession();
  const [selectedAccountId, setSelectedAccountId] = useState(accountProfiles[0]?.id ?? "");
  const [username, setUsername] = useState(accountProfiles[0]?.username ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedAccount = getAccountById(selectedAccountId);

  useEffect(() => {
    if (selectedAccount) {
      setUsername(selectedAccount.username);
    }
  }, [selectedAccount]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAccount) {
      setError("Vui lòng chọn hồ sơ truy cập.");
      return;
    }

    if (!username.trim()) {
      setError("Vui lòng nhập tên đăng nhập.");
      return;
    }

    if (username.trim() !== selectedAccount.username) {
      setError("Tên đăng nhập chưa phù hợp với hồ sơ truy cập đã chọn.");
      return;
    }

    if (!password.trim()) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    setError("");
    setSubmitting(true);
    login(selectedAccount.id);

    startTransition(() => {
      router.replace("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="login-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand">
          <div className="login-brand-mark">
            <Image src="/logo.png" alt="Học viện Quân y" width={72} height={74} priority />
          </div>
          <div>
            <p className="login-kicker">Cổng thông tin nội bộ</p>
            <h1 className="login-title" id="login-title">
              Hệ thống quản lý NCKH
            </h1>
            <p className="login-subtitle">Học viện Quân y</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="access-profile">Hồ sơ truy cập</label>
            <div className="field-input with-icon">
              <ShieldCheck size={18} aria-hidden="true" />
              <select
                id="access-profile"
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
              >
                {accountProfiles.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} - {account.roleLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="username">Tên đăng nhập</label>
            <div className="field-input with-icon">
              <UserRound size={18} aria-hidden="true" />
              <input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Nhập tên đăng nhập"
                type="text"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">Mật khẩu</label>
            <div className="field-input with-icon">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Nhập mật khẩu"
                type="password"
              />
            </div>
          </div>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="button primary login-submit" disabled={submitting} type="submit">
            {submitting ? "Đang đăng nhập..." : "Đăng nhập hệ thống"}
          </button>
        </form>
      </section>

      <aside className="login-context">
        <section className="login-summary-card" aria-live="polite">
          <p className="login-summary-label">Thông tin truy cập</p>
          <h2>{selectedAccount?.name}</h2>
          <dl className="summary-grid">
            <div>
              <dt>Vai trò</dt>
              <dd>{selectedAccount?.roleLabel}</dd>
            </div>
            <div>
              <dt>Đơn vị</dt>
              <dd>{selectedAccount?.unit}</dd>
            </div>
            <div>
              <dt>Tên đăng nhập</dt>
              <dd>{selectedAccount?.username}</dd>
            </div>
          </dl>
        </section>

        <section className="login-note-card">
          <h2>Quy định truy cập</h2>
          <ul className="login-note-list">
            <li>Sử dụng tài khoản được cấp đúng vai trò và đơn vị công tác.</li>
            <li>Thông tin điều hướng, dashboard và thông báo được điều chỉnh theo phạm vi truy cập hiện hành.</li>
            <li>Mỗi phiên đăng nhập cần kết thúc bằng chức năng đăng xuất sau khi hoàn thành công việc.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
