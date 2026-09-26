import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectList } from "@/components/projects/project-list";

export default function MyProjectsPage() { return <><Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Đề tài của tôi" }]} /><PageHeader eyebrow="Đề tài cá nhân" title="Đề tài đang thực hiện" description="Theo dõi tiến độ, nộp báo cáo và gửi yêu cầu điều chỉnh hoặc gia hạn." /><ProjectList mine /></>; }
