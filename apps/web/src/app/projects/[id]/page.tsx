import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectDetail } from "@/components/projects/project-detail";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Theo dõi đề tài", href: "/projects" }, { label: "Chi tiết đề tài" }]} /><PageHeader eyebrow="Thực hiện đề tài" title="Chi tiết đề tài" description="Theo dõi mốc, nộp báo cáo và xử lý yêu cầu theo quyền trên đề tài." /><ProjectDetail id={id} /></>;
}
