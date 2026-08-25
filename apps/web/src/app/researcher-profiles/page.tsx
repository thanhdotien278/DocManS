import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { ResearcherProfilesPanel } from "@/components/researcher-profiles/researcher-profiles-panel";

export default function ResearcherProfilesPage() {
  return <><Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Hồ sơ nhà khoa học" }]} /><PageHeader eyebrow="Epic 2" title="Hồ sơ nhà khoa học" description="Tạo và duy trì hồ sơ học thuật độc lập với tài khoản đăng nhập trong phạm vi tổ chức được cấp." /><ResearcherProfilesPanel /></>;
}
