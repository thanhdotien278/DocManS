import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { ResearchProposalsPanel } from "@/components/research-proposals/research-proposals-panel";

export default function NewProposalPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Hồ sơ của tôi", href: "/my-proposals" }, { label: "Tạo hồ sơ" }]} />
      <PageHeader eyebrow="Hồ sơ cá nhân" title="Tạo hồ sơ đề xuất" description="Lưu bản nháp trước khi hoàn thiện tài liệu và nộp chính thức." />
      <ResearchProposalsPanel allowCreate creationOnly />
    </>
  );
}
