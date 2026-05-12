import Link from "next/link";
import { Eye, Plus } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { proposals } from "@/lib/app-data";

export default function ProposalsPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Bảng điều hành", href: "/dashboard" }, { label: "Quản lý đề tài" }]} />
      <PageHeader
        eyebrow="Quản lý đề tài"
        title="Danh sách hồ sơ đề tài"
        description="Theo dõi hồ sơ theo mã, chủ nhiệm, đơn vị, đợt tiếp nhận và trạng thái nghiệp vụ."
        actions={
          <button className="button primary" type="button">
            <Plus size={17} aria-hidden="true" />
            Tạo hồ sơ mới
          </button>
        }
      />

      <SectionCard title="Bộ lọc hồ sơ" subtitle="Tập trung các hồ sơ cần xử lý theo trạng thái và đợt tiếp nhận">
        <FilterBar
          searchPlaceholder="Nhập mã hồ sơ, tên đề tài, chủ nhiệm..."
          filters={[
            {
              label: "Trạng thái",
              value: "status",
              options: ["Chờ phê duyệt", "Đang đánh giá", "Cần bổ sung", "Đã nộp"]
            },
            {
              label: "Đơn vị",
              value: "unit",
              options: ["Khoa Chấn thương chỉnh hình", "Bộ môn Sinh lý bệnh", "Phòng QLKH"]
            },
            {
              label: "Đợt tiếp nhận",
              value: "intake",
              options: ["Đợt 1/2026", "Đợt 2/2026"]
            }
          ]}
        />

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã hồ sơ</th>
                <th>Tên đề tài</th>
                <th>Chủ nhiệm</th>
                <th>Đơn vị</th>
                <th>Đợt</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal) => (
                <tr key={proposal.id}>
                  <td>
                    <Link className="record-title" href={`/proposals/${proposal.id}`}>
                      {proposal.code}
                    </Link>
                    <span className="record-meta">Nộp {proposal.submittedAt}</span>
                  </td>
                  <td>
                    <span className="record-title">{proposal.title}</span>
                    <span className="record-meta">Hạn xử lý {proposal.dueDate}</span>
                  </td>
                  <td>{proposal.owner}</td>
                  <td>{proposal.unit}</td>
                  <td>{proposal.intakePeriod}</td>
                  <td>
                    <StatusBadge status={proposal.status} />
                  </td>
                  <td>
                    <Link className="button" href={`/proposals/${proposal.id}`}>
                      <Eye size={16} aria-hidden="true" />
                      Xem
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-list">
          {proposals.map((proposal) => (
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
              <span className="record-meta">
                {proposal.owner} - {proposal.unit}
              </span>
              <Link className="button" href={`/proposals/${proposal.id}`}>
                <Eye size={16} aria-hidden="true" />
                Xem chi tiết
              </Link>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
