"use client";

import Image from "next/image";
import { Bell, Menu, Search } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-pane">
        <header className="topbar">
          <div className="topbar-brand" aria-label="Research Topic Management System">
            <BrandMark />
            <div>
              <strong>RTMS</strong>
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
            <button className="icon-button" type="button" aria-label="Mở menu nhanh">
              <Menu size={18} aria-hidden="true" />
            </button>
            <div className="user-chip" aria-label="Người dùng hiện tại">
              <span className="avatar">A</span>
              <div>
                <span className="user-name">Đại tá An</span>
                <span className="user-role">Lãnh đạo - demo</span>
              </div>
            </div>
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
      <Image
        src="/logo.png"
        alt="Học viện Quân y"
        width={42}
        height={43}
        priority
      />
    </div>
  );
}
