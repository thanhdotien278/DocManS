import { RegistrationRequestsPanel } from "@/components/registration/registration-requests-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";

export default function RegistrationRequestsPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Quản lý khoa học" }, { label: "Yêu cầu đăng ký" }]} />
      <PageHeader
        eyebrow="Tài khoản nhà nghiên cứu"
        title="Yêu cầu đăng ký tài khoản"
        description="Duyệt hoặc từ chối tài khoản tự đăng ký đã xác minh email. Khi duyệt, chọn đơn vị quản lý để tạo hồ sơ nhà khoa học."
      />
      <RegistrationRequestsPanel />
    </>
  );
}
