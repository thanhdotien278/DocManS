import Link from "next/link";
import { ClipboardCheck, FileWarning, Flag, ListFilter, RefreshCcw } from "lucide-react";
import { AlertList } from "@/components/ui/alert-list";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { DataTable, RecordLink } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { KpiCard } from "@/components/ui/kpi-card";
import { MobileRecordList } from "@/components/ui/mobile-record-list";
import { ModuleSummaryStrip } from "@/components/ui/module-summary-strip";
import { PageHeader } from "@/components/ui/page-header";
import { PriorityBadge, StatusBadge } from "@/components/ui/status-badge";
import { SectionCard } from "@/components/ui/section-card";
import {
  getLeadershipTasks,
  getOverdueTasks,
  getTaskBoardColumns,
  getTaskPriorityOptions,
  getTaskStatusOptions,
  getTaskSummary,
  getTaskUnitLoad,
  getTaskUnitOptions,
  getTasksByBoardColumn,
  taskRecords
} from "@/lib/task-data";

function renderWorkloadChart() {
  const bars = getTaskUnitLoad();

  return (
    <div className="chart-placeholder" aria-label="Tải công việc theo đơn vị">
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

function renderKanban() {
  return (
    <div className="kanban-grid">
      {getTaskBoardColumns().map((column) => {
        const tasks = getTasksByBoardColumn(column.key);

        return (
          <section className="kanban-column" key={column.key}>
            <header className="kanban-column-header">
              <div>
                <h3>{column.label}</h3>
                <p>{tasks.length} nhiệm vụ</p>
              </div>
            </header>
            <div className="kanban-column-body">
              {tasks.map((task) => (
                <article className="kanban-card" key={task.id}>
                  <div className="kanban-card-head">
                    <span className="record-meta">{task.code}</span>
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <Link className="record-title" href={`/nhiem-vu/${task.id}`}>
                    {task.title}
                  </Link>
                  <span className="record-meta">
                    {task.assignee} · {task.unit}
                  </span>
                  <span className="record-meta">{task.dueLabel}</span>
                  <StatusBadge status={task.status} />
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function TaskListView() {
  const summary = getTaskSummary();
  const overdueTasks = getOverdueTasks().slice(0, 4);
  const leadershipTasks = getLeadershipTasks().slice(0, 4);

  return (
    <>
      <Breadcrumb items={[{ label: "Bảng điều hành", href: "/dashboard" }, { label: "Quản lý nhiệm vụ" }]} />
      <PageHeader
        eyebrow="Nhiệm vụ"
        title="Quản lý nhiệm vụ"
        description="Theo dõi nhiệm vụ được giao, hạn xử lý, mức độ ưu tiên và kết quả thực hiện trong toàn hệ thống."
        actions={
          <button className="button primary" type="button">
            <ClipboardCheck size={17} aria-hidden="true" />
            Tạo nhiệm vụ
          </button>
        }
      />

      <div className="grid kpi-grid" style={{ marginBottom: 16 }}>
        <KpiCard label="Tổng số nhiệm vụ" value={String(summary.total).padStart(2, "0")} meta="Toàn bộ nhiệm vụ đang theo dõi" />
        <KpiCard
          label="Đang xử lý"
          value={String(summary.processing).padStart(2, "0")}
          meta="Bao gồm tiếp nhận, thực hiện và chờ phản hồi"
          tone="info"
        />
        <KpiCard
          label="Sắp đến hạn"
          value={String(summary.dueSoon).padStart(2, "0")}
          meta="Cần ưu tiên xử lý trong 7 ngày tới"
          tone="warning"
        />
        <KpiCard
          label="Quá hạn"
          value={String(summary.overdue).padStart(2, "0")}
          meta="Cần lãnh đạo hoặc đơn vị can thiệp"
          tone="danger"
        />
        <KpiCard
          label="Hoàn thành trong tuần"
          value={String(summary.completedThisWeek).padStart(2, "0")}
          meta="Đã ghi nhận kết quả và đóng nhiệm vụ"
        />
      </div>

      <SectionCard title="Bộ lọc và tra cứu nhiệm vụ" subtitle="Tìm nhanh nhiệm vụ theo mã, người phụ trách, trạng thái và hạn xử lý">
        <FilterBar
          searchPlaceholder="Tìm kiếm theo mã, tên nhiệm vụ, người phụ trách"
          filters={[
            { label: "Trạng thái", value: "status", options: getTaskStatusOptions() },
            { label: "Mức độ ưu tiên", value: "priority", options: getTaskPriorityOptions() },
            { label: "Đơn vị phụ trách", value: "unit", options: getTaskUnitOptions() },
            { label: "Hạn xử lý", value: "due-date", options: ["Hôm nay", "3 ngày tới", "7 ngày tới", "Đã quá hạn"] }
          ]}
        />

        <ModuleSummaryStrip
          items={[
            { label: "Mới giao", value: String(getTasksByBoardColumn("assigned").length).padStart(2, "0"), meta: "Chưa có cập nhật mới", tone: "info" },
            { label: "Đang thực hiện", value: String(getTasksByBoardColumn("processing").length).padStart(2, "0"), meta: "Đang được đơn vị xử lý" },
            { label: "Chờ phản hồi", value: String(getTasksByBoardColumn("waiting-response").length).padStart(2, "0"), meta: "Chờ tài liệu hoặc xác nhận", tone: "warning" },
            { label: "Chờ duyệt kết quả", value: String(getTasksByBoardColumn("pending-result-approval").length).padStart(2, "0"), meta: "Cần ý kiến cấp có thẩm quyền", tone: "danger" }
          ]}
        />

        <div style={{ marginTop: 16 }}>
          <DataTable
            columns={[
              {
                key: "code",
                header: "Mã nhiệm vụ",
                render: (task) => <RecordLink href={`/nhiem-vu/${task.id}`}>{task.code}</RecordLink>
              },
              {
                key: "title",
                header: "Tên nhiệm vụ",
                render: (task) => (
                  <>
                    <span className="record-title">{task.title}</span>
                    <span className="record-meta">{task.linkedRecord}</span>
                  </>
                )
              },
              { key: "source", header: "Nguồn phát sinh", render: (task) => task.source },
              {
                key: "assignee",
                header: "Người phụ trách",
                render: (task) => (
                  <>
                    <span className="record-title">{task.assignee}</span>
                    <span className="record-meta">{task.assigneeRole}</span>
                  </>
                )
              },
              { key: "unit", header: "Đơn vị", render: (task) => task.unit },
              { key: "priority", header: "Mức độ ưu tiên", render: (task) => <PriorityBadge priority={task.priority} /> },
              {
                key: "dueDate",
                header: "Hạn xử lý",
                render: (task) => (
                  <>
                    <span className="record-title">{task.dueDate}</span>
                    <span className="record-meta">{task.dueLabel}</span>
                  </>
                )
              },
              { key: "status", header: "Trạng thái", render: (task) => <StatusBadge status={task.status} /> },
              {
                key: "actions",
                header: "Thao tác",
                render: (task) => (
                  <Link className="button" href={`/nhiem-vu/${task.id}`}>
                    Xem chi tiết
                  </Link>
                )
              }
            ]}
            getRowKey={(task) => task.id}
            rows={taskRecords}
          />
        </div>

        <MobileRecordList
          items={taskRecords.map((task) => ({
            id: task.id,
            href: `/nhiem-vu/${task.id}`,
            title: task.title,
            subtitle: `${task.code} · ${task.unit}`,
            meta: `${task.assignee} · ${task.dueLabel}`,
            badge: (
              <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
              </div>
            ),
            actionLabel: "Xem chi tiết"
          }))}
        />
      </SectionCard>

      <div className="grid two-column" style={{ marginTop: 16 }}>
        <SectionCard
          title="Nhiệm vụ quá hạn cần xử lý"
          subtitle="Ưu tiên các mục đã quá hạn hoặc cần escalte theo dõi"
          action={
            <span className="button" aria-hidden="true">
              <FileWarning size={16} />
              {String(overdueTasks.length).padStart(2, "0")} mục
            </span>
          }
        >
          <AlertList
            items={overdueTasks.map((task) => ({
              title: `${task.code} · ${task.title}`,
              meta: `${task.assignee} · ${task.unit} · ${task.dueLabel}`
            }))}
          />
        </SectionCard>

        <SectionCard
          title="Nhiệm vụ cần lãnh đạo chỉ đạo"
          subtitle="Các nhiệm vụ có phụ thuộc phê duyệt hoặc cần ý kiến điều hành"
          action={
            <span className="button" aria-hidden="true">
              <Flag size={16} />
              {String(leadershipTasks.length).padStart(2, "0")} mục
            </span>
          }
        >
          <AlertList
            items={leadershipTasks.map((task) => ({
              title: `${task.code} · ${task.title}`,
              meta: task.leadershipNote ?? `${task.assignee} · ${task.dueLabel}`
            }))}
          />
        </SectionCard>
      </div>

      <div className="grid two-column" style={{ marginTop: 16 }}>
        <SectionCard
          title="Tải công việc theo đơn vị"
          subtitle="Mỗi cột thể hiện số lượng nhiệm vụ đang theo dõi của từng đơn vị phụ trách"
          action={
            <span className="button" aria-hidden="true">
              <ListFilter size={16} />
              Cập nhật theo số liệu hiện có
            </span>
          }
        >
          {renderWorkloadChart()}
        </SectionCard>

        <SectionCard
          title="Luồng xử lý nhiệm vụ"
          subtitle="Theo dõi nhanh nhiệm vụ theo các nhóm trạng thái chính"
          action={
            <button className="button" type="button">
              <RefreshCcw size={16} aria-hidden="true" />
              Làm mới bố cục
            </button>
          }
        >
          {renderKanban()}
        </SectionCard>
      </div>
    </>
  );
}
