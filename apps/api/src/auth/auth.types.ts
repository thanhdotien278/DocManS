import { SYSTEM_ROLES, type SystemRole } from "@rtms/permissions/system-roles";

export { SYSTEM_ROLES, type SystemRole };

export const AUTH_SESSION_COOKIE = "rtms_session";
export const AUTH_FAILURE_MESSAGE = "Tên đăng nhập hoặc mật khẩu không hợp lệ.";
export const AUTH_PENDING_APPROVAL_MESSAGE = "Tài khoản đang chờ cán bộ quản lý khoa học duyệt.";
/** Story 13.11: QT, TB, CV duyệt yêu cầu tự đăng ký, không phụ thuộc scope đơn vị (D-044). */
export const REGISTRATION_APPROVER_ROLES = ["SYSTEM_ADMIN", "RESEARCH_BOARD_HEAD", "RESEARCH_MANAGEMENT_STAFF"] as const;

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
  /** Cookie value. Only present on a freshly created session; the database keeps its SHA-256 as `id`. */
  token?: string;
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
