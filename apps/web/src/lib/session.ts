export const AUTH_SESSION_COOKIE = "rtms_session";

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  systemRole: "SYSTEM_ADMIN" | "SCIENTIFIC_MANAGEMENT_STAFF" | "LEADERSHIP_APPROVAL_AUTHORITY" | "RESEARCHER_INTERNAL_USER";
  unit: string;
  organizationScopes?: Array<{
    id: string;
    code: string;
    name: string;
  }>;
};

export type ShellAccount = {
  id: string;
  username: string;
  name: string;
  /** Account-level system role. Drives navigation only — never a record-scoped capability. */
  systemRole: CurrentUser["systemRole"];
  systemRoleLabel: string;
  unit: string;
  initials: string;
  organizationScopes?: CurrentUser["organizationScopes"];
};

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";
}

export function toShellAccount(user: CurrentUser): ShellAccount {
  return {
    id: user.id,
    username: user.username,
    name: user.displayName,
    systemRole: user.systemRole,
    systemRoleLabel: getSystemRoleLabel(user.systemRole),
    unit: user.unit,
    initials: user.displayName.trim().charAt(0).toUpperCase() || "U",
    organizationScopes: user.organizationScopes
  };
}

export function getSystemRoleLabel(systemRole: CurrentUser["systemRole"]) {
  return systemRole === "SYSTEM_ADMIN"
    ? "Quản trị hệ thống"
    : systemRole === "SCIENTIFIC_MANAGEMENT_STAFF"
      ? "Chuyên viên quản lý khoa học"
      : systemRole === "LEADERSHIP_APPROVAL_AUTHORITY"
        ? "Lãnh đạo phê duyệt"
        : "Người dùng nghiên cứu nội bộ";
}
