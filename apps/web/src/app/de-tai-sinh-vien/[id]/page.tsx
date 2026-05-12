import { notFound } from "next/navigation";
import { StudentResearchDetailView } from "@/components/student-research/student-research-detail-view";
import { getStudentResearchById } from "@/lib/student-research-data";

export default async function StudentResearchDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = getStudentResearchById(id);

  if (!record) {
    notFound();
  }

  return <StudentResearchDetailView record={record} />;
}
