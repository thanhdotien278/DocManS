type PermissionAction = "read" | "create" | "update" | "delete" | "submit" | "approve" | "reject" | "assign" | "export";
type PermissionResource =
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
type PermissionContext = {
  userId?: string;
  roles?: Array<"system-admin" | "scientific-management" | "leadership" | "principal-investigator" | "reviewer" | "council-member">;
  organizationUnitIds?: string[];
  resourceOwnerId?: string;
  resourceOrganizationUnitId?: string;
  workflowState?: string;
};
type PermissionDecision = {
  allowed: boolean;
  reason: string;
};

const FOUNDATION_RESOURCES: PermissionResource[] = ["user", "role", "organization", "catalog"];
const MANAGEMENT_ACTIONS: PermissionAction[] = ["read", "create", "update", "delete"];

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

  if (context.roles.includes("system-admin") && FOUNDATION_RESOURCES.includes(resource) && MANAGEMENT_ACTIONS.includes(action)) {
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
