import { SYSTEM_ROLES, type SystemRole } from "@rtms/permissions/system-roles";

export { SYSTEM_ROLES, type SystemRole };

export const AUTH_SESSION_COOKIE = "rtms_session";
export const AUTH_FAILURE_MESSAGE = "Tên đăng nhập hoặc mật khẩu không hợp lệ.";

export type InternalUserStatus = "active" | "disabled";

export type InternalUser = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  status: InternalUserStatus;
  systemRole: SystemRole;
  unit: string;
  organizationScopes: OrganizationScope[];
  mustChangePassword?: boolean;
  credentialVersion: number;
  researcherProfileId?: string;
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
  systemRole: SystemRole;
  unit: string;
  organizationScopes: OrganizationScope[];
  mustChangePassword?: boolean;
  researcherProfileId?: string;
};

export type AuthSession = {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
  credentialVersion: number;
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
