import Link from "next/link";
import { ArrowRight, FileText, ListChecks } from "lucide-react";
import { AlertList } from "@/components/ui/alert-list";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { proposals, tasks } from "@/lib/mock-data";

export default function DashboardPage() {
  const pendingApprovals = proposals.filter((proposal) => proposal.status === "pending-approval");
  const overdueTasks = tasks.filter((task) => task.status === "overdue");

  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard" }]} />
      <PageHeader
        eyebrow="Điều hành"
        title="Dashboard lãnh đạo"
        description="Tổng quan mô phỏng các hồ sơ chờ xử lý, nhiệm vụ quá hạn, đề tài có rủi ro và mốc báo cáo sắp tới trong phạm vi Học viện Quân y."
        actions={
          <Link className="button primary" href="/proposals">
            <FileText size={17} aria-hidden="true" />
            Xem hồ sơ
          </Link>
        }
      />

      <div className="grid kpi-grid" style={{ marginBottom: 16 }}>
        <KpiCard label="Chờ phê duyệt" value="08" meta="3 hồ sơ cần xử lý trong hôm nay" tone="warning" />
        <KpiCard label="Công việc quá hạn" value="05" meta="2 nhiệm vụ thuộc Phòng QLKH" tone="danger" />
        <KpiCard label="Đề tài chậm tiến độ" value="03" meta="Có 1 đề tài cần can thiệp" tone="info" />
        <KpiCard label="Báo cáo sắp đến hạn" value="12" meta="7 ngày tới" />
      </div>

      <div className="grid two-column">
        <SectionCard
          title="Hồ sơ chờ phê duyệt"
          subtitle="Ưu tiên theo hạn xử lý và trạng thái hiện tại"
          action={
            <Link className="button" href="/proposals">
              Xem tất cả
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          }
        >
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã hồ sơ</th>
                  <th>Tên đề tài</th>
                  <th>Đơn vị</th>
                  <th>Trạng thái</th>
                  <th>Hạn xử lý</th>
                </tr>
              </thead>
              <tbody>
                {proposals.slice(0, 3).map((proposal) => (
                  <tr key={proposal.id}>
                    <td>
                      <Link className="record-title" href={`/proposals/${proposal.id}`}>
                        {proposal.code}
                      </Link>
                    </td>
                    <td>
                      <span className="record-title">{proposal.title}</span>
                      <span className="record-meta">{proposal.owner}</span>
                    </td>
                    <td>{proposal.unit}</td>
                    <td>
                      <StatusBadge status={proposal.status} />
                    </td>
                    <td>{proposal.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mobile-list">
            {pendingApprovals.map((proposal) => (
              <article className="list-card" key={proposal.id}>
                <div className="list-card-header">
                  <div>
                    <Link className="record-title" href={`/proposals/${proposal.id}`}>
                      {proposal.code}
                    </Link>
                    <span className="record-meta">{proposal.title}</span>
                  </div>
                  <StatusBadge status={proposal.status} />
                </div>
                <span className="record-meta">{proposal.unit} - hạn {proposal.dueDate}</span>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Cảnh báo ưu tiên" subtitle="Các tín hiệu cần xử lý hoặc theo dõi">
          <AlertList
            items={[
              {
                title: "Reviewer quá hạn đánh giá HVQY-2026-014",
                meta: "Quá hạn 1 ngày - cần nhắc xử lý"
              },
              {
                title: "Hồ sơ HVQY-2026-001 chờ quyết định",
                meta: "Đã tổng hợp đánh giá - hạn phê duyệt 30/04/2026"
              },
              {
                title: "Báo cáo tiến độ quý II sắp đến hạn",
                meta: "12 báo cáo cần theo dõi trong 7 ngày tới"
              }
            ]}
          />
        </SectionCard>
      </div>

      <div className="grid two-column" style={{ marginTop: 16 }}>
        <SectionCard title="Xu hướng xử lý theo đơn vị" subtitle="Biểu đồ demo dùng dữ liệu mô phỏng">
          <div className="chart-placeholder" aria-label="Biểu đồ mô phỏng số hồ sơ theo đơn vị">
            {[
              ["Ngoại", "150px"],
              ["Nội", "112px"],
              ["CLS", "136px"],
              ["Mô phỏng", "82px"],
              ["QLKH", "168px"]
            ].map(([label, height]) => (
              <div className="chart-bar" key={label}>
                <span style={{ height }} />
                <strong>{label}</strong>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Công việc quá hạn"
          subtitle={`${overdueTasks.length} nhiệm vụ đang cần can thiệp`}
          action={
            <Link className="button" href="/tasks">
              <ListChecks size={16} aria-hidden="true" />
              Mở giao việc
            </Link>
          }
        >
          <AlertList
            items={tasks.slice(0, 3).map((task) => ({
              title: task.title,
              meta: `${task.assignee} - ${task.dueDate}`
            }))}
          />
        </SectionCard>
      </div>
    </>
  );
}
