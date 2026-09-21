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
        description="Theo dõi hồ sơ được phân công, tiến độ phản biện và kết quả tổng hợp trong phạm vi được cấp quyền."
      />
      <ResearchProposalsPanel allowCreate={false} />
    </>
  );
}
