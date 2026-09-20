// @ts-ignore TS7016: runtime package is JavaScript; API imports its TypeScript source contract.
import type { AuthorizationDecisionCodeV1, PermissionActionV1, ViewerAuthorizationV1, ViewerRelationshipV1 } from "@rtms/permissions";
import type { SafeUserContext } from "../auth/auth.types.js";
import { evaluateProposalConflict, type ProposalParticipation } from "../proposals-shared/proposal-participation.js";
import type { ProposalReviewAccess } from "../proposals-shared/proposal-review-access.js";
import { publicAuthorizationReasonV1 } from "./authorization-v1.service.js";

type ProposalCapabilityInput = {
  actor: SafeUserContext;
  proposal: {
    id: string;
    hostOrganizationUnitId: string;
    status: string;
    updatedAt: Date;
    authorizationContextUpdatedAt: Date;
    authorizationRelationshipVersion: number;
    authorizationConflictVersion: number;
    authorizationDelegationVersion: number;
  };
  participation?: ProposalParticipation;
  reviewAccess?: ProposalReviewAccess;
  canRead: boolean;
  canEdit: boolean;
  canManageFiles: boolean;
  completenessCheckCompleted?: boolean;
};

const ACTIONS: PermissionActionV1[] = [
  "proposal.read",
  "proposal.draft.update",
  "proposal.submit",
  "proposal.review.assign",
  "proposal.review.consolidate",
  "proposal.review.submit",
  "proposal.supplement.request",
  "proposal.completeness.check",
  "proposal.decision.approve",
  "proposal.decision.reject",
  "file.read",
  "file.upload"
];

export function projectProposalViewerAuthorizationV1(input: ProposalCapabilityInput): ViewerAuthorizationV1 {
  const evaluatedAsOf = input.proposal.authorizationContextUpdatedAt.toISOString();
  const relationships = viewerRelationships(input.participation, input.reviewAccess);
  const blockedActions: Array<{ action: PermissionActionV1; code: AuthorizationDecisionCodeV1; reason: string }> = [];
  const allowedActions: PermissionActionV1[] = [];

  for (const action of ACTIONS) {
    const blocked = blockFor(action, input);
    if (blocked) blockedActions.push({ action, ...blocked });
    else allowedActions.push(action);
  }

  return {
    schemaVersion: "v1",
    systemRole: input.actor.systemRole,
    viewerRelationships: relationships,
    allowedActions: allowedActions.sort(),
    blockedActions: blockedActions.sort((left, right) => left.action.localeCompare(right.action)),
    policyVersion: "v1",
    evaluatedAsOf,
    contextVersion: {
      domain: "proposal",
      recordId: input.proposal.id,
      aggregateVersion: Math.max(0, input.proposal.updatedAt.getTime()),
      relationshipVersion: Math.max(0, input.proposal.authorizationRelationshipVersion),
      conflictVersion: Math.max(0, input.proposal.authorizationConflictVersion),
      delegationVersion: Math.max(0, input.proposal.authorizationDelegationVersion),
      policyVersion: "v1"
    }
  };
}

function viewerRelationships(participation: ProposalParticipation | undefined, reviewAccess: ProposalReviewAccess | undefined): ViewerRelationshipV1[] {
  const relationships: ViewerRelationshipV1[] = [];
  for (const role of participation?.roles ?? []) {
    if (role === "none" || role === "unknown") continue;
    const type = role === "PROPOSAL_PI"
      ? "PROPOSAL_PI"
      : role === "TOPIC_SECRETARY"
        ? "TOPIC_SECRETARY"
        : "TOPIC_MEMBER";
    const effectiveFrom = participation?.relationshipEffectiveFrom[role];
    if (!effectiveFrom) continue;
    relationships.push({ type, status: "ACTIVE", effectiveFrom, effectiveUntil: participation?.relationshipEffectiveUntil?.[role] ?? null });
  }
  if (reviewAccess?.isAssignedReviewer && reviewAccess.effectiveFrom) {
    relationships.push({ type: "REVIEWER_ASSIGNMENT", status: "ACTIVE", effectiveFrom: reviewAccess.effectiveFrom, effectiveUntil: reviewAccess.effectiveUntil ?? null });
  }
  return relationships.sort((left, right) => left.type.localeCompare(right.type));
}

