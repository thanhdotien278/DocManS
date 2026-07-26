/**
 * ST-3.0 — Proposal participation model and conflict-of-interest primitives.
 *
 * Pure policy layer. It resolves the record-scoped participation role a user holds on one
 * proposal and evaluates the single conflict-of-interest rule shared by reviewer assignment
 * (ST-3.2) and approval decisions (ST-3.5). It never reads the account-level system role:
 * participation is a property of the record relationship only (AUTH-ST-3.0-02).
 */

export type ProposalParticipationRole = "principal-investigator" | "secretary" | "member" | "none" | "unknown";

export type ProposalConflictReasonCode = "no-conflict" | "participation" | "unresolved";

export type ParticipationMemberSource = {
  userId?: string | null;
  participationRole?: string | null;
};

export type ProposalParticipation = {
  /** Highest-precedence relationship the user holds on this proposal. */
  role: ProposalParticipationRole;
  label: string;
  /** Every relationship the user holds, highest precedence first. */
  roles: ProposalParticipationRole[];
  labels: string[];
  isOwner: boolean;
  isParticipant: boolean;
};

export type ProposalConflictDecision = {
  conflicted: boolean;
  role: ProposalParticipationRole;
  reasonCode: ProposalConflictReasonCode;
  /** Neutral statement about the candidate, for audit and for assignment screens. */
  reason: string;
  /** Second-person statement for the viewer, so a blocked control can explain itself (UX-DR27). */
  viewerMessage: string;
};

export const PROPOSAL_PARTICIPATION_ROLE_LABELS: Record<ProposalParticipationRole, string> = {
  "principal-investigator": "Chủ nhiệm",
  secretary: "Thư ký",
  member: "Thành viên",
  none: "Không tham gia",
  unknown: "Chưa xác định"
};

/** Assignable participation roles, ordered by precedence when a user holds several. */
export const PROPOSAL_PARTICIPATION_ROLES: ProposalParticipationRole[] = ["principal-investigator", "secretary", "member"];

const CONFLICT_REASONS: Record<string, { reason: string; viewerMessage: string }> = {
  "principal-investigator": {
    reason: "Người dùng là chủ nhiệm của hồ sơ này.",
    viewerMessage: "Bạn là chủ nhiệm hồ sơ này nên không thể phê duyệt hoặc đánh giá hồ sơ."
  },
  secretary: {
    reason: "Người dùng là thư ký của hồ sơ này.",
    viewerMessage: "Bạn là thư ký của hồ sơ này nên không thể phê duyệt hoặc đánh giá hồ sơ."
  },
  member: {
    reason: "Người dùng là thành viên tham gia hồ sơ này.",
    viewerMessage: "Bạn đang tham gia hồ sơ này nên không thể phê duyệt hoặc đánh giá hồ sơ."
  }
};

const UNRESOLVED_CONFLICT = {
  reason: "Không xác định được quan hệ của người dùng với hồ sơ này.",
  viewerMessage: "Không xác định được quan hệ của bạn với hồ sơ này nên thao tác bị chặn để bảo đảm an toàn."
};

const UNKNOWN_PARTICIPATION: ProposalParticipation = {
  role: "unknown",
  label: PROPOSAL_PARTICIPATION_ROLE_LABELS.unknown,
  roles: [],
  labels: [],
  isOwner: false,
  isParticipant: false
};

function foldVietnamese(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/**
 * Maps a stored or submitted participation role onto a canonical code. Accepts the canonical
 * codes and the Vietnamese descriptive labels the intake form already collects, so proposals
 * created before ST-3.0 still classify. Anything unrecognised falls back to `member`, which is
 * the least-privileged assignable role and still triggers the conflict rule.
 */
export function normalizeParticipationRole(value: unknown): ProposalParticipationRole {
  if (typeof value !== "string") {
    return "member";
  }

  const normalized = foldVietnamese(value);
  if (!normalized) {
    return "member";
  }

  if (normalized === "principal-investigator" || normalized.includes("chu nhiem")) {
    return "principal-investigator";
  }

  if (normalized === "secretary" || normalized.includes("thu ky")) {
    return "secretary";
  }

  return "member";
}

export function getParticipationRoleLabel(role: ProposalParticipationRole) {
  return PROPOSAL_PARTICIPATION_ROLE_LABELS[role] ?? PROPOSAL_PARTICIPATION_ROLE_LABELS.unknown;
}

/**
 * Resolves what `userId` is on this specific proposal (AC-ST-3.0-02, AC-ST-3.0-03).
 * Returns `unknown` — not `none` — when the participation context itself cannot be read, so
 * callers that gate on it stay fail-closed (TN-ST-3.0-03).
 */
export function resolveProposalParticipation(input: {
  userId?: string | null;
  proposal?: { ownerId?: string | null } | null;
  members?: ParticipationMemberSource[] | null;
}): ProposalParticipation {
  const userId = typeof input.userId === "string" ? input.userId.trim() : "";
  if (!userId || !input.proposal || !input.members) {
    return UNKNOWN_PARTICIPATION;
  }

  const isOwner = input.proposal.ownerId === userId;
  const roles = new Set<ProposalParticipationRole>();
  if (isOwner) {
    roles.add("principal-investigator");
  }

  for (const member of input.members) {
    if (member?.userId && member.userId === userId) {
      roles.add(normalizeParticipationRole(member.participationRole));
    }
  }

  const ordered = PROPOSAL_PARTICIPATION_ROLES.filter((role) => roles.has(role));
  if (ordered.length === 0) {
    return {
      role: "none",
      label: PROPOSAL_PARTICIPATION_ROLE_LABELS.none,
      roles: [],
      labels: [],
      isOwner: false,
      isParticipant: false
    };
  }

  return {
    role: ordered[0]!,
    label: getParticipationRoleLabel(ordered[0]!),
    roles: ordered,
    labels: ordered.map(getParticipationRoleLabel),
    isOwner,
    isParticipant: true
  };
}

/**
 * The one shared conflict primitive (AC-ST-3.0-04). Principal investigator, secretary and
 * member all conflict. An unresolved participation context conflicts as well, so a caller that
 * cannot read participation blocks rather than silently permitting the action.
 */
export function evaluateProposalConflict(participation?: ProposalParticipation | null): ProposalConflictDecision {
  if (!participation || participation.role === "unknown") {
    return {
      conflicted: true,
      role: "unknown",
      reasonCode: "unresolved",
      ...UNRESOLVED_CONFLICT
    };
  }

  if (participation.role === "none") {
    return {
      conflicted: false,
      role: "none",
      reasonCode: "no-conflict",
      reason: "",
      viewerMessage: ""
    };
  }

  const messages = CONFLICT_REASONS[participation.role] ?? UNRESOLVED_CONFLICT;
  return {
    conflicted: true,
    role: participation.role,
    reasonCode: "participation",
    ...messages
  };
}
