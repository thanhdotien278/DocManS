import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { StudentProfilePanel } from "@/components/student-research/student-profile-panel";

export default function StudentProfilePage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Hồ sơ sinh viên" }]} />
      <PageHeader eyebrow="Sinh viên NCKH" title="Hồ sơ sinh viên" description="Bổ sung mã sinh viên, lớp, số điện thoại và điểm tổng kết học kỳ trước. Cần đủ thông tin này trước khi đăng ký hoặc tham gia đề tài." />
      <StudentProfilePanel />
    </>
  );
}
