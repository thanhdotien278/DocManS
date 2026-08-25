import { ForbiddenException } from "@nestjs/common";
// @ts-ignore: runtime package is JavaScript; repository consumers use its TypeScript source contract.
import type { PermissionActionV1, ViewerAuthorizationV1 } from "@rtms/permissions";
import type { SafeUserContext } from "../auth/auth.types.js";

export const RESEARCHER_PROFILE_ACTIONS = [
  "researcher-profile.activate",
  "researcher-profile.create",
  "researcher-profile.deactivate",
  "researcher-profile.read",
  "researcher-profile.update"
] as const satisfies readonly PermissionActionV1[];

export function hasResearcherProfileScope(actor: SafeUserContext, organizationId: string) {
  return actor.organizationScopes.some((scope) => scope.id === organizationId);
}

export function canManageResearcherProfile(actor: SafeUserContext, action: PermissionActionV1, organizationId: string) {
  return actor.systemRole === "SCIENTIFIC_MANAGEMENT_STAFF" && RESEARCHER_PROFILE_ACTIONS.includes(action as (typeof RESEARCHER_PROFILE_ACTIONS)[number]) && hasResearcherProfileScope(actor, organizationId);
}

export function assertResearcherProfileAction(actor: SafeUserContext, action: PermissionActionV1, organizationId: string) {
  if (!canManageResearcherProfile(actor, action, organizationId)) {
    throw new ForbiddenException({ message: "Bạn không có quyền thao tác hồ sơ nhà khoa học trong phạm vi này." });
  }
}

export function projectResearcherProfileAuthorization(actor: SafeUserContext, profile: { id: string; managementOrganizationUnitId: string; aggregateVersion: number }): ViewerAuthorizationV1 {
  const allowedActions = RESEARCHER_PROFILE_ACTIONS.filter((action) => canManageResearcherProfile(actor, action, profile.managementOrganizationUnitId)).sort();
  const blockedActions = RESEARCHER_PROFILE_ACTIONS.filter((action) => !allowedActions.includes(action)).map((action) => ({
    action,
    code: hasResearcherProfileScope(actor, profile.managementOrganizationUnitId) ? "ACTION_NOT_GRANTED" as const : "ORG_SCOPE_DENIED" as const,
    reason: hasResearcherProfileScope(actor, profile.managementOrganizationUnitId) ? "ACTION_NOT_GRANTED" : "ORG_SCOPE_DENIED"
  }));
  return {
    schemaVersion: "v1",
    systemRole: actor.systemRole,
    viewerRelationships: [],
    allowedActions,
    blockedActions,
    policyVersion: "v1",
    evaluatedAsOf: new Date().toISOString(),
    contextVersion: {
      domain: "researcher-profile",
      recordId: profile.id,
      aggregateVersion: profile.aggregateVersion,
      relationshipVersion: 0,
      conflictVersion: 0,
      delegationVersion: 0,
      policyVersion: "v1"
    }
  };
}
