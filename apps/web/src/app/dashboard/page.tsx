"use client";

import { useSession } from "@/components/auth/session-provider";
import { AdminDashboardPanel } from "@/components/admin/admin-dashboard-panel";
import { WorkspaceHome } from "@/components/layout/workspace-home";
import { StudentResearchPanel } from "@/components/student-research/student-research-panel";
import { ManagementDashboardPanel } from "@/components/research-proposals/management-dashboard-panel";

export default function DashboardPage() {
  const { account } = useSession();
  if (!account) return null;
  if (account.systemRole === "SYSTEM_ADMIN") return <AdminDashboardPanel />;
  if (account.systemRole === "RESEARCH_MANAGEMENT_STAFF") return <ManagementDashboardPanel />;
  if (account.systemRole === "RESEARCH_MANAGEMENT_HEAD" || account.systemRole === "RESEARCH_BOARD_HEAD") return <ManagementDashboardPanel variant="lead" />;
  // Sinh viên chỉ có một việc: đề tài NCKH của nhóm mình.
  if (account.systemRole === "STUDENT_USER") return <StudentResearchPanel />;
  // Các vai trò còn lại: hàng đợi việc lấy từ chính các API mà danh sách nghiệp vụ dùng, nên số liệu luôn khớp khi mở ra.
  return <WorkspaceHome />;
}
