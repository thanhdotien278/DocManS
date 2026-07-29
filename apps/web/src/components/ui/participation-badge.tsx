import { HelpCircle, Minus, UserCheck, UserCog, Users } from "lucide-react";
import type { StatusTone } from "@/lib/status";
import type { ProposalParticipationRole } from "@/lib/research-proposals-api";

/**
 * States the viewer's role on one record (UX-DR26). The label always comes from the backend's
 * record-scoped resolution — never from the account-level system role.
 */
const participationMeta: Record<ProposalParticipationRole, { label: string; tone: StatusTone; Icon: typeof UserCheck }> = {
  "principal-investigator": { label: "Chủ nhiệm", tone: "info", Icon: UserCheck },
  secretary: { label: "Thư ký", tone: "info", Icon: UserCog },
  member: { label: "Thành viên", tone: "neutral", Icon: Users },
  none: { label: "Không tham gia", tone: "neutral", Icon: Minus },
  unknown: { label: "Chưa xác định", tone: "warning", Icon: HelpCircle }
};

export function ParticipationBadge({ role, label }: { role?: ProposalParticipationRole; label?: string }) {
  const meta = participationMeta[role ?? "unknown"] ?? participationMeta.unknown;
  const Icon = meta.Icon;

  return (
    <span className={`status-badge ${meta.tone}`} title="Vai trò của bạn với hồ sơ này">
      <Icon size={13} aria-hidden="true" />
      {label || meta.label}
    </span>
  );
}
