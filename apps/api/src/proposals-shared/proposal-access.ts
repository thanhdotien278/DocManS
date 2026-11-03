import { ForbiddenException } from "@nestjs/common";
import type { SafeUserContext } from "../auth/auth.types.js";
import { evaluateProposalConflict, type ProposalParticipation } from "./proposal-participation.js";
import type { ProposalReviewAccess } from "./proposal-review-access.js";
import type { ProposalManagementOfficerResolution } from "./proposal-management-officer.service.js";
import { isWorkflowVisibleStatus } from "./proposal-workflow.js";

type IntakeLike = {
  applicableOrganizationUnitIds?: string[];
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

export function isResearchManagement(user?: SafeUserContext) {
  return isResearchManagementStaff(user) || isResearchManagementHead(user);
}

export function isResearchManagementStaff(user?: SafeUserContext) {
  return user?.systemRole === "RESEARCH_MANAGEMENT_STAFF";
}

export function isResearchManagementHead(user?: SafeUserContext) {
  return user?.systemRole === "RESEARCH_MANAGEMENT_HEAD";
}

export function isResearchManagementDeputyHead(user?: SafeUserContext) {
  return user?.systemRole === "RESEARCH_MANAGEMENT_DEPUTY_HEAD";
}

export function isResearchBoardHead(user?: SafeUserContext) {
  return user?.systemRole === "RESEARCH_BOARD_HEAD";
}

export function isScienceDeputyDirector(user?: SafeUserContext) {
  return user?.systemRole === "SCIENCE_DEPUTY_DIRECTOR";
}

export function isResearchOversightAuthority(user?: SafeUserContext) {
  return user?.systemRole === "RESEARCH_OVERSIGHT_AUTHORITY";
}

export function isResearcherInternalUser(user?: SafeUserContext) {
  return user?.systemRole === "RESEARCHER_INTERNAL_USER";
}

/** Ma trận §7: mọi vai trò trừ QT và NNB được làm chủ nhiệm (tạo, sửa, nộp đề xuất). */
export function isInternalResearcherEligible(user?: SafeUserContext) {
  return Boolean(user) && !isSystemAdmin(user) && user?.systemRole !== "EXTERNAL_RESEARCHER_USER";
}

export function isLeadership(user?: SafeUserContext) {
  return user?.systemRole === "LEADERSHIP_APPROVAL_AUTHORITY";
}

export function assertCanManageIntakePeriods(user?: SafeUserContext) {
  if (!user || !isResearchManagement(user)) {
    throw new ForbiddenException({ message: "Không có quyền quản lý đợt tiếp nhận." });
  }

  return user as SafeUserContext;
}

export function assertCanCreateProposalDraft(user?: SafeUserContext) {
  if (!isInternalResearcherEligible(user)) {
    throw new ForbiddenException({ message: "Quản trị hệ thống và nhà nghiên cứu bên ngoài không được tạo hồ sơ đề xuất." });
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
  if (intake.applicableOrganizationUnitIds?.length) return intake.applicableOrganizationUnitIds.some((id) => getOrganizationScopeIds(user).includes(id));
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
  reviewAccess?: ProposalReviewAccess,
  managementOfficer?: ProposalManagementOfficerResolution
) {
  if (!user) {
    return false;
  }

  // An effective assignment grants review reads across units, never participant access.
  if (reviewAccess?.isAssignedReviewer && isWorkflowVisibleStatus(proposal.status) && !evaluateProposalConflict(participation).conflicted) {
    return true;
  }

  // Đơn vị chủ trì hiện không giới hạn quyền đọc hồ sơ: quyền chỉ theo vai trò và quan hệ (chủ hồ sơ, thành viên, CV phụ trách, phản biện).
  if (participation?.isParticipant || proposal.ownerId === user.id) {
    return true;
  }

  if (isResearchManagementHead(user) || isResearchOversightAuthority(user) || isResearchBoardHead(user) || isResearchManagementDeputyHead(user)) {
    return true;
  }

  // Director and Science Deputy Director read only proposals already in the formal workflow (matrix 7.1, note 2).
  if ((isLeadership(user) || isScienceDeputyDirector(user)) && isWorkflowVisibleStatus(proposal.status)) {
    return true;
  }

  if (isResearchManagementStaff(user)) {
    return managementOfficer?.resolved === true && managementOfficer.officer?.officerUserId === user.id;
  }

  return proposal.ownerId === user.id;
}

export function assertCanReadProposal(
  user: SafeUserContext | undefined,
  proposal: ProposalLike,
  participation?: ProposalParticipation,
  reviewAccess?: ProposalReviewAccess,
  managementOfficer?: ProposalManagementOfficerResolution
) {
  if (!canReadProposal(user, proposal, participation, reviewAccess, managementOfficer)) {
    throw new ForbiddenException({ message: "Không có quyền xem hồ sơ đề xuất này." });
  }

  return user as SafeUserContext;
}

/** PI luôn được sửa; thư ký hiệu lực chỉ được khi caller truyền `participation` (chỉ nhánh sửa nội dung nháp). */
export function assertCanEditProposalDraft(user: SafeUserContext | undefined, proposal: ProposalLike, participation?: ProposalParticipation) {
  if (!user) {
    throw new ForbiddenException({ message: "Không có quyền sửa hồ sơ đề xuất này." });
  }
  const actor = user;

  if (proposal.ownerId !== actor.id && !participation?.roles.includes("TOPIC_SECRETARY")) {
    throw new ForbiddenException({ message: "Không có quyền sửa hồ sơ đề xuất này." });
  }

  return actor;
}
