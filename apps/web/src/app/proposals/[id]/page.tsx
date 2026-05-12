import Link from "next/link";
import { CheckCircle2, FileText, Send, XCircle } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timeline } from "@/components/ui/timeline";
import { getProposalById, submittedFiles, timeline } from "@/lib/app-data";

export default async function ProposalDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proposal = getProposalById(id) ?? getProposalById("hvqy-2026-001");

  if (!proposal) {
    return null;
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Bảng điều hành", href: "/dashboard" },
          { label: "Quản lý đề tài", href: "/proposals" },
          { label: proposal.code }
        ]}
      />
      <PageHeader
        eyebrow="Chi tiết hồ sơ"
        title={proposal.title}
        description="Tổng hợp thông tin hồ sơ, lịch sử xử lý, tệp đính kèm và các hành động nghiệp vụ liên quan."
        actions={<StatusBadge status={proposal.status} />}
      />

      <div className="grid two-column">
        <div className="grid">
          <SectionCard title="Thông tin chung" subtitle="Thông tin đăng ký và lịch sử tiếp nhận hồ sơ">
            <div className="meta-grid">
              <div className="meta-item">
                <span className="meta-label">Mã hồ sơ</span>
                <span className="meta-value">{proposal.code}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Chủ nhiệm</span>
                <span className="meta-value">{proposal.owner}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Đơn vị chủ trì</span>
                <span className="meta-value">{proposal.unit}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Đợt tiếp nhận</span>
                <span className="meta-value">{proposal.intakePeriod}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Ngày nộp</span>
                <span className="meta-value">{proposal.submittedAt}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Hạn xử lý</span>
                <span className="meta-value">{proposal.dueDate}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Timeline xử lý" subtitle="Truy vết trạng thái và người thực hiện">
            <Timeline items={timeline} />
          </SectionCard>

          <SectionCard title="Tệp đã nộp" subtitle="Danh mục tài liệu kèm theo hồ sơ">
            <div className="file-list">
              {submittedFiles.map((file) => (
                <article className="file-item" key={file.name}>
                  <span className="file-icon">
                    <FileText size={17} aria-hidden="true" />
                  </span>
                  <div>
                    <span className="record-title">{file.name}</span>
                    <span className="record-meta">{file.meta}</span>
                  </div>
                  <button className="button" type="button">
                    Xem trước
                  </button>
                </article>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="grid">
          <SectionCard title="Hành động quy trình" subtitle="Xử lý theo thẩm quyền của người dùng hiện hành">
            <div className="button-row">
              <button className="button" type="button">
                <Send size={16} aria-hidden="true" />
                Yêu cầu bổ sung
              </button>
              <button className="button" type="button">
                <FileText size={16} aria-hidden="true" />
                Chuyển đánh giá
              </button>
              <button className="button primary" type="button">
                <CheckCircle2 size={16} aria-hidden="true" />
                Phê duyệt
              </button>
              <button className="button danger" type="button">
                <XCircle size={16} aria-hidden="true" />
                Từ chối
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Đánh giá và phê duyệt" subtitle="Tổng hợp nhận xét, điểm số và kết luận xử lý">
            <EmptyState
              title="Thông tin đánh giá đang được cập nhật"
              message="Khu vực này sử dụng để hiển thị nhận xét hội đồng, điểm chấm và quyết định xử lý theo hồ sơ."
            />
          </SectionCard>

          <SectionCard title="Điều hướng nhanh" subtitle="Quay lại các màn hình nghiệp vụ liên quan">
            <div className="button-row">
              <Link className="button" href="/dashboard">
                Bảng điều hành
              </Link>
              <Link className="button" href="/proposals">
                Danh sách hồ sơ
              </Link>
              <Link className="button" href="/nhiem-vu">
                Quản lý nhiệm vụ
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
