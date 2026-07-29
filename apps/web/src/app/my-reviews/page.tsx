import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { ReviewerQueuePanel } from "@/components/research-proposals/reviewer-queue-panel";

export default function MyReviewsPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Đánh giá của tôi" }]} />
      <PageHeader
        eyebrow="Nhận xét"
        title="Đánh giá của tôi"
        description="Các hồ sơ bạn được phân công đánh giá, hạn nhận xét và tình trạng phiếu chấm điểm."
      />
      <ReviewerQueuePanel />
    </>
  );
}
