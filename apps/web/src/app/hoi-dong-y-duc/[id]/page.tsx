import { notFound } from "next/navigation";
import { EthicsDetailView } from "@/components/ethics/ethics-detail-view";
import { getEthicsRecordById } from "@/lib/ethics-data";

export default async function EthicsCouncilDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = getEthicsRecordById(id);

  if (!record) {
    notFound();
  }

  return <EthicsDetailView record={record} />;
}
