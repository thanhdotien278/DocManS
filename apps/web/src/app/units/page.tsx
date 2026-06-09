import { AdminUnitsPanel } from "@/components/admin/admin-reference-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";

export default function UnitsPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Quản trị" }, { label: "Đơn vị" }]} />
      <PageHeader
        eyebrow="Phạm vi dữ liệu"
        title="Đơn vị tổ chức"
        description="Theo dõi đơn vị dùng để gán phạm vi dữ liệu cho tài khoản và kiểm soát truy cập theo tổ chức."
      />
      <AdminUnitsPanel />
    </>
  );
}
