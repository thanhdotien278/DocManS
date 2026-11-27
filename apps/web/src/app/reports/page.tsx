"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Coins, Presentation, Timer } from "lucide-react";
import { useSession } from "@/components/auth/session-provider";
import { ConferenceReportPanel } from "@/components/conferences/conference-stats";
import { BudgetReportPanel } from "@/components/reports/budget-report-panel";
import { KhqsReportPanel } from "@/components/reports/khqs-report-panel";
import { ProgressReportPanel } from "@/components/reports/progress-report-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

type ReportTab = "budget" | "progress" | "khqs" | "conferences";

const KHQS_REPORT_ROLES = [
  "LEADERSHIP_APPROVAL_AUTHORITY",
  "SCIENCE_DEPUTY_DIRECTOR",
  "RESEARCH_MANAGEMENT_HEAD",
  "RESEARCH_BOARD_HEAD"
];

const ALLOWED_REPORT_ROLES = [
  ...KHQS_REPORT_ROLES,
  "RESEARCH_MANAGEMENT_STAFF",
  "RESEARCH_OVERSIGHT_AUTHORITY",
  "RESEARCH_MANAGEMENT_DEPUTY_HEAD"
];

const TAB_TITLES: Record<ReportTab, { crumb: string; title: string; description: string }> = {
  budget: {
    crumb: "Tình hình kinh phí đề tài",
    title: "Báo cáo tình hình kinh phí đề tài",
    description: "Tổng hợp, phân tích và xuất Excel tình hình phân bổ, phê duyệt và thực hiện kinh phí các đề tài nghiên cứu khoa học tại Học viện Quân y."
  },
  progress: {
    crumb: "Tình hình thực hiện & tiến độ",
    title: "Báo cáo tình hình thực hiện & tiến độ đề tài",
    description: "Theo dõi tiến độ theo thời gian thực, đo lường thời hạn còn lại, phát hiện đề tài trễ hạn và xuất Excel theo bộ lọc."
  },
  khqs: {
    crumb: "Kết quả công tác KHQS",
    title: "Báo cáo kết quả công tác khoa học quân sự",
    description: "Báo cáo 6 tháng đầu năm / cả năm theo mẫu Phòng KHQS gửi Cục Khoa học quân sự: văn bản báo cáo và các Biểu KQ-1 đến KQ-6, xuất Word và Excel."
  },
  conferences: {
    crumb: "Hội nghị khoa học",
    title: "Báo cáo hội nghị khoa học",
    description: "Số hội nghị, tỉ lệ nhận lời, tỉ lệ nộp tóm tắt và toàn văn, báo cáo viên theo đơn vị, theo từng hội nghị và từng phiên."
  }
};

export default function ReportsPage() {
  const { account, isLoading } = useSession();
  const role = account?.systemRole ?? "";
  const canAccess = ALLOWED_REPORT_ROLES.includes(role);
  const showKhqs = KHQS_REPORT_ROLES.includes(role);
  const [activeTab, setActiveTab] = useState<ReportTab>("budget");

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "budget" || tab === "progress" || tab === "conferences") setActiveTab(tab);
    else if (tab === "khqs" && showKhqs) setActiveTab("khqs");
  }, [showKhqs]);

  if (!isLoading && !canAccess) {
    return (
      <>
        <Breadcrumb items={[{ label: "Tổng quan", href: "/dashboard" }, { label: "Báo cáo tổng hợp" }]} />
        <PageHeader eyebrow="Báo cáo & Thống kê" title="Báo cáo tổng hợp" description="Khu vực dành cho Ban Giám đốc và cán bộ quản lý khoa học." />
        <EmptyState
          title="Không có quyền truy cập trang báo cáo"
          message="Tài khoản hiện tại không thuộc nhóm Ban Giám đốc, Phòng KHQS hoặc Ban QLKH."
        />
      </>
    );
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Báo cáo tổng hợp", href: "/reports" },
          { label: TAB_TITLES[activeTab].crumb }
        ]}
      />
      <div className="no-print">
        <PageHeader
          eyebrow="Báo cáo & Thống kê"
          title={TAB_TITLES[activeTab].title}
          description={TAB_TITLES[activeTab].description}
        />

        <nav className="tabs-nav" aria-label="Phân hệ Báo cáo đề tài" style={{ marginBottom: "20px" }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === "budget" ? "active" : ""}`}
            onClick={() => setActiveTab("budget")}
          >
            <Coins size={16} aria-hidden="true" />
            <span>Báo cáo Kinh phí đề tài</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "progress" ? "active" : ""}`}
            onClick={() => setActiveTab("progress")}
          >
            <Timer size={16} aria-hidden="true" />
            <span>Báo cáo Tình hình Thực hiện &amp; Tiến độ</span>
          </button>
          {showKhqs ? (
            <button
              type="button"
              className={`tab-btn ${activeTab === "khqs" ? "active" : ""}`}
              onClick={() => setActiveTab("khqs")}
            >
              <ClipboardList size={16} aria-hidden="true" />
              <span>Báo cáo công tác KHQS</span>
            </button>
          ) : null}
          <button
            type="button"
            className={`tab-btn ${activeTab === "conferences" ? "active" : ""}`}
            onClick={() => setActiveTab("conferences")}
          >
            <Presentation size={16} aria-hidden="true" />
            <span>Báo cáo Hội nghị khoa học</span>
          </button>
        </nav>
      </div>

      {activeTab === "budget" ? <BudgetReportPanel /> : activeTab === "progress" ? <ProgressReportPanel /> : activeTab === "conferences" ? <ConferenceReportPanel /> : showKhqs ? <KhqsReportPanel /> : <BudgetReportPanel />}
    </>
  );
}
