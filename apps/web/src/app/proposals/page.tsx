import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { ResearchProposalsPanel } from "@/components/research-proposals/research-proposals-panel";

export default function ProposalsPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Quản lý đề tài" }]} />
      <PageHeader
        eyebrow="OMS"
        title="Danh sách hồ sơ đề tài"
        description="Theo dõi hồ sơ theo đợt tiếp nhận, trạng thái, thời gian thực hiện và lịch sử nộp."
      />
      <ResearchProposalsPanel allowCreate={false} />
    </>
  );
}
