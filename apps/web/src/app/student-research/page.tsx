import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { StudentResearchPanel } from "@/components/student-research/student-research-panel";

export default function StudentResearchPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Sinh viên NCKH" }]} />
      <PageHeader
        eyebrow="Sinh viên NCKH"
        title="Sinh viên nghiên cứu khoa học"
        description="Đợt nghiên cứu khoa học sinh viên hằng năm: đăng ký đề tài, nộp tài liệu, chấm điểm và xếp giải."
      />
      <StudentResearchPanel />
    </>
  );
}
