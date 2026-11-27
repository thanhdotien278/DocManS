import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { MyConferences } from "@/components/conferences/my-conferences";

export default function MyConferencesPage() {
  return <><Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Hội nghị của tôi" }]} /><PageHeader eyebrow="Hội nghị" title="Hội nghị của tôi" description="Trả lời thư mời; báo cáo viên nộp tóm tắt và toàn văn báo cáo tham luận trước hạn." /><MyConferences /></>;
}
