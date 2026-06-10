export const AUTH_SESSION_COOKIE = "rtms_session";
export const AUTH_FAILURE_MESSAGE = "Tên đăng nhập hoặc mật khẩu không hợp lệ.";

export type InternalUserRole =
  | "system-admin"
  | "leadership"
  | "scientific-management"
  | "principal-investigator"
  | "reviewer"
  | "council-member";

export type InternalUserStatus = "active" | "disabled";

export type InternalUser = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  status: InternalUserStatus;
  role: InternalUserRole;
  roleLabel: string;
  unit: string;
  roles: InternalUserRole[];
  organizationScopes: OrganizationScope[];
};

export type OrganizationScope = {
  id: string;
  code: string;
  name: string;
};

export type SafeUserContext = {
  id: string;
  username: string;
  displayName: string;
  role: InternalUserRole;
  roleLabel: string;
  unit: string;
  roles: InternalUserRole[];
  organizationScopes: OrganizationScope[];
};

export type AuthSession = {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
};

export type AuditAction = string;
export type AuditResult = "success" | "failure";

export type AuditLogRecord = {
  id: string;
  action: AuditAction;
  actorId?: string;
  targetEntity?: string;
  targetEntityId?: string;
  username?: string;
  timestamp: string;
  result: AuditResult;
  context: {
    ip?: string;
    userAgent?: string;
    reason?: string;
  };
};

export type LoginRequest = {
  username?: string;
  password?: string;
};

export type LoginResponse = {
  user: SafeUserContext;
};
