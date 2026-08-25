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
    "proposal.review.consolidate",
    "proposal.review.submit",
    "proposal.supplement.request",
    "proposal.decision.approve",
    "proposal.decision.reject",
    "file.read",
    "file.upload",
    "researcher-profile.activate",
    "researcher-profile.create",
    "researcher-profile.deactivate",
    "researcher-profile.read",
    "researcher-profile.update",
    "delegation.grant.approve"
];
export const DELEGATION_GRANT_STATUSES_V1 = ["PENDING_APPROVAL", "ACTIVE", "REVOKED", "EXPIRED", "REJECTED"];
export const DELEGABLE_PERMISSION_ACTION_IDS_V1 = ["proposal.submit"];
export const VIEWER_RELATIONSHIP_TYPES_V1 = [
    "PROPOSAL_PI",
    "PROPOSAL_CO_INVESTIGATOR",
    "PROPOSAL_MEMBER",
    "PROPOSAL_SCIENTIFIC_SECRETARY",
    "PROJECT_PI",
    "PROJECT_CO_INVESTIGATOR",
    "PROJECT_MEMBER",
    "PROJECT_SCIENTIFIC_SECRETARY",
    "REVIEWER_ASSIGNMENT",
    "COUNCIL_MEMBER",
    "COUNCIL_SCIENTIFIC_SECRETARY",
    "ETHICS_REVIEWER_ASSIGNMENT",
    "TASK_ASSIGNEE"
];
export const RELATIONSHIP_MULTIPLICITY_V1 = Object.fromEntries(VIEWER_RELATIONSHIP_TYPES_V1.map((type) => [type, "one"]));
export const RELATIONSHIP_FACT_STATUSES_V1 = ["ACTIVE", "SUSPENDED", "ENDED", "REVOKED"];
export function isAuthorizationDecisionCodeV1(value) {
    return typeof value === "string" && AUTHORIZATION_DECISION_CODE_ORDER_V1.includes(value);
}
export function isPermissionActionV1(value) {
    return typeof value === "string" && PERMISSION_ACTION_IDS_V1.includes(value);
}
export function isDelegablePermissionActionV1(value) {
    return typeof value === "string" && DELEGABLE_PERMISSION_ACTION_IDS_V1.includes(value);
}
export function isDelegationGrantV1(value) {
    if (!value || typeof value !== "object")
        return false;
    const grant = value;
    const startsAt = Date.parse(grant.startsAt);
    const endsAt = grant.endsAt === null ? null : Date.parse(grant.endsAt);
    return grant.schemaVersion === AUTHORIZATION_SCHEMA_VERSION_V1 &&
        [grant.grantId, grant.grantorUserId, grant.delegateUserId, grant.targetDomain, grant.targetRecordId, grant.targetOrganizationId, grant.reason].every((field) => typeof field === "string" && field.length > 0) &&
        grant.grantorUserId !== grant.delegateUserId &&
        (grant.approverUserId === null || (typeof grant.approverUserId === "string" && grant.approverUserId.length > 0 && grant.approverUserId !== grant.grantorUserId)) &&
        Array.isArray(grant.actionIds) && grant.actionIds.length > 0 && new Set(grant.actionIds).size === grant.actionIds.length && grant.actionIds.every(isDelegablePermissionActionV1) &&
        isContextVersionTokenV1(grant.sourceAuthorityVersion) && Number.isFinite(startsAt) && (endsAt === null || (Number.isFinite(endsAt) && startsAt < endsAt)) &&
        DELEGATION_GRANT_STATUSES_V1.includes(grant.status) &&
        (grant.approvedAt === null || Number.isFinite(Date.parse(grant.approvedAt))) &&
        (grant.revokedAt === null || Number.isFinite(Date.parse(grant.revokedAt)));
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
export function isSourceRelationshipFactV1(value) {
    if (!value || typeof value !== "object")
        return false;
    const fact = value;
    const startsAt = Date.parse(fact.effectiveFrom);
    const endsAt = fact.effectiveUntil === null ? null : Date.parse(fact.effectiveUntil);
    return typeof fact.actorUserId === "string" && fact.actorUserId.length > 0 &&
        typeof fact.domain === "string" && fact.domain.length > 0 && typeof fact.recordId === "string" && fact.recordId.length > 0 &&
        VIEWER_RELATIONSHIP_TYPES_V1.includes(fact.type) && RELATIONSHIP_FACT_STATUSES_V1.includes(fact.status) &&
        Number.isFinite(startsAt) && (endsAt === null || (Number.isFinite(endsAt) && startsAt < endsAt)) &&
        isContextVersionTokenV1(fact.contextVersion);
}
export function isViewerAuthorizationV1(value) {
    if (!value || typeof value !== "object")
        return false;
    const capability = value;
    const relationshipTypes = Array.isArray(capability.viewerRelationships) ? capability.viewerRelationships.map((relationship) => relationship?.type) : [];
    const allowedActions = Array.isArray(capability.allowedActions) ? capability.allowedActions : [];
    const blockedActions = Array.isArray(capability.blockedActions) ? capability.blockedActions.map((action) => action?.action) : [];
    return capability.schemaVersion === AUTHORIZATION_SCHEMA_VERSION_V1 &&
        typeof capability.systemRole === "string" && SYSTEM_ROLES.includes(capability.systemRole) &&
        Array.isArray(capability.viewerRelationships) && capability.viewerRelationships.every((relationship) => typeof relationship?.type === "string" && VIEWER_RELATIONSHIP_TYPES_V1.includes(relationship.type) &&
            (relationship.status === "ACTIVE" || relationship.status === "INACTIVE") &&
            typeof relationship.effectiveFrom === "string" && (typeof relationship.effectiveUntil === "string" || relationship.effectiveUntil === null)) &&
        Array.isArray(capability.viewerRelationships) && isSortedUnique(relationshipTypes) && capability.viewerRelationships.every((relationship) => typeof relationship?.type === "string" && VIEWER_RELATIONSHIP_TYPES_V1.includes(relationship.type)) &&
        Array.isArray(capability.allowedActions) && isSortedUnique(allowedActions) && capability.allowedActions.every(isPermissionActionV1) &&
        Array.isArray(capability.blockedActions) && capability.blockedActions.every((action) => typeof action?.action === "string" && isPermissionActionV1(action.action) && isAuthorizationDecisionCodeV1(action.code) && typeof action.reason === "string") &&
        isSortedUnique(blockedActions) && !blockedActions.some((action) => allowedActions.includes(action)) &&
        typeof capability.policyVersion === "string" && typeof capability.evaluatedAsOf === "string" && isContextVersionTokenV1(capability.contextVersion);
}
function isSortedUnique(values) {
    return values.every((value, index) => index === 0 || values[index - 1] < value);
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
