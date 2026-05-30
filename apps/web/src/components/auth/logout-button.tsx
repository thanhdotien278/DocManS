"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/components/auth/session-provider";

export function LogoutButton() {
  const { logout } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setError("");
    setIsSubmitting(true);
    const didLogout = await logout();
    setIsSubmitting(false);

    if (!didLogout) {
      setError("Không thể đăng xuất. Vui lòng thử lại.");
    }
  }

  return (
    <>
      <button className="button" disabled={isSubmitting} onClick={handleLogout} type="button">
        <LogOut size={16} aria-hidden="true" />
        {isSubmitting ? "Đang đăng xuất..." : "Đăng xuất"}
      </button>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
