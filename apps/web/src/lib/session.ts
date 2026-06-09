export const AUTH_SESSION_COOKIE = "rtms_session";

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  role: "system-admin" | "leadership" | "scientific-management" | "principal-investigator" | "reviewer" | "council-member";
  roleLabel: string;
  unit: string;
  roles?: CurrentUser["role"][];
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
  role: CurrentUser["role"];
  roleLabel: string;
  unit: string;
  initials: string;
};

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";
}

export function toShellAccount(user: CurrentUser): ShellAccount {
  return {
    id: user.id,
    username: user.username,
    name: user.displayName,
    role: user.role,
    roleLabel: user.roleLabel,
    unit: user.unit,
    initials: user.displayName.trim().charAt(0).toUpperCase() || "U"
  };
}
