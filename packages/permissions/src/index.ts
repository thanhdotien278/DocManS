export { SYSTEM_ROLES } from "./system-roles.js";
export type { SystemRole } from "./system-roles.js";
import { SYSTEM_ROLES } from "./system-roles.js";
import type { SystemRole } from "./system-roles.js";

export const AUTHORIZATION_SCHEMA_VERSION_V1 = "v1" as const;
export const AUTHORIZATION_DECISION_CODE_ORDER_V1 = [
  "UNAUTHENTICATED",
  "ACCOUNT_INACTIVE",
  "CONTRACT_VERSION_UNSUPPORTED",
  "CONTRACT_CODE_UNKNOWN",
  "CONTEXT_UNRESOLVED",
  "CONTEXT_STALE",
  "CONTEXT_AMBIGUOUS",
  "CONTEXT_VERSION_MISMATCH",
  "ORG_SCOPE_DENIED",
  "RELATIONSHIP_INACTIVE",
  "WORKFLOW_STATE_DENIED",
  "CONFLICT_DENIED",
  "DELEGATION_INVALID",
  "ACTION_NOT_GRANTED",
  "ALLOWED"
] as const;
export const PERMISSION_ACTION_IDS_V1 = [
  "catalog.read",
  "catalog.manage",
  "proposal.read",
  "proposal.draft.create",
  "proposal.draft.update",
  "proposal.submit",
  "proposal.review.assign",
  "proposal.review.consolidate",
  "proposal.review.submit",
  "proposal.supplement.request",
  "proposal.decision.approve",
  "proposal.decision.reject",
  "file.read",
  "file.upload"
] as const;

export type AuthorizationDecisionCodeV1 = (typeof AUTHORIZATION_DECISION_CODE_ORDER_V1)[number];
export type PermissionActionV1 = (typeof PERMISSION_ACTION_IDS_V1)[number];
export type AuthorizationResolutionV1 = "RESOLVED_VALUE" | "RESOLVED_EMPTY" | "NOT_APPLICABLE" | "UNRESOLVED" | "STALE" | "AMBIGUOUS";
export type AuthorizationDimensionV1 = "systemRole" | "organizationScope" | "relationship" | "assignment" | "delegation" | "workflowState" | "conflict";

export type ContextVersionTokenV1 = {
  domain: string;
  recordId: string;
  aggregateVersion: number;
  relationshipVersion: number;
  conflictVersion: number;
  delegationVersion: number;
  policyVersion: string;
};

export const VIEWER_RELATIONSHIP_TYPES_V1 = [
  "PROPOSAL_PI",
  "PROPOSAL_MEMBER",
  "PROPOSAL_SCIENTIFIC_SECRETARY",
  "REVIEWER_ASSIGNMENT",
  "COUNCIL_MEMBER"
] as const;
export type ViewerRelationshipTypeV1 = (typeof VIEWER_RELATIONSHIP_TYPES_V1)[number];
export type ViewerRelationshipV1 = {
  type: ViewerRelationshipTypeV1;
  status: "ACTIVE" | "INACTIVE";
  effectiveFrom: string;
  effectiveUntil: string | null;
};
export type BlockedActionV1 = { action: PermissionActionV1; code: AuthorizationDecisionCodeV1; reason: string };
export type ViewerAuthorizationV1 = {
  schemaVersion: "v1";
  systemRole: SystemRole;
  viewerRelationships: ViewerRelationshipV1[];
  allowedActions: PermissionActionV1[];
  blockedActions: BlockedActionV1[];
  policyVersion: string;
  evaluatedAsOf: string;
  contextVersion: ContextVersionTokenV1;
};

export type AuthorizationContextV1 = {
  schemaVersion: "v1";
  requestId: string;
  correlationId: string;
  asOf: string;
  actor: { userId: string; systemRole: string; organizationIds: string[]; accountStatus: "ACTIVE" | "INACTIVE" };
  target: { domain: string; recordId: string; organizationId: string; aggregateVersion: number };
  action: string;
};

export type AuthorizationRuleOutcomeV1 = {
  dimension: AuthorizationDimensionV1;
  resolution: AuthorizationResolutionV1;
  allowed?: boolean;
  code?: AuthorizationDecisionCodeV1;
  reason: string;
};

export type AuthorizationAuditOutcomeV1 = Omit<AuthorizationRuleOutcomeV1, "reason"> & {
  reason: string;
};

export type AuthorizationAuditV1 = {
  schemaVersion: "v1";
  requestId: string;
  correlationId: string;
  actorUserId: string;
  target: AuthorizationContextV1["target"];
  action: string;
  asOf: string;
  policyVersion: string;
  contextVersions: ContextVersionTokenV1[];
  outcomes: AuthorizationAuditOutcomeV1[];
  primaryDecisionCode: AuthorizationDecisionCodeV1;
};

export function isAuthorizationDecisionCodeV1(value: unknown): value is AuthorizationDecisionCodeV1 {
  return typeof value === "string" && AUTHORIZATION_DECISION_CODE_ORDER_V1.includes(value as AuthorizationDecisionCodeV1);
}

export function isPermissionActionV1(value: unknown): value is PermissionActionV1 {
  return typeof value === "string" && PERMISSION_ACTION_IDS_V1.includes(value as PermissionActionV1);
}

