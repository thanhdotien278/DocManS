import { ClipboardCheck } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { PriorityBadge, StatusBadge } from "@/components/ui/status-badge";
import { tasks } from "@/fixtures/showcase-data";

export default function TasksPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Giao việc" }]} />
      <PageHeader
        eyebrow="Theo dõi công việc"
        title="Danh sách nhiệm vụ"
        description="Theo dõi nhiệm vụ theo mức ưu tiên, người phụ trách, hạn xử lý và trạng thái thực hiện."
        actions={
          <button className="button primary" type="button">
            <ClipboardCheck size={17} aria-hidden="true" />
            Tạo nhiệm vụ mới
          </button>
        }
      />

      <SectionCard title="Bộ lọc nhiệm vụ" subtitle="Ưu tiên công việc cần xử lý trong ngày">
        <FilterBar
          searchPlaceholder="Nhập tên nhiệm vụ, mã hồ sơ, người phụ trách..."
          filters={[
            { label: "Trạng thái", value: "status", options: ["Chờ phê duyệt", "Quá hạn", "Cần bổ sung", "Nháp"] },
            { label: "Ưu tiên", value: "priority", options: ["Cao", "Vừa", "Thấp"] },
            { label: "Người phụ trách", value: "assignee", options: ["Phòng QLKH", "CN. Vũ Lan", "ThS. Hoàng Mai"] }
          ]}
        />

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Nhiệm vụ</th>
                <th>Bản ghi liên quan</th>
                <th>Người phụ trách</th>
                <th>Ưu tiên</th>
                <th>Hạn xử lý</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <span className="record-title">{task.id}</span>
                  </td>
                  <td>
                    <span className="record-title">{task.title}</span>
                  </td>
                  <td>{task.linkedRecord}</td>
                  <td>{task.assignee}</td>
                  <td>
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td>{task.dueDate}</td>
                  <td>
                    <StatusBadge status={task.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-list">
          {tasks.map((task) => (
            <article className="list-card" key={task.id}>
              <div className="list-card-header">
                <div>
                  <span className="record-title">{task.title}</span>
                  <span className="record-meta">
                    {task.id} - {task.linkedRecord}
                  </span>
                </div>
                <StatusBadge status={task.status} />
              </div>
              <span className="record-meta">
                {task.assignee} - hạn {task.dueDate}
              </span>
              <PriorityBadge priority={task.priority} />
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
