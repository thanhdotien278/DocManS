"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { useSession } from "@/components/auth/session-provider";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavLink } from "@/components/layout/nav-link";
import { getNavigationItems } from "@/lib/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { account, isLoading } = useSession();

  if (pathname === "/login" || pathname === "/password-reset") {
    return <>{children}</>;
  }

  if (isLoading || !account) {
    return (
      <main className="content auth-loading" id="main-content" aria-live="polite">
        Đang kiểm tra phiên đăng nhập...
      </main>
    );
  }

  if (account.mustChangePassword) return <main className="content" id="main-content" tabIndex={-1}><p role="status">Bạn phải đổi mật khẩu tạm thời trước khi tiếp tục.</p>{pathname === "/change-password" ? children : <a href="/change-password">Đổi mật khẩu</a>}<LogoutButton /></main>;

  const navigationItems = getNavigationItems(account.systemRole);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Đến nội dung chính</a>
      <header className="topbar">
        <div className="topbar-row topbar-row-main">
          <Link className="topbar-brand" href="/dashboard" aria-label="Hệ thống quản lý nghiên cứu khoa học">
            <BrandMark />
            <div>
              <strong>HỆ THỐNG QUẢN LÝ NGHIÊN CỨU KHOA HỌC, CÔNG NGHỆ VÀ ĐỔI MỚI SÁNG TẠO</strong>
              <span>Học viện Quân y</span>
            </div>
          </Link>
          <div className="topbar-actions">
            <details className="user-menu">
              <summary className="user-chip" aria-label="Người dùng hiện tại">
                <span className="avatar">{account.initials}</span>
                <div>
                  <span className="user-name">{account.name}</span>
                  <span className="user-role">
                    {account.systemRoleLabel} - {account.unit}
                  </span>
                </div>
                <ChevronDown className="user-caret" size={16} aria-hidden="true" />
              </summary>
              <div className="user-menu-panel">
                <p className="user-menu-heading">{account.name}</p>
                <p className="user-menu-meta">
                  {account.systemRoleLabel} - {account.unit}
                </p>
                {account.researcherProfileId ? <a className="button" href="/my-profile">Hồ sơ của tôi</a> : null}
                <a className="button" href="/change-password">Đổi mật khẩu</a>
                <LogoutButton />
              </div>
            </details>
            <MobileNav />
          </div>
        </div>
        <nav className="topbar-row topbar-nav" aria-label="Điều hướng chính">
          {navigationItems.map((item) => <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />)}
        </nav>
      </header>
      <main className="content" id="main-content" tabIndex={-1}>{children}</main>
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