function blockFor(action: PermissionActionV1, input: ProposalCapabilityInput): { code: AuthorizationDecisionCodeV1; reason: string } | null {
  if (action === "proposal.read" || action === "file.read") return input.canRead ? null : blocked("ACTION_NOT_GRANTED");
  if (action === "proposal.draft.update" || action === "file.upload") {
    return (action === "file.upload" ? input.canManageFiles : input.canEdit) ? null : blocked(input.proposal.status === "draft" || input.proposal.status === "supplement_requested" ? "ACTION_NOT_GRANTED" : "WORKFLOW_STATE_DENIED");
  }
  if (action === "proposal.submit") {
    if (input.actor.systemRole !== "RESEARCHER_INTERNAL_USER" || !input.participation?.isOwner) return blocked("ACTION_NOT_GRANTED");
    return input.canEdit ? null : blocked("WORKFLOW_STATE_DENIED");
  }
  if (action === "proposal.review.assign") {
    if (input.actor.systemRole !== "SCIENTIFIC_MANAGEMENT_STAFF") return blocked("ACTION_NOT_GRANTED");
    if (!input.actor.organizationScopes.some((scope) => scope.id === input.proposal.hostOrganizationUnitId)) return blocked("ORG_SCOPE_DENIED");
    if (!input.participation || input.participation.role === "unknown") return blocked("CONTEXT_UNRESOLVED");
    if (evaluateProposalConflict(input.participation).conflicted) return blocked("CONFLICT_DENIED");
    if (["submitted", "resubmitted"].includes(input.proposal.status) && !input.completenessCheckCompleted) return { code: "WORKFLOW_STATE_DENIED", reason: "Cần xác nhận hồ sơ đầy đủ trước khi phân công đánh giá." };
    return ["submitted", "resubmitted", "under_review"].includes(input.proposal.status) ? null : blocked("WORKFLOW_STATE_DENIED");
  }
  if (action === "proposal.review.consolidate") {
    if (input.actor.systemRole !== "SCIENTIFIC_MANAGEMENT_STAFF") return blocked("ACTION_NOT_GRANTED");
    if (!input.actor.organizationScopes.some((scope) => scope.id === input.proposal.hostOrganizationUnitId)) return blocked("ORG_SCOPE_DENIED");
    if (input.participation?.isParticipant || input.reviewAccess?.isAssignedReviewer) return blocked("CONFLICT_DENIED");
    if (!input.participation) return blocked("CONTEXT_UNRESOLVED");
    if (!input.reviewAccess) return blocked("CONTEXT_UNRESOLVED");
    return ["under_review", "ready_for_approval"].includes(input.proposal.status) ? null : blocked("WORKFLOW_STATE_DENIED");
  }
  if (action === "proposal.completeness.check") {
    if (input.participation?.isParticipant && !input.participation.roles.includes("TOPIC_SECRETARY")) return blocked("CONFLICT_DENIED");
    if (input.actor.systemRole !== "SCIENTIFIC_MANAGEMENT_STAFF") return blocked("ACTION_NOT_GRANTED");
    if (!input.actor.organizationScopes.some((scope) => scope.id === input.proposal.hostOrganizationUnitId)) return blocked("ORG_SCOPE_DENIED");
    if (input.completenessCheckCompleted) return blocked("WORKFLOW_STATE_DENIED");
    return ["submitted", "resubmitted"].includes(input.proposal.status) ? null : blocked("WORKFLOW_STATE_DENIED");
  }
  if (action === "proposal.supplement.request") {
    if (input.participation?.isParticipant && !input.participation.roles.includes("TOPIC_SECRETARY")) return blocked("CONFLICT_DENIED");
    if (input.actor.systemRole !== "SCIENTIFIC_MANAGEMENT_STAFF") return blocked("ACTION_NOT_GRANTED");
    if (!input.actor.organizationScopes.some((scope) => scope.id === input.proposal.hostOrganizationUnitId)) return blocked("ORG_SCOPE_DENIED");
    return ["submitted", "resubmitted"].includes(input.proposal.status) ? null : blocked("WORKFLOW_STATE_DENIED");
  }
  if (action === "proposal.review.submit") {
    if (!input.participation || input.participation.role === "unknown") return blocked("CONTEXT_UNRESOLVED");
    if (input.participation?.isParticipant) return blocked("CONFLICT_DENIED");
    if (!input.reviewAccess?.isAssignedReviewer) return blocked("ACTION_NOT_GRANTED");
    return input.proposal.status === "under_review" ? null : blocked("WORKFLOW_STATE_DENIED");
  }
  if (input.actor.systemRole !== "LEADERSHIP_APPROVAL_AUTHORITY") return blocked("ACTION_NOT_GRANTED");
  if (input.participation?.isParticipant || input.reviewAccess?.isAssignedReviewer) return blocked("CONFLICT_DENIED");
  if (!input.participation) return blocked("CONTEXT_UNRESOLVED");
  if (!input.reviewAccess) return blocked("CONTEXT_UNRESOLVED");
  return input.proposal.status === "ready_for_approval" ? null : blocked("WORKFLOW_STATE_DENIED");
}

function blocked(code: AuthorizationDecisionCodeV1) {
  return { code, reason: publicAuthorizationReasonV1(code) };
}
