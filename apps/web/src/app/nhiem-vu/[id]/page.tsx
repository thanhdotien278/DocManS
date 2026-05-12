import { notFound } from "next/navigation";
import { TaskDetailView } from "@/components/tasks/task-detail-view";
import { getTaskById } from "@/lib/task-data";

export default async function TaskDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = getTaskById(id);

  if (!task) {
    notFound();
  }

  return <TaskDetailView task={task} />;
}
