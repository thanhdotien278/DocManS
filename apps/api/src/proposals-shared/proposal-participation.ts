/**
 * ST-3.0 — Proposal participation model and conflict-of-interest primitives.
 *
 * Pure policy layer. It resolves the record-scoped participation role a user holds on one
 * proposal and evaluates the single conflict-of-interest rule shared by reviewer assignment
 * (ST-3.2) and approval decisions (ST-3.5). It never reads the account-level system role:
 * participation is a property of the record relationship only (AUTH-ST-3.0-02).
 */

export type ProposalParticipationRole = "principal-investigator" | "co-investigator" | "secretary" | "member" | "none" | "unknown";

export type ProposalConflictReasonCode = "no-conflict" | "participation" | "unresolved";

export type ParticipationMemberSource = {
  userId?: string | null;
  participationRole?: string | null;
  createdAt?: Date | null;
  status?: string | null;
  effectiveFrom?: Date | null;
  effectiveUntil?: Date | null;
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
  relationshipEffectiveFrom: Partial<Record<Exclude<ProposalParticipationRole, "none" | "unknown">, string>>;
  relationshipEffectiveUntil: Partial<Record<Exclude<ProposalParticipationRole, "none" | "unknown">, string | null>>;
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
  "co-investigator": "Đồng chủ nhiệm",
  secretary: "Thư ký",
  member: "Thành viên",
  none: "Không tham gia",
  unknown: "Chưa xác định"
};

/** Assignable participation roles, ordered by precedence when a user holds several. */
export const PROPOSAL_PARTICIPATION_ROLES: ProposalParticipationRole[] = ["principal-investigator", "co-investigator", "secretary", "member"];

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
  isParticipant: false,
  relationshipEffectiveFrom: {},
  relationshipEffectiveUntil: {}
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

  if (normalized === "co-investigator" || normalized.includes("dong chu nhiem")) {
    return "co-investigator";
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
 * The source domain supplies lifecycle facts; this shared pure function only evaluates them at
 * the caller's request-wide UTC instant. `effectiveUntil` is exclusive so authority stops at the
 * exact end instant. Unknown statuses and malformed dates fail closed.
 */
export function isRelationshipActiveAt(
  relationship: { status?: string | null; effectiveFrom?: Date | null; effectiveUntil?: Date | null },
  asOf: Date
) {
  // Rows created before the ST-1.9 migration have neither lifecycle column. The migration
  // backfills them from `createdAt`; accepting only this wholly absent legacy shape avoids
  // revoking legitimate history during a rolling deploy while malformed new facts still deny.
  if (relationship.status === undefined && relationship.effectiveFrom === undefined && relationship.effectiveUntil === undefined) {
    return true;
  }
  const effectiveFrom = relationship.effectiveFrom;
  const effectiveUntil = relationship.effectiveUntil;
  return relationship.status === "ACTIVE" &&
    asOf instanceof Date && !Number.isNaN(asOf.valueOf()) &&
    effectiveFrom instanceof Date && !Number.isNaN(effectiveFrom.valueOf()) &&
    effectiveFrom <= asOf &&
    (effectiveUntil === null || effectiveUntil === undefined || (effectiveUntil instanceof Date && !Number.isNaN(effectiveUntil.valueOf()) && asOf < effectiveUntil));
}

/**
 * Resolves what `userId` is on this specific proposal (AC-ST-3.0-02, AC-ST-3.0-03).
 * Returns `unknown` — not `none` — when the participation context itself cannot be read, so
 * callers that gate on it stay fail-closed (TN-ST-3.0-03).
 */
export function resolveProposalParticipation(input: {
  userId?: string | null;
  asOf?: Date;
  proposal?: { ownerId?: string | null; createdAt?: Date | null } | null;
  members?: ParticipationMemberSource[] | null;
}): ProposalParticipation {
  const userId = typeof input.userId === "string" ? input.userId.trim() : "";
  if (!userId || !input.proposal || !input.members) {
    return UNKNOWN_PARTICIPATION;
  }

  const asOf = input.asOf ?? new Date();
  if (Number.isNaN(asOf.valueOf())) return UNKNOWN_PARTICIPATION;
  const isOwner = input.proposal.ownerId === userId;
  const roles = new Set<ProposalParticipationRole>();
  const relationshipEffectiveFrom: ProposalParticipation["relationshipEffectiveFrom"] = {};
  const relationshipEffectiveUntil: ProposalParticipation["relationshipEffectiveUntil"] = {};
  if (isOwner) {
    roles.add("principal-investigator");
    const effectiveFrom = input.proposal.createdAt?.toISOString();
    if (effectiveFrom) relationshipEffectiveFrom["principal-investigator"] = effectiveFrom;
    relationshipEffectiveUntil["principal-investigator"] = null;
  }

  for (const member of input.members) {
    if (member?.userId && member.userId === userId && isRelationshipActiveAt({
      status: member.status,
      effectiveFrom: member.effectiveFrom,
      effectiveUntil: member.effectiveUntil
    }, asOf)) {
      const role = normalizeParticipationRole(member.participationRole);
      if (role === "none" || role === "unknown") continue;
      roles.add(role);
      const effectiveFrom = (member.effectiveFrom ?? member.createdAt)?.toISOString();
      if (effectiveFrom && (!relationshipEffectiveFrom[role] || effectiveFrom < relationshipEffectiveFrom[role]!)) {
        relationshipEffectiveFrom[role] = effectiveFrom;
        relationshipEffectiveUntil[role] = member.effectiveUntil?.toISOString() ?? null;
      }
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
      isParticipant: false,
      relationshipEffectiveFrom: {},
      relationshipEffectiveUntil: {}
    };
  }

  return {
    role: ordered[0]!,
    label: getParticipationRoleLabel(ordered[0]!),
    roles: ordered,
    labels: ordered.map(getParticipationRoleLabel),
    isOwner,
    isParticipant: true,
    relationshipEffectiveFrom,
    relationshipEffectiveUntil
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
