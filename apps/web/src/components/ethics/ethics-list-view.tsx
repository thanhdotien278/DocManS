import Link from "next/link";
import { CalendarDays, FilePlus2, FileWarning, ShieldAlert, UsersRound } from "lucide-react";
import { AlertList } from "@/components/ui/alert-list";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { DataTable, RecordLink } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { KpiCard } from "@/components/ui/kpi-card";
import { MobileRecordList } from "@/components/ui/mobile-record-list";
import { ModuleSummaryStrip } from "@/components/ui/module-summary-strip";
import { PageHeader } from "@/components/ui/page-header";
import { RiskBadge } from "@/components/ui/risk-badge";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ethicsRecords,
  getEthicsHighRiskRecords,
  getEthicsMeetingOptions,
  getEthicsNeedsEvidence,
  getEthicsResearchTypeOptions,
  getEthicsRiskOptions,
  getEthicsSecretaryLoad,
  getEthicsStatusOptions,
  getEthicsSummary,
  getEthicsUnitOptions,
  getEthicsUpcomingMeetings
} from "@/lib/ethics-data";

function renderSecretaryLoadChart() {
  const bars = getEthicsSecretaryLoad();

  return (
    <div className="chart-placeholder" aria-label="Tải xử lý theo tổ thư ký">
      {bars.map((bar) => (
        <div className={`chart-bar ${bar.tone}`} key={bar.label}>
          <em className="chart-bar-value">{String(bar.count).padStart(2, "0")}</em>
          <span style={{ height: bar.height }} />
          <strong>{bar.label}</strong>
        </div>
      ))}
    </div>
  );
}

