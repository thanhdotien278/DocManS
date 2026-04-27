import {
  BarChart3,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Settings,
  Users
} from "lucide-react";

export const navigationItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/proposals", label: "Quản lý đề tài", icon: FileText },
  { href: "/tasks", label: "Giao việc", icon: ClipboardCheck },
  { href: "/reports", label: "Báo cáo", icon: BarChart3 },
  { href: "/settings", label: "Cấu hình", icon: Settings },
  { href: "/users", label: "Người dùng", icon: Users }
] as const;
