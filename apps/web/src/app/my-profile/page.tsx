import { PageHeader } from "@/components/ui/page-header";
import { ScientificCvWorkspace } from "@/components/researcher-profiles/scientific-cv/cv-workspace";

export default function MyProfilePage() {
  return <><PageHeader eyebrow="Nhà nghiên cứu" title="Hồ sơ của tôi" description="Cập nhật thông tin cá nhân, học thuật, công bố và quá trình tham gia nghiên cứu." /><ScientificCvWorkspace target="my-profile" /></>;
}
