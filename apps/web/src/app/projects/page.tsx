import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectList } from "@/components/projects/project-list";

export default function ProjectsPage() { return <><Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Theo dõi đề tài" }]} /><PageHeader eyebrow="Quản lý đề tài" title="Theo dõi đề tài" description="Tiến độ, mốc thực hiện và yêu cầu theo thẩm quyền trên từng đề tài." /><ProjectList /></>; }
