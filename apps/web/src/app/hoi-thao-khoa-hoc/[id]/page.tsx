import { notFound } from "next/navigation";
import { ConferenceDetailView } from "@/components/conferences/conference-detail-view";
import { getConferenceById } from "@/lib/conference-data";

export default async function ScientificConferenceDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = getConferenceById(id);

  if (!record) {
    notFound();
  }

  return <ConferenceDetailView record={record} />;
}
