"use client";

import Image from "next/image";
import { Bell, ChevronDown, LogOut, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/auth/session-provider";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { account, logout } = useSession();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (!account) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-pane">
        <header className="topbar">
          <div className="topbar-brand" aria-label="Hệ thống quản lý nghiên cứu khoa học">
            <BrandMark />
            <div>
              <strong>Hệ thống quản lý NCKH</strong>
              <span>Học viện Quân y</span>
            </div>
          </div>
          <MobileNav />
          <div className="quick-search">
            <Search size={18} aria-hidden="true" />
            <input aria-label="Tìm kiếm nhanh" placeholder="Tìm mã hồ sơ, đề tài, chủ nhiệm..." />
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Mở thông báo">
              <Bell size={18} aria-hidden="true" />
            </button>
            <details className="user-menu">
              <summary className="user-chip" aria-label="Người dùng hiện tại">
                <span className="avatar">{account.initials}</span>
                <div>
                  <span className="user-name">{account.name}</span>
                  <span className="user-role">
                    {account.roleLabel} - {account.unit}
                  </span>
                </div>
                <ChevronDown className="user-caret" size={16} aria-hidden="true" />
              </summary>
              <div className="user-menu-panel">
                <p className="user-menu-heading">{account.name}</p>
                <p className="user-menu-meta">
                  {account.roleLabel} - {account.unit}
                </p>
                <button className="button" onClick={logout} type="button">
                  <LogOut size={16} aria-hidden="true" />
                  Đăng xuất
                </button>
              </div>
            </details>
          </div>
        </header>
        <main className="content" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export function BrandMark() {
  return (
    <div className="brand-mark">
      <Image src="/logo.png" alt="Học viện Quân y" width={42} height={43} priority />
    </div>
  );
}
