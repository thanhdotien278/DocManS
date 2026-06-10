import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";

export default function UsersPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Quản trị" }, { label: "Người dùng" }]} />
      <PageHeader
        eyebrow="Quản trị truy cập"
        title="Người dùng, vai trò và phạm vi đơn vị"
        description="Tạo tài khoản nội bộ, khóa hoặc mở tài khoản, và gán vai trò cùng phạm vi dữ liệu theo đơn vị."
      />
      <AdminUsersPanel />
    </>
  );
}
