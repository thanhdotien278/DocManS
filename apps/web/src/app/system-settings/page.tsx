import { AdminConfigPanel } from "@/components/admin/admin-config-panel";
import { AdminCouncilConfigPanel } from "@/components/admin/admin-council-config-panel";
import { AdminParticipantPolicyPanel } from "@/components/admin/admin-participant-policy-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";

export default function SystemSettingsPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Quản trị" }, { label: "Cấu hình hệ thống" }]} />
      <PageHeader
        eyebrow="Cấu hình nền"
        title="Tham số hệ thống"
        description="Cập nhật cấu hình hội đồng, quyền tham gia hồ sơ và các tham số vận hành hệ thống."
      />
      <AdminCouncilConfigPanel />
      <AdminParticipantPolicyPanel />
      <AdminConfigPanel />
    </>
  );
}
