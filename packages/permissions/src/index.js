export { SYSTEM_ROLES } from "./system-roles.js";
import { SYSTEM_ROLES } from "./system-roles.js";
export const AUTHORIZATION_SCHEMA_VERSION_V1 = "v1";
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
];
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
];
export function isAuthorizationDecisionCodeV1(value) {
    return typeof value === "string" && AUTHORIZATION_DECISION_CODE_ORDER_V1.includes(value);
}
export function isPermissionActionV1(value) {
    return typeof value === "string" && PERMISSION_ACTION_IDS_V1.includes(value);
}
export function isAuthorizationResolutionV1(value) {
    return value === "RESOLVED_VALUE" || value === "RESOLVED_EMPTY" || value === "NOT_APPLICABLE" || value === "UNRESOLVED" || value === "STALE" || value === "AMBIGUOUS";
}
export function isAuthorizationDimensionV1(value) {
    return value === "systemRole" || value === "organizationScope" || value === "relationship" || value === "assignment" || value === "delegation" || value === "workflowState" || value === "conflict";
}
export function isContextVersionTokenV1(value) {
    if (!value || typeof value !== "object")
        return false;
    const token = value;
    return typeof token.domain === "string" && typeof token.recordId === "string" && Number.isInteger(token.aggregateVersion) && token.aggregateVersion >= 0 && Number.isInteger(token.relationshipVersion) && token.relationshipVersion >= 0 && Number.isInteger(token.conflictVersion) && token.conflictVersion >= 0 && Number.isInteger(token.delegationVersion) && token.delegationVersion >= 0 && typeof token.policyVersion === "string";
}
export function evaluatePermission(context, action, resource) {
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
