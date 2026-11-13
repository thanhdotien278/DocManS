import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { AcceptanceCouncilPanel } from "@/components/projects/acceptance-council-panel";

export default async function AcceptanceCouncilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Theo dõi đề tài", href: "/projects" }, { label: "Chi tiết đề tài", href: `/projects/${id}` }, { label: "Hội đồng nghiệm thu" }]} /><PageHeader eyebrow="Nghiệm thu đề tài" title="Hội đồng nghiệm thu" description="Mời thành viên, trình ký thành lập hội đồng, nhận lời mời và ghi kết quả nghiệm thu." /><AcceptanceCouncilPanel projectId={id} /></>;
}
