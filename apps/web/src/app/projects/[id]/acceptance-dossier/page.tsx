import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { AcceptanceDossierWorkspace } from "@/components/projects/acceptance-dossier-workspace";

export default async function AcceptanceDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Theo dõi đề tài", href: "/projects" }, { label: "Chi tiết đề tài", href: `/projects/${id}` }, { label: "Hồ sơ nghiệm thu" }]} /><PageHeader eyebrow="Thực hiện đề tài" title="Hồ sơ nghiệm thu" description="Soạn 4 mục, đối chiếu mốc, tải tệp đính kèm và nộp hồ sơ để chuyển đề tài sang chờ nghiệm thu." /><AcceptanceDossierWorkspace projectId={id} /></>;
}
