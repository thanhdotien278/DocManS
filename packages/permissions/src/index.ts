export type UserRole =
  | "system-admin"
  | "scientific-management"
  | "leadership"
  | "principal-investigator"
  | "reviewer"
  | "council-member";

export type PermissionAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "submit"
  | "approve"
  | "reject"
  | "assign"
  | "export";

export type PermissionResource =
  | "workspace"
  | "user"
  | "role"
  | "organization"
  | "catalog"
  | "research-proposal"
  | "approved-project"
  | "task"
  | "file"
  | "dashboard"
  | "report";

export type PermissionContext = {
  userId?: string;
  roles?: UserRole[];
  organizationUnitIds?: string[];
  resourceOwnerId?: string;
  resourceOrganizationUnitId?: string;
  workflowState?: string;
};

export type PermissionDecision = {
  allowed: boolean;
  reason: string;
};

export function evaluatePermission(
  context: PermissionContext,
  action: PermissionAction,
  resource: PermissionResource
): PermissionDecision {
  if (!context.userId || !context.roles?.length) {
    return {
      allowed: false,
      reason: "Missing authenticated actor context."
    };
  }

  const isFoundationResource = resource === "user" || resource === "role" || resource === "organization" || resource === "catalog";
  const isManagementAction = action === "read" || action === "create" || action === "update" || action === "delete";

  if (context.roles.includes("system-admin") && isFoundationResource && isManagementAction) {
    return {
      allowed: true,
      reason: "System administrator can manage platform foundation resources."
    };
  }

  if (!context.organizationUnitIds?.length) {
    return {
      allowed: false,
      reason: "Missing organization scope context."
    };
  }

  if (resource === "dashboard" && action === "read") {
    return {
      allowed: true,
      reason: "Authenticated scoped users can read their dashboard context."
    };
  }

  return {
    allowed: false,
    reason: "Permission policy denies this action for the current role and scope."
  };
}
