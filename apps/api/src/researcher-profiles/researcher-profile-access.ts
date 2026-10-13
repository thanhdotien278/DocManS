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
  "researcher-profile.cv.read",
  "researcher-profile.cv.update",
  "researcher-profile.deactivate",
  "researcher-profile.history.read",
  "researcher-profile.participation.manage",
  "researcher-profile.publication.manage",
  "researcher-profile.read",
  "researcher-profile.self.read",
  "researcher-profile.self.update",
  "researcher-profile.update"
] as const satisfies readonly PermissionActionV1[];

export const RESEARCHER_PROFILE_MANAGER_ROLES = ["SYSTEM_ADMIN", "SCIENTIFIC_MANAGEMENT_HEAD", "SCIENTIFIC_MANAGEMENT_STAFF"] as const;

// Only a SYSTEM_ADMIN may link elevated (HEAD/STAFF) accounts, and only to INTERNAL profiles.
export function linkableAccountRoles(actor: SafeUserContext, profileType?: string | null) {
  if (profileType === "EXTERNAL") return ["EXTERNAL_RESEARCHER_USER"];
  return actor.systemRole === "SYSTEM_ADMIN" ? ["RESEARCHER_INTERNAL_USER", "SCIENTIFIC_MANAGEMENT_HEAD", "SCIENTIFIC_MANAGEMENT_STAFF"] : ["RESEARCHER_INTERNAL_USER"];
}

const ELEVATED_LINKED_WRITE_ACTIONS: readonly string[] = ["researcher-profile.update", "researcher-profile.activate", "researcher-profile.deactivate", "researcher-profile.cv.update", "researcher-profile.publication.manage", "researcher-profile.participation.manage"];

// Manager writes on a profile linked to a HEAD/STAFF account belong to SYSTEM_ADMIN only (Story 13.10).
export function deniesElevatedLinkedWrite(actor: SafeUserContext, action: string, profile: { linkedUser?: { systemRole: string | null } | null }) {
  return actor.systemRole !== "SYSTEM_ADMIN" && ELEVATED_LINKED_WRITE_ACTIONS.includes(action) && ["SCIENTIFIC_MANAGEMENT_HEAD", "SCIENTIFIC_MANAGEMENT_STAFF"].includes(profile.linkedUser?.systemRole ?? "");
}

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
    if (own && ["researcher-profile.cv.read", "researcher-profile.cv.update", "researcher-profile.history.read", "researcher-profile.publication.manage", "researcher-profile.participation.manage"].includes(action)) return true;
    if (!canManageResearcherProfile(actor, action, profile.managementOrganizationUnitId)) return false;
    if (deniesElevatedLinkedWrite(actor, action, profile)) return false;
    if (action === "researcher-profile.account.create" || action === "researcher-profile.account.link") return profile.status === "ACTIVE" && !profile.linkedUserId;
    if (action === "researcher-profile.account.unlink") return !!profile.linkedUserId && profile.linkedUserId !== actor.id && (actor.systemRole === "SYSTEM_ADMIN" || ["RESEARCHER_INTERNAL_USER", "EXTERNAL_RESEARCHER_USER"].includes(profile.linkedUser?.systemRole ?? ""));
    if (action === "researcher-profile.account.reset") return profile.status === "ACTIVE" && !!profile.linkedUserId && profile.linkedUserId !== actor.id && profile.linkedUser?.status === "pending_activation" && profile.linkedUser?.systemRole === (profile.profileType === "EXTERNAL" ? "EXTERNAL_RESEARCHER_USER" : "RESEARCHER_INTERNAL_USER");
    if ((action === "researcher-profile.activate" || action === "researcher-profile.deactivate") && profile.linkedUserId === actor.id) return false;
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
