import { statusMeta } from "@/lib/status";

export function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta[status] ?? statusMeta.draft;
  const Icon = meta.Icon;

  return (
    <span className={`status-badge ${meta.tone}`}>
      <Icon size={13} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  const labels = {
    high: "Ưu tiên cao",
    medium: "Ưu tiên vừa",
    low: "Ưu tiên thấp"
  };

  return <span className={`priority-badge ${priority}`}>{labels[priority]}</span>;
}
