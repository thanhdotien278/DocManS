import { PageHeader } from "@/components/ui/page-header";
import { ResearcherProfilesPanel } from "@/components/researcher-profiles/researcher-profiles-panel";

export default function MyProfilePage() {
  return <><PageHeader eyebrow="Nhà nghiên cứu" title="Hồ sơ của tôi" description="Cập nhật thông tin cá nhân, học thuật, công bố và quá trình tham gia nghiên cứu." /><ResearcherProfilesPanel self /></>;
}
