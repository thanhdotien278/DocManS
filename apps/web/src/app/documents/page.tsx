import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { ScientificDocumentsPanel } from "@/components/documents/scientific-documents-panel";

export default function DocumentsPage() {
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Văn bản & Biểu mẫu" }
        ]}
      />
      <PageHeader
        eyebrow="Tài liệu & Biểu mẫu KH&CN"
        title="Văn bản & Biểu mẫu"
        description="Hệ thống văn bản quy phạm pháp luật, quy chế quản lý khoa học công nghệ và các biểu mẫu chuẩn phục vụ nghiên cứu viên và hội đồng chuyên môn."
      />
      <ScientificDocumentsPanel />
    </>
  );
}
