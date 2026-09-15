import { ForbiddenException } from "@nestjs/common";
// @ts-ignore: runtime package is JavaScript; repository consumers use its TypeScript source contract.
import type { PermissionActionV1, ViewerAuthorizationV1 } from "@rtms/permissions";
import type { SafeUserContext } from "../auth/auth.types.js";

export const RESEARCHER_PROFILE_ACTIONS = [
  "researcher-profile.account.create",
  "researcher-profile.account.link",
  "researcher-profile.account.reset",
  "researcher-profile.account.unlink",
  "researcher-profile.activate",
  "researcher-profile.create",
  "researcher-profile.deactivate",
  "researcher-profile.history.read",
  "researcher-profile.participation.manage",
  "researcher-profile.publication.manage",
  "researcher-profile.read",
  "researcher-profile.self.read",
  "researcher-profile.self.update",
  "researcher-profile.update"
] as const satisfies readonly PermissionActionV1[];

export const RESEARCHER_PROFILE_MANAGER_ROLES = ["SYSTEM_ADMIN", "SCIENTIFIC_MANAGEMENT_STAFF"] as const;

export function hasResearcherProfileScope(actor: SafeUserContext, organizationId: string) {
  return actor.organizationScopes.some((scope) => scope.id === organizationId);
}

export function canManageResearcherProfile(actor: SafeUserContext, action: PermissionActionV1, organizationId: string) {
  return RESEARCHER_PROFILE_MANAGER_ROLES.includes(actor.systemRole as (typeof RESEARCHER_PROFILE_MANAGER_ROLES)[number]) && RESEARCHER_PROFILE_ACTIONS.includes(action as (typeof RESEARCHER_PROFILE_ACTIONS)[number]) && hasResearcherProfileScope(actor, organizationId);
}

export function canManageResearcherProfiles(actor: SafeUserContext) {
  return RESEARCHER_PROFILE_MANAGER_ROLES.includes(actor.systemRole as (typeof RESEARCHER_PROFILE_MANAGER_ROLES)[number]);
}

export function canEditOwnResearcherProfile(actor: SafeUserContext, profile: { linkedUserId?: string | null; status: string }) {
  return profile.status === "ACTIVE" && profile.linkedUserId === actor.id;
}

export function assertResearcherProfileAction(actor: SafeUserContext, action: PermissionActionV1, organizationId: string) {
  if (!canManageResearcherProfile(actor, action, organizationId)) {
    throw new ForbiddenException({ message: "Bạn không có quyền thao tác hồ sơ nhà khoa học trong phạm vi này." });
  }
}

export function projectResearcherProfileAuthorization(actor: SafeUserContext, profile: { id: string; managementOrganizationUnitId: string; aggregateVersion: number; profileType?: string; linkedUserId?: string | null; status?: string; linkedUser?: { systemRole: string | null; status: string } | null }): ViewerAuthorizationV1 {
  const own = canEditOwnResearcherProfile(actor, { ...profile, status: profile.status ?? "ACTIVE" });
  const allowedActions = RESEARCHER_PROFILE_ACTIONS.filter((action) => {
    if (action.startsWith("researcher-profile.self.")) return own;
    if (own && ["researcher-profile.history.read", "researcher-profile.publication.manage", "researcher-profile.participation.manage"].includes(action)) return true;
    if (!canManageResearcherProfile(actor, action, profile.managementOrganizationUnitId)) return false;
    if (action === "researcher-profile.account.create" || action === "researcher-profile.account.link") return profile.status === "ACTIVE" && !profile.linkedUserId;
    if (action === "researcher-profile.account.unlink") return !!profile.linkedUserId && profile.linkedUserId !== actor.id && (actor.systemRole === "SYSTEM_ADMIN" || ["RESEARCHER_INTERNAL_USER", "EXTERNAL_RESEARCHER_USER"].includes(profile.linkedUser?.systemRole ?? ""));
    if (action === "researcher-profile.account.reset") return profile.status === "ACTIVE" && !!profile.linkedUserId && profile.linkedUserId !== actor.id && profile.linkedUser?.status === "active" && profile.linkedUser?.systemRole === (profile.profileType === "EXTERNAL" ? "EXTERNAL_RESEARCHER_USER" : "RESEARCHER_INTERNAL_USER");
    return true;
  }).sort();
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
