import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { ConferenceDetail } from "@/components/conferences/conference-detail";

export default async function ConferenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Hội nghị khoa học", href: "/conferences" }, { label: "Chi tiết hội nghị" }]} /><PageHeader eyebrow="Hội nghị" title="Chi tiết hội nghị" description="Thông tin, chuyên viên phụ trách, khách mời, thư đã gửi và bài nộp." /><ConferenceDetail id={id} /></>;
}
