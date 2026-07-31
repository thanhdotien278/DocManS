export { SYSTEM_ROLES } from "./system-roles.js";
export type { SystemRole } from "./system-roles.js";
import { SYSTEM_ROLES } from "./system-roles.js";

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
  "proposal.review.submit",
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
