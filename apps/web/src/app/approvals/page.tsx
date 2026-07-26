import { ApprovalQueuePanel } from "@/components/research-proposals/approval-queue-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";

export default function ApprovalsPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Hồ sơ chờ phê duyệt" }]} />
      <PageHeader
        eyebrow="Phê duyệt"
        title="Hồ sơ chờ phê duyệt"
        description="Hồ sơ đã hoàn tất đánh giá và tổng hợp, sẵn sàng cho quyết định phê duyệt hoặc từ chối."
      />
      <ApprovalQueuePanel />
    </>
  );
}
