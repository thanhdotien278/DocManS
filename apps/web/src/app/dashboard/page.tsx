"use client";

import { Suspense, useState } from "react";
import { useSession } from "@/components/auth/session-provider";
import { AdminDashboardPanel } from "@/components/admin/admin-dashboard-panel";
import { DashboardAnalytics } from "@/components/dashboard/dashboard-analytics";
import { WorkspaceHome } from "@/components/layout/workspace-home";
import { ManagementDashboardPanel } from "@/components/research-proposals/management-dashboard-panel";
import { StudentResearchPanel } from "@/components/student-research/student-research-panel";

type DashboardTab = "analytics" | "work";

export default function DashboardPage() {
  const { account } = useSession();
  const [activeTab, setActiveTab] = useState<DashboardTab>("analytics");

  if (!account) return null;
  if (account.systemRole === "SYSTEM_ADMIN") return <AdminDashboardPanel />;
  if (account.systemRole === "STUDENT_USER") return <StudentResearchPanel />;

  const renderWorkQueue = () => {
    if (account.systemRole === "RESEARCH_MANAGEMENT_STAFF") {
      return <ManagementDashboardPanel />;
    }
    if (
      account.systemRole === "RESEARCH_MANAGEMENT_HEAD" ||
      account.systemRole === "RESEARCH_BOARD_HEAD"
    ) {
      return <ManagementDashboardPanel variant="lead" />;
    }
    return <WorkspaceHome />;
  };

  return (
    <div className="dash-tabs-container">
      <div className="dash-tabs" role="tablist" aria-label="Chế độ xem Dashboard">
        <button
          id="dash-tab-analytics"
          type="button"
          role="tab"
          aria-selected={activeTab === "analytics"}
          aria-controls="dash-panel-analytics"
          className={`dash-tab ${activeTab === "analytics" ? "is-active" : ""}`}
          onClick={() => setActiveTab("analytics")}
        >
          Thống kê &amp; Phân tích
        </button>
        <button
          id="dash-tab-work"
          type="button"
          role="tab"
          aria-selected={activeTab === "work"}
          aria-controls="dash-panel-work"
          className={`dash-tab ${activeTab === "work" ? "is-active" : ""}`}
          onClick={() => setActiveTab("work")}
        >
          Việc cần xử lý
        </button>
      </div>

      <div
        id={activeTab === "analytics" ? "dash-panel-analytics" : "dash-panel-work"}
        role="tabpanel"
        aria-labelledby={activeTab === "analytics" ? "dash-tab-analytics" : "dash-tab-work"}
      >
        {activeTab === "analytics" ? (
          <Suspense fallback={<p className="record-meta" role="status">Đang tải thống kê...</p>}>
            <DashboardAnalytics />
          </Suspense>
        ) : (
          renderWorkQueue()
        )}
      </div>
    </div>
  );
}
