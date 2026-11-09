import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { EthicsDossierWorkspace } from "@/components/projects/ethics-dossier-workspace";

export default async function EthicsDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Theo dõi đề tài", href: "/projects" }, { label: "Chi tiết đề tài", href: `/projects/${id}` }, { label: "Hồ sơ đạo đức" }]} /><PageHeader eyebrow="Thực hiện đề tài" title="Hồ sơ đạo đức (IRB)" description="Soạn 6 mục, tải tệp đính kèm và nộp hồ sơ cho hội đồng đạo đức." /><EthicsDossierWorkspace projectId={id} /></>;
}
