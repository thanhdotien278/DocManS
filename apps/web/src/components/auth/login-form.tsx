"use client";

import { ArrowRight, LockKeyhole, UserRound } from "lucide-react";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithPassword } from "@/lib/auth-api";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    setIsSubmitting(true);
    const result = await loginWithPassword(username, password);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    startTransition(() => {
      router.replace("/dashboard");
      router.refresh();
    });
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="username">Tên đăng nhập</label>
        <div className="field-input with-icon">
          <UserRound size={18} aria-hidden="true" />
          <input
            autoComplete="username"
            id="username"
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Nhập tên đăng nhập"
            type="text"
            value={username}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="password">Mật khẩu</label>
        <div className="field-input with-icon">
          <LockKeyhole size={18} aria-hidden="true" />
          <input
            autoComplete="current-password"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nhập mật khẩu"
            type="password"
            value={password}
          />
        </div>
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <button className="button primary login-submit" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập hệ thống"}
        <ArrowRight size={17} aria-hidden="true" />
      </button>
    </form>
  );
}
