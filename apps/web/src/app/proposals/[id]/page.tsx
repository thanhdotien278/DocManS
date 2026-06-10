import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { ProposalDetailWorkspace } from "@/components/research-proposals/proposal-detail-workspace";

export default async function ProposalDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Quản lý đề tài", href: "/proposals" },
          { label: "Chi tiết hồ sơ" }
        ]}
      />
      <PageHeader
        eyebrow="Chi tiết hồ sơ"
        title="Hồ sơ đề xuất"
        description="Cập nhật thông tin nháp, tải tài liệu, kiểm tra readiness, nộp chính thức và xem lịch sử nộp."
      />
      <ProposalDetailWorkspace proposalId={id} />
    </>
  );
}
