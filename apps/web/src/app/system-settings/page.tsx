import { AdminConfigPanel } from "@/components/admin/admin-config-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";

export default function SystemSettingsPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Quản trị" }, { label: "Cấu hình hệ thống" }]} />
      <PageHeader
        eyebrow="Cấu hình nền"
        title="Tham số và mẫu thông báo"
        description="Cập nhật tham số vận hành và skeleton mẫu thông báo dùng cho hệ thống nội bộ."
      />
      <AdminConfigPanel />
    </>
  );
}
