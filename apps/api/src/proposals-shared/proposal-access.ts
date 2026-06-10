import { ForbiddenException } from "@nestjs/common";
import type { SafeUserContext } from "../auth/auth.types.js";

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

export function hasRole(user: SafeUserContext | undefined, role: SafeUserContext["role"]) {
  return Boolean(user && (user.role === role || user.roles?.includes(role)));
}

export function isSystemAdmin(user?: SafeUserContext) {
  return hasRole(user, "system-admin");
}

export function isScientificManagement(user?: SafeUserContext) {
  return hasRole(user, "scientific-management");
}

export function isPrincipalInvestigator(user?: SafeUserContext) {
  return hasRole(user, "principal-investigator");
}

export function assertCanManageIntakePeriods(user?: SafeUserContext) {
  if (!user || (!isSystemAdmin(user) && !isScientificManagement(user))) {
    throw new ForbiddenException({ message: "Không có quyền quản lý đợt tiếp nhận." });
  }

  return user;
}

export function assertPrincipalInvestigator(user?: SafeUserContext) {
  if (!user || !isPrincipalInvestigator(user)) {
    throw new ForbiddenException({ message: "Chỉ chủ nhiệm đề tài được thực hiện thao tác này." });
  }

  return user;
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

export function canReadProposal(user: SafeUserContext | undefined, proposal: ProposalLike) {
  if (!user) {
    return false;
  }

  if (isSystemAdmin(user) || isScientificManagement(user)) {
    return true;
  }

  if (isPrincipalInvestigator(user)) {
    return proposal.ownerId === user.id;
  }

  return false;
}

export function assertCanReadProposal(user: SafeUserContext | undefined, proposal: ProposalLike) {
  if (!canReadProposal(user, proposal)) {
    throw new ForbiddenException({ message: "Không có quyền xem hồ sơ đề xuất này." });
  }

  return user as SafeUserContext;
}

export function assertCanEditProposalDraft(user: SafeUserContext | undefined, proposal: ProposalLike) {
  const actor = assertPrincipalInvestigator(user);

  if (proposal.ownerId !== actor.id) {
    throw new ForbiddenException({ message: "Không có quyền sửa hồ sơ đề xuất này." });
  }

  return actor;
}
