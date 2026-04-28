"use client";

import Link from "next/link";
import { useSession } from "@/components/auth/session-provider";
import { BrandMark } from "@/components/layout/app-shell";
import { NavLink } from "@/components/layout/nav-link";
import { getNavigationItems } from "@/lib/navigation";

export function Sidebar() {
  const { account } = useSession();

  if (!account) {
    return null;
  }

  const navigationItems = getNavigationItems(account.role);

  return (
    <aside className="sidebar" aria-label="Điều hướng chính">
      <Link className="brand" href="/dashboard">
        <BrandMark />
        <div>
          <p className="brand-title">Hệ thống quản lý NCKH</p>
          <p className="brand-subtitle">Học viện Quân y</p>
        </div>
      </Link>
      <nav className="side-nav">
        {navigationItems.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
        ))}
      </nav>
      <div className="sidebar-note">
        <strong>Phạm vi truy cập hiện hành</strong>
        <span>
          {account.roleLabel} - {account.unit}
        </span>
      </div>
    </aside>
  );
}
