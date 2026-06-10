import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { ProposalIntakePeriodsPanel } from "@/components/proposal-intake-periods/proposal-intake-periods-panel";

export default function IntakePeriodsPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Đợt tiếp nhận" }]} />
      <PageHeader
        eyebrow="Tiếp nhận"
        title="Đợt tiếp nhận hồ sơ"
        description="Quản lý khung thời gian, phạm vi áp dụng và danh sách tài liệu bắt buộc cho quy trình nộp hồ sơ đề tài."
      />
      <ProposalIntakePeriodsPanel />
    </>
  );
}
