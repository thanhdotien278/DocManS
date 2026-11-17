import { ResearchProposalsPanel } from "@/components/research-proposals/research-proposals-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";

export default function ReviewsPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Đánh giá hồ sơ" }]} />
      <PageHeader
        eyebrow="Quản lý khoa học"
        title="Đánh giá hồ sơ"
        description="Mở sẵn danh sách hồ sơ chờ kiểm tra đầy đủ; đổi bộ lọc Công việc đánh giá để xem các bước khác."
      />
      <ResearchProposalsPanel allowCreate={false} initialReviewQueue="recheck" />
    </>
  );
}
