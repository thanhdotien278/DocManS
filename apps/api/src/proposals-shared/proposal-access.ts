import { ForbiddenException } from "@nestjs/common";
import type { SafeUserContext } from "../auth/auth.types.js";
import type { ProposalParticipation } from "./proposal-participation.js";
import type { ProposalReviewAccess } from "./proposal-review-access.js";
import { isWorkflowVisibleStatus } from "./proposal-workflow.js";

type IntakeLike = {
  applicableOrganizationUnitId?: string | null;
  status: string;
  startsAt: Date;
  endsAt: Date;
};

type ProposalLike = {
  ownerId: string;
  hostOrganizationUnitId: string;
  status: string;
};

export function isSystemAdmin(user?: SafeUserContext) {
  return user?.systemRole === "SYSTEM_ADMIN";
}

export function isScientificManagement(user?: SafeUserContext) {
  return user?.systemRole === "SCIENTIFIC_MANAGEMENT_STAFF";
}

export function isResearcherInternalUser(user?: SafeUserContext) {
  return user?.systemRole === "RESEARCHER_INTERNAL_USER";
}

export function isLeadership(user?: SafeUserContext) {
  return user?.systemRole === "LEADERSHIP_APPROVAL_AUTHORITY";
}

export function assertCanManageIntakePeriods(user?: SafeUserContext) {
  if (!user || (!isSystemAdmin(user) && !isScientificManagement(user))) {
    throw new ForbiddenException({ message: "Không có quyền quản lý đợt tiếp nhận." });
  }

  return user as SafeUserContext;
}

export function assertCanCreateProposalDraft(user?: SafeUserContext) {
  if (!isResearcherInternalUser(user)) {
    throw new ForbiddenException({ message: "Chỉ người dùng nghiên cứu nội bộ được tạo hồ sơ đề xuất." });
  }

  return user as SafeUserContext;
}

export function getOrganizationScopeIds(user?: SafeUserContext) {
  return user?.organizationScopes?.map((scope) => scope.id).filter(Boolean) ?? [];
}

export function assertHasOrganizationScope(user: SafeUserContext, organizationUnitId: string) {
  if (!getOrganizationScopeIds(user).includes(organizationUnitId)) {
    throw new ForbiddenException({ message: "Không có quyền thao tác trong phạm vi đơn vị này." });
  }
}

export function isIntakeOpenForSubmission(intake: IntakeLike, now = new Date()) {
  return intake.status === "open" && intake.startsAt.getTime() <= now.getTime() && intake.endsAt.getTime() >= now.getTime();
}

export function intakeAppliesToUser(intake: IntakeLike, user: SafeUserContext) {
  if (!intake.applicableOrganizationUnitId) {
    return true;
  }

  return getOrganizationScopeIds(user).includes(intake.applicableOrganizationUnitId);
}

/**
 * `participation` is the caller's resolved record-scoped relationship to this proposal (ST-3.0) and
 * `reviewAccess` their resolved reviewer assignment on it (ST-3.2). Both only ever widen access to
 * the single record they were resolved from, never to the user's account-level authority
 * (AUTH-ST-3.0-02). Omitting either keeps the narrower behaviour, which is the fail-closed
 * direction: an unresolved context grants nothing.
 */
export function canReadProposal(
  user: SafeUserContext | undefined,
  proposal: ProposalLike,
  participation?: ProposalParticipation,
  reviewAccess?: ProposalReviewAccess
) {
  if (!user) {
    return false;
  }

  if (!getOrganizationScopeIds(user).includes(proposal.hostOrganizationUnitId)) {
    return false;
  }

  if (isSystemAdmin(user) || isScientificManagement(user)) {
    return true;
  }

  if (participation?.isParticipant) {
    return true;
  }

  // ST-3.2: assignment-scoped, and only for a proposal that has entered the formal workflow. A
  // `reviewer` account with no assignment on this proposal reads nothing (AC-ST-3.2-02).
  if (reviewAccess?.isAssignedReviewer && isWorkflowVisibleStatus(proposal.status)) {
    return true;
  }

  // ST-3.5: approval authority needs the whole decision package (AC-ST-3.5-01). Drafts stay
  // private to their owner until the proposal is formally submitted.
  if (isLeadership(user)) {
    return isWorkflowVisibleStatus(proposal.status);
  }

  return proposal.ownerId === user.id;
}

export function assertCanReadProposal(
  user: SafeUserContext | undefined,
  proposal: ProposalLike,
  participation?: ProposalParticipation,
  reviewAccess?: ProposalReviewAccess
) {
  if (!canReadProposal(user, proposal, participation, reviewAccess)) {
    throw new ForbiddenException({ message: "Không có quyền xem hồ sơ đề xuất này." });
  }

  return user as SafeUserContext;
}

export function assertCanEditProposalDraft(user: SafeUserContext | undefined, proposal: ProposalLike) {
  if (!user) {
    throw new ForbiddenException({ message: "Không có quyền sửa hồ sơ đề xuất này." });
  }
  const actor = user;

  if (proposal.ownerId !== actor.id) {
    throw new ForbiddenException({ message: "Không có quyền sửa hồ sơ đề xuất này." });
  }

  return actor;
}
