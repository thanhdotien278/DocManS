import { AdminCatalogsPanel } from "@/components/admin/admin-catalogs-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";

export default function CatalogsPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Quản trị" }, { label: "Danh mục" }]} />
      <PageHeader
        eyebrow="Danh mục nền"
        title="Catalog dùng chung"
        description="Quản lý lĩnh vực nghiên cứu, loại hồ sơ, mức ưu tiên, loại báo cáo và tiêu chí chấm điểm."
      />
      <AdminCatalogsPanel />
    </>
  );
}
