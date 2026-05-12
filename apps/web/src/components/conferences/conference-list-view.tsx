import Link from "next/link";
import { CalendarDays, ClipboardList, FileClock, FilePlus2, FileWarning } from "lucide-react";
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
  conferenceRecords,
  getConferenceFormatOptions,
  getConferenceLevelOptions,
  getConferenceMonthOptions,
  getConferenceStatusOptions,
  getConferenceSummary,
  getConferenceUnitOptions,
  getMissingReportConferences,
  getMonthlyConferenceSchedule,
  getPendingApprovalConferences,
  getUpcomingConferences
} from "@/lib/conference-data";

export function ConferenceListView() {
  const summary = getConferenceSummary();
  const upcoming = getUpcomingConferences().slice(0, 4);
  const pendingApproval = getPendingApprovalConferences().slice(0, 4);
  const missingReports = getMissingReportConferences().slice(0, 4);
  const monthlySchedule = getMonthlyConferenceSchedule().slice(0, 5);

  return (
    <>
      <Breadcrumb items={[{ label: "Bảng điều hành", href: "/dashboard" }, { label: "Hội thảo khoa học" }]} />
      <PageHeader
        eyebrow="Hội thảo"
        title="Hội thảo khoa học"
        description="Quản lý kế hoạch tổ chức hội thảo, chương trình khoa học, báo cáo viên, đại biểu, tài liệu và báo cáo sau hội thảo."
        actions={
          <button className="button primary" type="button">
            <FilePlus2 size={17} aria-hidden="true" />
            Đề xuất hội thảo
          </button>
        }
      />

      <div className="grid kpi-grid" style={{ marginBottom: 16 }}>
        <KpiCard label="Tổng số hội thảo" value={String(summary.total).padStart(2, "0")} meta="Toàn bộ hội thảo đang theo dõi" />
        <KpiCard label="Sắp diễn ra" value={String(summary.upcoming).padStart(2, "0")} meta="Có lịch tổ chức trong giai đoạn hiện hành" tone="info" />
        <KpiCard label="Chờ phê duyệt" value={String(summary.awaitingApproval).padStart(2, "0")} meta="Kế hoạch cần lãnh đạo phê duyệt" tone="warning" />
        <KpiCard label="Đang chuẩn bị" value={String(summary.preparing).padStart(2, "0")} meta="Đang chốt chương trình, đại biểu và tài liệu" tone="info" />
        <KpiCard label="Chờ báo cáo sau hội thảo" value={String(summary.awaitingReport).padStart(2, "0")} meta="Cần nộp biên bản, kết luận hoặc báo cáo" tone="danger" />
        <KpiCard label="Hoàn tất" value={String(summary.completed).padStart(2, "0")} meta="Đã lưu đủ hồ sơ sau hội thảo" />
      </div>

      <SectionCard title="Bộ lọc và tra cứu hội thảo" subtitle="Tìm nhanh theo mã, tên hội thảo, đơn vị tổ chức, cấp tổ chức và thời gian dự kiến">
        <FilterBar
          searchPlaceholder="Tìm kiếm theo mã, tên hội thảo, đơn vị tổ chức"
          filters={[
            { label: "Trạng thái", value: "status", options: getConferenceStatusOptions() },
            { label: "Cấp tổ chức", value: "level", options: getConferenceLevelOptions() },
            { label: "Đơn vị tổ chức", value: "unit", options: getConferenceUnitOptions() },
            { label: "Tháng tổ chức", value: "month", options: getConferenceMonthOptions() },
            { label: "Hình thức tổ chức", value: "format", options: getConferenceFormatOptions() }
          ]}
        />

        <ModuleSummaryStrip
          items={[
            { label: "Đang thẩm định", value: String(conferenceRecords.filter((record) => record.status === "conference-awaiting-appraisal").length).padStart(2, "0"), meta: "Chờ rà soát nội dung", tone: "warning" },
            { label: "Đã phê duyệt", value: String(conferenceRecords.filter((record) => record.status === "conference-approved").length).padStart(2, "0"), meta: "Sẵn sàng chuẩn bị tổ chức" },
            { label: "Đang tổ chức", value: String(conferenceRecords.filter((record) => record.status === "conference-in-session").length).padStart(2, "0"), meta: "Cần ghi nhận biên bản", tone: "info" },
            { label: "Tạm hoãn", value: String(conferenceRecords.filter((record) => record.status === "conference-postponed").length).padStart(2, "0"), meta: "Cần cập nhật lịch mới", tone: "danger" }
          ]}
        />

        <div style={{ marginTop: 16 }}>
          <DataTable
            columns={[
              { key: "code", header: "Mã hội thảo", render: (record) => <RecordLink href={`/hoi-thao-khoa-hoc/${record.id}`}>{record.code}</RecordLink> },
              {
                key: "title",
                header: "Tên hội thảo",
                render: (record) => (
                  <>
                    <span className="record-title">{record.title}</span>
                    <span className="record-meta">{record.eventType} · {record.level} · {record.format}</span>
                  </>
                )
              },
              { key: "organizingUnit", header: "Đơn vị tổ chức", render: (record) => record.organizingUnit },
              { key: "chair", header: "Chủ trì", render: (record) => record.chair },
              {
                key: "time",
                header: "Thời gian",
                render: (record) => (
                  <>
                    <span className="record-title">{record.timeLabel}</span>
                    <span className="record-meta">{record.month}</span>
                  </>
                )
              },
              { key: "venue", header: "Địa điểm", render: (record) => record.venue },
              {
                key: "delegates",
                header: "Số đại biểu",
                render: (record) => (
                  <>
                    <span className="record-title">{record.delegateCount} đại biểu</span>
                    <span className="record-meta">{record.confirmedDelegates} xác nhận · {record.pendingDelegates} chờ xác nhận</span>
                  </>
                )
              },
              { key: "status", header: "Trạng thái", render: (record) => <StatusBadge status={record.status} /> },
              {
                key: "actions",
                header: "Thao tác",
                render: (record) => (
                  <Link className="button" href={`/hoi-thao-khoa-hoc/${record.id}`}>
                    Xem chương trình
                  </Link>
                )
              }
            ]}
            getRowKey={(record) => record.id}
            rows={conferenceRecords}
          />
        </div>

        <MobileRecordList
          items={conferenceRecords.map((record) => ({
            id: record.id,
            href: `/hoi-thao-khoa-hoc/${record.id}`,
            title: record.title,
            subtitle: record.code,
            meta: `${record.timeLabel} · ${record.organizingUnit} · ${record.chair}`,
            badge: <StatusBadge status={record.status} />,
            actionLabel: "Xem chương trình"
          }))}
        />
      </SectionCard>

      <div className="grid two-column" style={{ marginTop: 16 }}>
        <SectionCard
          title="Hội thảo sắp diễn ra"
          subtitle="Các hội thảo cần chốt chương trình, đại biểu và tài liệu trước ngày tổ chức"
          action={
            <span className="button" aria-hidden="true">
              <CalendarDays size={16} />
              {String(upcoming.length).padStart(2, "0")} lịch
            </span>
          }
        >
          <AlertList items={upcoming.map((record) => ({ title: `${record.code} · ${record.title}`, meta: `${record.timeLabel} · ${record.venue}` }))} />
        </SectionCard>

        <SectionCard
          title="Kế hoạch chờ phê duyệt"
          subtitle="Các kế hoạch đã hoàn tất thẩm định hoặc đang chờ ý kiến cấp có thẩm quyền"
          action={
            <span className="button" aria-hidden="true">
              <ClipboardList size={16} />
              {String(pendingApproval.length).padStart(2, "0")} kế hoạch
            </span>
          }
        >
          <AlertList items={pendingApproval.map((record) => ({ title: `${record.code} · ${record.title}`, meta: `${record.organizingUnit} · ${record.planSummary}` }))} />
        </SectionCard>

        <SectionCard
          title="Báo cáo sau hội thảo còn thiếu"
          subtitle="Theo dõi các hội thảo đã tổ chức nhưng chưa đủ biên bản, kết luận hoặc báo cáo tổng hợp"
          action={
            <span className="button" aria-hidden="true">
              <FileWarning size={16} />
              {String(missingReports.length).padStart(2, "0")} hồ sơ
            </span>
          }
        >
          <AlertList items={missingReports.map((record) => ({ title: `${record.code} · ${record.title}`, meta: record.postEventReport }))} />
        </SectionCard>

        <SectionCard
          title="Lịch hội thảo trong tháng"
          subtitle="Tổng hợp lịch tổ chức và tình trạng chuẩn bị trong tháng hiện hành"
          action={
            <span className="button" aria-hidden="true">
              <FileClock size={16} />
              {String(monthlySchedule.length).padStart(2, "0")} mục
            </span>
          }
        >
          <AlertList items={monthlySchedule.map((record) => ({ title: `${record.timeLabel} · ${record.code}`, meta: `${record.organizingUnit} · ${record.venue}` }))} />
        </SectionCard>
      </div>
    </>
  );
}
