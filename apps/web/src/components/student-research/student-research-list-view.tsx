import Link from "next/link";
import { Award, CalendarDays, ClipboardList, FilePlus2, FileWarning, GraduationCap } from "lucide-react";
import { AlertList } from "@/components/ui/alert-list";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { DataTable, RecordLink } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { KpiCard } from "@/components/ui/kpi-card";
import { MobileRecordList } from "@/components/ui/mobile-record-list";
import { ModuleSummaryStrip } from "@/components/ui/module-summary-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getAwardedStudentResearch,
  getAwaitingAcceptanceStudentResearch,
  getAwaitingReviewStudentResearch,
  getStudentResearchAcademicYearOptions,
  getStudentResearchFieldOptions,
  getStudentResearchStatusOptions,
  getStudentResearchSummary,
  getStudentResearchSupervisorOptions,
  getStudentResearchUnitOptions,
  getSupplementStudentResearch,
  getUpcomingDefenseStudentResearch,
  studentResearchRecords
} from "@/lib/student-research-data";

export function StudentResearchListView() {
  const summary = getStudentResearchSummary();
  const awaitingReview = getAwaitingReviewStudentResearch().slice(0, 4);
  const needsSupplement = getSupplementStudentResearch().slice(0, 4);
  const awaitingAcceptance = getAwaitingAcceptanceStudentResearch().slice(0, 4);
  const upcomingDefense = getUpcomingDefenseStudentResearch().slice(0, 4);
  const awarded = getAwardedStudentResearch().slice(0, 4);

  return (
    <>
      <Breadcrumb items={[{ label: "Bảng điều hành", href: "/dashboard" }, { label: "Đề tài sinh viên NCKH" }]} />
      <PageHeader
        eyebrow="Sinh viên NCKH"
        title="Đề tài sinh viên NCKH"
        description="Quản lý đăng ký, xét duyệt, theo dõi thực hiện, nghiệm thu và kết quả đề tài nghiên cứu khoa học của sinh viên."
        actions={
          <button className="button primary" type="button">
            <FilePlus2 size={17} aria-hidden="true" />
            Tiếp nhận đăng ký
          </button>
        }
      />

      <div className="grid kpi-grid" style={{ marginBottom: 16 }}>
        <KpiCard label="Tổng số đề tài" value={String(summary.total).padStart(2, "0")} meta="Toàn bộ đề tài sinh viên đang theo dõi" />
        <KpiCard label="Chờ kiểm tra" value={String(summary.awaitingCheck).padStart(2, "0")} meta="Hồ sơ mới cần rà soát điều kiện" tone="info" />
        <KpiCard label="Đang thực hiện" value={String(summary.inProgress).padStart(2, "0")} meta="Đang triển khai theo kế hoạch được duyệt" tone="info" />
        <KpiCard label="Chờ nghiệm thu" value={String(summary.awaitingAcceptance).padStart(2, "0")} meta="Đã nộp báo cáo hoặc đã xếp lịch" tone="warning" />
        <KpiCard label="Đã nghiệm thu" value={String(summary.accepted).padStart(2, "0")} meta="Đã công nhận kết quả hoặc lưu hồ sơ" />
        <KpiCard label="Đạt giải" value={String(summary.awarded).padStart(2, "0")} meta="Đề tài được đề xuất hoặc công nhận khen thưởng" />
      </div>

      <SectionCard title="Bộ lọc và tra cứu đề tài sinh viên" subtitle="Tìm nhanh theo mã, tên đề tài, nhóm sinh viên, giảng viên hướng dẫn và năm học">
        <FilterBar
          searchPlaceholder="Tìm kiếm theo mã, tên đề tài, sinh viên, giảng viên hướng dẫn"
          filters={[
            { label: "Trạng thái", value: "status", options: getStudentResearchStatusOptions() },
            { label: "Khoa/Bộ môn", value: "unit", options: getStudentResearchUnitOptions() },
            { label: "Năm học", value: "academic-year", options: getStudentResearchAcademicYearOptions() },
            { label: "Lĩnh vực", value: "field", options: getStudentResearchFieldOptions() },
            { label: "Giảng viên hướng dẫn", value: "supervisor", options: getStudentResearchSupervisorOptions() }
          ]}
        />

        <ModuleSummaryStrip
          items={[
            { label: "Đang đăng ký", value: String(studentResearchRecords.filter((record) => record.status === "student-registering").length).padStart(2, "0"), meta: "Chưa hoàn tất hồ sơ", tone: "info" },
            { label: "Cần bổ sung", value: String(needsSupplement.length).padStart(2, "0"), meta: "Chờ sinh viên hoặc giảng viên phản hồi", tone: "warning" },
            { label: "Chờ nghiệm thu", value: String(awaitingAcceptance.length).padStart(2, "0"), meta: "Cần chuẩn bị hội đồng và biên bản" },
            { label: "Không đạt", value: String(studentResearchRecords.filter((record) => record.status === "student-not-passed").length).padStart(2, "0"), meta: "Cần lưu vết kết luận", tone: "danger" }
          ]}
        />

        <div style={{ marginTop: 16 }}>
          <DataTable
            columns={[
              { key: "code", header: "Mã đề tài", render: (record) => <RecordLink href={`/de-tai-sinh-vien/${record.id}`}>{record.code}</RecordLink> },
              {
                key: "title",
                header: "Tên đề tài",
                render: (record) => (
                  <>
                    <span className="record-title">{record.title}</span>
                    <span className="record-meta">{record.registeredAt}</span>
                  </>
                )
              },
              {
                key: "students",
                header: "Nhóm sinh viên",
                render: (record) => (
                  <>
                    <span className="record-title">{record.studentLead.name}</span>
                    <span className="record-meta">{record.studentMembers.length} thành viên</span>
                  </>
                )
              },
              {
                key: "supervisor",
                header: "Giảng viên hướng dẫn",
                render: (record) => (
                  <>
                    <span className="record-title">{record.supervisor.name}</span>
                    <span className="record-meta">{record.coSupervisor?.name ?? "Không có đồng hướng dẫn"}</span>
                  </>
                )
              },
              { key: "unit", header: "Khoa/Bộ môn", render: (record) => record.unit },
              { key: "academicYear", header: "Năm học", render: (record) => record.academicYear },
              { key: "field", header: "Lĩnh vực", render: (record) => record.field },
              { key: "status", header: "Trạng thái", render: (record) => <StatusBadge status={record.status} /> },
              {
                key: "dueDate",
                header: "Hạn xử lý",
                render: (record) => (
                  <>
                    <span className="record-title">{record.dueDate}</span>
                    <span className="record-meta">{record.dueLabel}</span>
                  </>
                )
              },
              {
                key: "actions",
                header: "Thao tác",
                render: (record) => (
                  <Link className="button" href={`/de-tai-sinh-vien/${record.id}`}>
                    Xem chi tiết
                  </Link>
                )
              }
            ]}
            getRowKey={(record) => record.id}
            rows={studentResearchRecords}
          />
        </div>

        <MobileRecordList
          items={studentResearchRecords.map((record) => ({
            id: record.id,
            href: `/de-tai-sinh-vien/${record.id}`,
            title: record.title,
            subtitle: `${record.code} · ${record.studentLead.name}`,
            meta: `${record.supervisor.name} · ${record.dueLabel}`,
            badge: <StatusBadge status={record.status} />,
            actionLabel: "Xem chi tiết"
          }))}
        />
      </SectionCard>

      <div className="grid two-column" style={{ marginTop: 16 }}>
        <SectionCard
          title="Hồ sơ chờ xét duyệt"
          subtitle="Đề tài mới đăng ký cần rà soát điều kiện và thành phần hồ sơ"
          action={
            <span className="button" aria-hidden="true">
              <ClipboardList size={16} />
              {String(awaitingReview.length).padStart(2, "0")} hồ sơ
            </span>
          }
        >
          <AlertList items={awaitingReview.map((record) => ({ title: `${record.code} · ${record.title}`, meta: `${record.studentLead.name} · ${record.unit} · ${record.dueLabel}` }))} />
        </SectionCard>

        <SectionCard
          title="Đề tài cần bổ sung"
          subtitle="Các hồ sơ cần sinh viên hoặc giảng viên hướng dẫn hoàn thiện trước khi xử lý tiếp"
          action={
            <span className="button" aria-hidden="true">
              <FileWarning size={16} />
              {String(needsSupplement.length).padStart(2, "0")} đề tài
            </span>
          }
        >
          <AlertList items={needsSupplement.map((record) => ({ title: `${record.code} · ${record.title}`, meta: `${record.supervisor.name} · ${record.dueLabel}` }))} />
        </SectionCard>

        <SectionCard
          title="Đề tài chờ nghiệm thu"
          subtitle="Đề tài đã nộp báo cáo, cần chuẩn bị hội đồng, lịch nghiệm thu và phiếu nhận xét"
          action={
            <span className="button" aria-hidden="true">
              <GraduationCap size={16} />
              {String(awaitingAcceptance.length).padStart(2, "0")} đề tài
            </span>
          }
        >
          <AlertList items={awaitingAcceptance.map((record) => ({ title: `${record.code} · ${record.title}`, meta: `${record.acceptanceSchedule} · ${record.secretary.name}` }))} />
        </SectionCard>

        <SectionCard
          title="Lịch nghiệm thu sắp tới"
          subtitle="Các phiên nghiệm thu đã có lịch hoặc cần xác nhận thành phần hội đồng"
          action={
            <span className="button" aria-hidden="true">
              <CalendarDays size={16} />
              {String(upcomingDefense.length).padStart(2, "0")} lịch
            </span>
          }
        >
          <AlertList items={upcomingDefense.map((record) => ({ title: `${record.acceptanceSchedule} · ${record.code}`, meta: `${record.title} · ${record.unit}` }))} />
        </SectionCard>

        <SectionCard
          title="Đề tài đạt giải hoặc đề xuất khen thưởng"
          subtitle="Theo dõi đề tài có kết quả nổi bật, đề xuất công nhận hoặc khen thưởng"
          action={
            <span className="button" aria-hidden="true">
              <Award size={16} />
              {String(awarded.length).padStart(2, "0")} đề tài
            </span>
          }
        >
          <AlertList items={awarded.map((record) => ({ title: `${record.code} · ${record.title}`, meta: `${record.scoreSummary} · ${record.awardSummary}` }))} />
        </SectionCard>
      </div>
    </>
  );
}
