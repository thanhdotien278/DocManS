"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/components/auth/session-provider";

export function LogoutButton() {
  const { logout } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);
    await logout();
  }

  return (
    <button className="button" disabled={isSubmitting} onClick={handleLogout} type="button">
      <LogOut size={16} aria-hidden="true" />
      {isSubmitting ? "Đang đăng xuất..." : "Đăng xuất"}
    </button>
  );
}
