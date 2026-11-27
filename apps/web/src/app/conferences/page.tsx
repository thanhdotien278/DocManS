import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { ConferenceList } from "@/components/conferences/conference-list";

export default function ConferencesPage() {
  return <><Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Hội nghị khoa học" }]} /><PageHeader eyebrow="Hội nghị" title="Hội nghị khoa học" description="Tạo hội nghị, giao chuyên viên phụ trách, mời nhà khoa học và theo dõi tóm tắt, toàn văn." /><ConferenceList /></>;
}