export function isAuthorizationResolutionV1(value: unknown): value is AuthorizationResolutionV1 {
  return value === "RESOLVED_VALUE" || value === "RESOLVED_EMPTY" || value === "NOT_APPLICABLE" || value === "UNRESOLVED" || value === "STALE" || value === "AMBIGUOUS";
}

export function isAuthorizationDimensionV1(value: unknown): value is AuthorizationDimensionV1 {
  return value === "systemRole" || value === "organizationScope" || value === "relationship" || value === "assignment" || value === "delegation" || value === "workflowState" || value === "conflict";
}

export function isContextVersionTokenV1(value: unknown): value is ContextVersionTokenV1 {
  if (!value || typeof value !== "object") return false;
  const token = value as ContextVersionTokenV1;
  return typeof token.domain === "string" && typeof token.recordId === "string" && Number.isInteger(token.aggregateVersion) && token.aggregateVersion >= 0 && Number.isInteger(token.relationshipVersion) && token.relationshipVersion >= 0 && Number.isInteger(token.conflictVersion) && token.conflictVersion >= 0 && Number.isInteger(token.delegationVersion) && token.delegationVersion >= 0 && typeof token.policyVersion === "string";
}

export function isViewerAuthorizationV1(value: unknown): value is ViewerAuthorizationV1 {
  if (!value || typeof value !== "object") return false;
  const capability = value as ViewerAuthorizationV1;
  const relationshipTypes = Array.isArray(capability.viewerRelationships) ? capability.viewerRelationships.map((relationship) => relationship?.type) : [];
  const allowedActions = Array.isArray(capability.allowedActions) ? capability.allowedActions : [];
  const blockedActions = Array.isArray(capability.blockedActions) ? capability.blockedActions.map((action) => action?.action) : [];
  return capability.schemaVersion === AUTHORIZATION_SCHEMA_VERSION_V1 &&
    typeof capability.systemRole === "string" && SYSTEM_ROLES.includes(capability.systemRole as SystemRole) &&
    Array.isArray(capability.viewerRelationships) && capability.viewerRelationships.every((relationship) =>
      typeof relationship?.type === "string" && VIEWER_RELATIONSHIP_TYPES_V1.includes(relationship.type as ViewerRelationshipTypeV1) &&
      (relationship.status === "ACTIVE" || relationship.status === "INACTIVE") &&
      typeof relationship.effectiveFrom === "string" && (typeof relationship.effectiveUntil === "string" || relationship.effectiveUntil === null)
    ) &&
    Array.isArray(capability.viewerRelationships) && isSortedUnique(relationshipTypes) && capability.viewerRelationships.every((relationship) =>
      typeof relationship?.type === "string" && VIEWER_RELATIONSHIP_TYPES_V1.includes(relationship.type as ViewerRelationshipTypeV1)
    ) &&
    Array.isArray(capability.allowedActions) && isSortedUnique(allowedActions) && capability.allowedActions.every(isPermissionActionV1) &&
    Array.isArray(capability.blockedActions) && capability.blockedActions.every((action) =>
      typeof action?.action === "string" && isPermissionActionV1(action.action) && isAuthorizationDecisionCodeV1(action.code) && typeof action.reason === "string"
    ) && isSortedUnique(blockedActions) && !blockedActions.some((action) => allowedActions.includes(action)) &&
    typeof capability.policyVersion === "string" && typeof capability.evaluatedAsOf === "string" && isContextVersionTokenV1(capability.contextVersion);
}

function isSortedUnique(values: string[]) {
  return values.every((value, index) => index === 0 || values[index - 1]! < value);
}

// Legacy foundation adapter: retained until protected domains migrate to V1.
export type PermissionAction = "read" | "create" | "update" | "delete" | "submit" | "approve" | "reject" | "assign" | "export";
export type PermissionResource = "workspace" | "user" | "role" | "organization" | "catalog" | "research-proposal" | "approved-project" | "task" | "file" | "dashboard" | "report";
export type PermissionContext = { userId?: string; systemRole?: import("./system-roles.js").SystemRole; organizationUnitIds?: string[] };
export type PermissionDecision = { allowed: boolean; reason: string };

export function evaluatePermission(context: PermissionContext, action: PermissionAction, resource: PermissionResource): PermissionDecision {
  if (!context.userId || !context.systemRole) {
    return { allowed: false, reason: "Missing authenticated actor context." };
  }
  if (!SYSTEM_ROLES.includes(context.systemRole)) {
    return { allowed: false, reason: "Invalid system role context." };
  }
  if (context.systemRole === "SYSTEM_ADMIN" && ["user", "role", "organization", "catalog"].includes(resource) && ["read", "create", "update", "delete"].includes(action)) {
    return { allowed: true, reason: "System administrator can manage platform foundation resources." };
  }
  if (!context.organizationUnitIds?.length) {
    return { allowed: false, reason: "Missing organization scope context." };
  }
  if (resource === "dashboard" && action === "read") {
    return { allowed: true, reason: "Authenticated scoped users can read their dashboard context." };
  }
  return { allowed: false, reason: "Permission policy denies this action for the current role and scope." };
}
