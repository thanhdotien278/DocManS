import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { ResearchProposalsPanel } from "@/components/research-proposals/research-proposals-panel";

export default function MyProposalsPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Hồ sơ của tôi" }]} />
      <PageHeader
        eyebrow="Hồ sơ cá nhân"
        title="Hồ sơ đề xuất của tôi"
        description="Tạo hồ sơ nháp, lưu thông tin có cấu trúc và theo dõi trạng thái nộp chính thức."
      />
      <ResearchProposalsPanel allowCreate />
    </>
  );
}
