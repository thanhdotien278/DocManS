import { AdminRolesPanel } from "@/components/admin/admin-reference-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";

export default function RolesPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Quản trị" }, { label: "Vai trò" }]} />
      <PageHeader
        eyebrow="Khung phân quyền"
        title="Vai trò hệ thống"
        description="Theo dõi các vai trò dùng để gán quyền nền và xác định phạm vi hành động trong hệ thống."
      />
      <AdminRolesPanel />
    </>
  );
}
