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
  _context: PermissionContext,
  _action: PermissionAction,
  _resource: PermissionResource
): PermissionDecision {
  return {
    allowed: false,
    reason: "Permission policy is not configured for this resource."
  };
}
