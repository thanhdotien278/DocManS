import Link from "next/link";
import { BrandMark } from "@/components/layout/app-shell";
import { NavLink } from "@/components/layout/nav-link";
import { navigationItems } from "@/lib/navigation";

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Điều hướng chính">
      <Link className="brand" href="/dashboard">
        <BrandMark />
        <div>
          <p className="brand-title">RTMS</p>
          <p className="brand-subtitle">Hệ thống quản lý đề tài - Học viện Quân y</p>
        </div>
      </Link>
      <nav className="side-nav">
        {navigationItems.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
        ))}
      </nav>
      <div className="sidebar-note">
        <strong>Ngữ cảnh demo</strong>
        <span>Vai trò lãnh đạo, dữ liệu mô phỏng, chưa kết nối backend nghiệp vụ.</span>
      </div>
    </aside>
  );
}