export function EthicsListView() {
  const summary = getEthicsSummary();
  const needsEvidence = getEthicsNeedsEvidence().slice(0, 4);
  const upcomingMeetings = getEthicsUpcomingMeetings().slice(0, 4);
  const highRiskRecords = getEthicsHighRiskRecords().slice(0, 4);

  return (
    <>
      <Breadcrumb items={[{ label: "Bảng điều hành", href: "/dashboard" }, { label: "Hội đồng y đức" }]} />
      <PageHeader
        eyebrow="Y đức"
        title="Hội đồng y đức"
        description="Theo dõi hồ sơ thẩm định y đức, phân loại rủi ro, phiên họp hội đồng và kết luận thẩm định."
        actions={
          <button className="button primary" type="button">
            <FilePlus2 size={17} aria-hidden="true" />
            Tiếp nhận hồ sơ
          </button>
        }
      />

      <div className="grid kpi-grid" style={{ marginBottom: 16 }}>
        <KpiCard label="Tổng số hồ sơ" value={String(summary.total).padStart(2, "0")} meta="Toàn bộ hồ sơ y đức đang theo dõi" />
        <KpiCard label="Chờ kiểm tra" value={String(summary.awaitingCheck).padStart(2, "0")} meta="Hồ sơ mới cần rà soát thành phần" tone="info" />
        <KpiCard label="Đang thẩm định" value={String(summary.inReview).padStart(2, "0")} meta="Đang có nhận xét chuyên môn" tone="warning" />
        <KpiCard label="Chờ họp hội đồng" value={String(summary.awaitingMeeting).padStart(2, "0")} meta="Đã xếp hoặc chờ xác nhận phiên họp" tone="info" />
        <KpiCard label="Cần bổ sung minh chứng" value={String(summary.needsEvidence).padStart(2, "0")} meta="Cần chủ nhiệm nghiên cứu phản hồi" tone="danger" />
        <KpiCard label="Đã ban hành kết luận" value={String(summary.concluded).padStart(2, "0")} meta="Bao gồm thông qua, có điều kiện và không thông qua" />
      </div>

      <SectionCard title="Bộ lọc và tra cứu hồ sơ y đức" subtitle="Tìm nhanh hồ sơ theo mã, nghiên cứu, chủ nhiệm, rủi ro và phiên họp dự kiến">
        <FilterBar
          searchPlaceholder="Tìm kiếm theo mã hồ sơ, tên nghiên cứu, chủ nhiệm nghiên cứu"
          filters={[
            { label: "Trạng thái", value: "status", options: getEthicsStatusOptions() },
            { label: "Mức độ rủi ro", value: "risk", options: getEthicsRiskOptions() },
            { label: "Loại nghiên cứu", value: "research-type", options: getEthicsResearchTypeOptions() },
            { label: "Đơn vị", value: "unit", options: getEthicsUnitOptions() },
            { label: "Phiên họp dự kiến", value: "meeting", options: getEthicsMeetingOptions() }
          ]}
        />

        <ModuleSummaryStrip
          items={[
            { label: "Mới tiếp nhận", value: String(ethicsRecords.filter((record) => record.status === "ethics-new").length).padStart(2, "0"), meta: "Chưa kiểm tra thành phần", tone: "info" },
            { label: "Cần bổ sung", value: String(summary.needsEvidence).padStart(2, "0"), meta: "Chờ minh chứng hoặc giải trình", tone: "warning" },
            { label: "Rủi ro cao", value: String(getEthicsHighRiskRecords().length).padStart(2, "0"), meta: "Cần hội đồng theo dõi sát", tone: "danger" },
            { label: "Phiên họp gần", value: String(upcomingMeetings.length).padStart(2, "0"), meta: "Có lịch trong giai đoạn hiện hành" }
          ]}
        />

        <div style={{ marginTop: 16 }}>
          <DataTable
            columns={[
              { key: "code", header: "Mã hồ sơ", render: (record) => <RecordLink href={`/hoi-dong-y-duc/${record.id}`}>{record.code}</RecordLink> },
              {
                key: "title",
                header: "Tên nghiên cứu",
                render: (record) => (
                  <>
                    <span className="record-title">{record.title}</span>
                    <span className="record-meta">{record.receivedAt}</span>
                  </>
                )
              },
              {
                key: "principalInvestigator",
                header: "Chủ nhiệm nghiên cứu",
                render: (record) => (
                  <>
                    <span className="record-title">{record.principalInvestigator}</span>
                    <span className="record-meta">{record.secretaryOwner}</span>
                  </>
                )
              },
              { key: "unit", header: "Đơn vị", render: (record) => record.unit },
              { key: "researchType", header: "Loại nghiên cứu", render: (record) => record.researchType },
              { key: "expectedMeeting", header: "Phiên họp dự kiến", render: (record) => record.expectedMeeting },
              { key: "riskLevel", header: "Mức độ rủi ro", render: (record) => <RiskBadge level={record.riskLevel} /> },
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
                  <Link className="button" href={`/hoi-dong-y-duc/${record.id}`}>
                    Xem chi tiết
                  </Link>
                )
              }
            ]}
            getRowKey={(record) => record.id}
            rows={ethicsRecords}
          />
        </div>

        <MobileRecordList
          items={ethicsRecords.map((record) => ({
            id: record.id,
            href: `/hoi-dong-y-duc/${record.id}`,
            title: record.title,
            subtitle: record.code,
            meta: `${record.expectedMeeting} · ${record.principalInvestigator}`,
            badge: (
              <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
                <StatusBadge status={record.status} />
                <RiskBadge level={record.riskLevel} />
              </div>
            ),
            actionLabel: "Xem chi tiết"
          }))}
        />
      </SectionCard>

      <div className="grid two-column" style={{ marginTop: 16 }}>
        <SectionCard
          title="Hồ sơ cần bổ sung minh chứng"
          subtitle="Các hồ sơ còn thiếu biểu mẫu, giải trình hoặc phụ lục bảo mật"
          action={
            <span className="button" aria-hidden="true">
              <FileWarning size={16} />
              {String(needsEvidence.length).padStart(2, "0")} hồ sơ
            </span>
          }
        >
          <AlertList items={needsEvidence.map((record) => ({ title: `${record.code} · ${record.title}`, meta: `${record.principalInvestigator} · ${record.dueLabel}` }))} />
        </SectionCard>

        <SectionCard
          title="Phiên họp hội đồng sắp diễn ra"
          subtitle="Hồ sơ đã xếp lịch hoặc cần hội đồng xác nhận thành phần họp"
          action={
            <span className="button" aria-hidden="true">
              <CalendarDays size={16} />
              {String(upcomingMeetings.length).padStart(2, "0")} phiên
            </span>
          }
        >
          <AlertList items={upcomingMeetings.map((record) => ({ title: `${record.expectedMeeting} · ${record.code}`, meta: `${record.title} · ${record.meetingInfo}` }))} />
        </SectionCard>

        <SectionCard
          title="Hồ sơ rủi ro cao cần theo dõi"
          subtitle="Các nghiên cứu có can thiệp, dữ liệu nhạy cảm hoặc yêu cầu giám sát an toàn"
          action={
            <span className="button" aria-hidden="true">
              <ShieldAlert size={16} />
              {String(highRiskRecords.length).padStart(2, "0")} hồ sơ
            </span>
          }
        >
          <AlertList items={highRiskRecords.map((record) => ({ title: `${record.code} · ${record.title}`, meta: `${record.unit} · ${record.riskAssessment}` }))} />
        </SectionCard>

        <SectionCard
          title="Tải xử lý theo tổ thư ký hoặc đơn vị"
          subtitle="Mỗi cột thể hiện số lượng hồ sơ đang do đầu mối thư ký theo dõi"
          action={
            <span className="button" aria-hidden="true">
              <UsersRound size={16} />
              Theo dõi hiện hành
            </span>
          }
        >
          {renderSecretaryLoadChart()}
        </SectionCard>
      </div>
    </>
  );
}
