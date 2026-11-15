import { Injectable } from "@nestjs/common";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { AdminUsersService } from "./admin-users.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const LOGIN_SERIES_DAYS = 14;
// Ngày nghiệp vụ tính theo giờ Việt Nam (UTC+7, không có giờ mùa hè).
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const PENDING_STATUSES = ["pending_approval", "pending_email_verification", "pending_activation"];

/** Thao tác quản trị/cấu hình hiển thị ở mục "Thay đổi quản trị gần đây"; mã không có trong bảng thì hiện mã gốc. */
export const ADMIN_ACTION_LABELS: Record<string, string> = {
  "AUD-ST-1.3-01": "Tạo tài khoản",
  "AUD-ST-1.3-02": "Đổi họ tên tài khoản",
  "AUD-ST-1.3-03": "Đổi vai trò hệ thống",
  "AUD-ST-1.3-04": "Đổi đơn vị công tác",
  "AUD-ST-1.3-05": "Khóa tài khoản",
  "AUD-ST-1.3-06": "Mở khóa tài khoản",
  "create-organization-unit": "Tạo đơn vị",
  "update-organization-unit": "Cập nhật đơn vị",
  "create-catalog": "Thêm mục danh mục",
  "update-catalog": "Cập nhật danh mục",
  "soft-delete-catalog": "Ngừng dùng mục danh mục",
  "update-system-parameter": "Cập nhật tham số hệ thống",
  "update-notification-template": "Cập nhật mẫu thông báo",
  "update-council-formation-config": "Cập nhật cấu hình hội đồng",
  "update-participant-policy-config": "Cập nhật chính sách tham gia",
  "approve-registration-request": "Duyệt yêu cầu đăng ký",
  "reject-registration-request": "Từ chối yêu cầu đăng ký",
  "initiate-password-reset": "Cấp lại mật khẩu"
};

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: AdminUsersService
  ) {}

  async getOverview(now = new Date()) {
    const since24h = new Date(now.getTime() - DAY_MS);
    const todayStartVn = Math.floor((now.getTime() + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS;
    const seriesStart = new Date(todayStartVn - (LOGIN_SERIES_DAYS - 1) * DAY_MS);

    const [statusRoleGroups, roles, mustChangePassword, roleIssues, pendingUsers, activeSessions, logins, recentAdminActions, organizationUnits, catalogGroups] =
      await Promise.all([
        this.prisma.user.groupBy({ by: ["status", "systemRole"], _count: { _all: true } }),
        this.usersService.listRoles(),
        this.prisma.user.count({ where: { status: "active", mustChangePassword: true } }),
        this.prisma.systemRoleMigrationIssue.count(),
        this.prisma.user.findMany({
          where: { status: { in: PENDING_STATUSES } },
          select: { id: true, username: true, displayName: true, status: true, systemRole: true, unit: true, createdAt: true },
          orderBy: { createdAt: "asc" },
          take: 8
        }),
        this.prisma.session.findMany({
          where: { revokedAt: null, expiresAt: { gt: now } },
          select: { userId: true }
        }),
        // shortcut: gom ngày bằng JS trên các bản ghi đăng nhập 14 ngày; chuyển sang SQL date_trunc khi lượng đăng nhập lên hàng chục nghìn/ngày.
        this.prisma.auditLog.findMany({
          where: { action: "login", timestamp: { gte: seriesStart } },
          select: { timestamp: true, result: true, username: true }
        }),
        this.prisma.auditLog.findMany({
          where: { action: { in: Object.keys(ADMIN_ACTION_LABELS) }, result: "success" },
          select: { id: true, action: true, timestamp: true, targetEntity: true, actor: { select: { displayName: true, username: true } }, username: true },
          orderBy: { timestamp: "desc" },
          // Lấy dư để web gộp các thao tác liên tiếp giống nhau mà vẫn đủ 8 dòng.
          take: 40
        }),
        this.prisma.organizationUnit.findMany({
          where: { status: "active" },
          select: { id: true, name: true, _count: { select: { userScopes: { where: { isPrimary: true, user: { status: "active" } } } } } }
        }),
        this.prisma.catalogItem.groupBy({ by: ["type"], where: { status: "active" }, _count: { _all: true } })
      ]);

    const roleLabel = new Map<string, string>(roles.map((role) => [role.code, role.label]));
    const byStatus: Record<string, number> = {};
    const activeByRole = new Map<string, number>();
    for (const group of statusRoleGroups) {
      byStatus[group.status] = (byStatus[group.status] ?? 0) + group._count._all;
      if (group.status === "active" && group.systemRole) {
        activeByRole.set(group.systemRole, (activeByRole.get(group.systemRole) ?? 0) + group._count._all);
      }
    }

    const days = Array.from({ length: LOGIN_SERIES_DAYS }, (_, index) => ({
      date: new Date(seriesStart.getTime() + index * DAY_MS + VN_OFFSET_MS).toISOString().slice(0, 10),
      success: 0,
      failure: 0
    }));
    let success24h = 0;
    let failure24h = 0;
    const failuresByUsername = new Map<string, { failures: number; lastAt: Date }>();
    for (const login of logins) {
      const ok = login.result === "success";
      const day = days[Math.floor((login.timestamp.getTime() - seriesStart.getTime()) / DAY_MS)];
      if (day) ok ? day.success++ : day.failure++;
      if (login.timestamp < since24h) continue;
      if (ok) {
        success24h++;
        continue;
      }
      failure24h++;
      const key = (login.username ?? "").trim().toLowerCase();
      const entry = failuresByUsername.get(key) ?? { failures: 0, lastAt: login.timestamp };
      entry.failures++;
      if (login.timestamp > entry.lastAt) entry.lastAt = login.timestamp;
      failuresByUsername.set(key, entry);
    }

    // Chỉ nêu tên đăng nhập trùng tài khoản có thật: người dùng hay gõ nhầm mật khẩu vào ô tên đăng nhập.
    const failedKeys = [...failuresByUsername.keys()].filter(Boolean);
    const knownAccounts = failedKeys.length
      ? await this.prisma.user.findMany({
          where: { usernameKey: { in: failedKeys } },
          select: { usernameKey: true, username: true, displayName: true, status: true }
        })
      : [];
    const failedAccounts = knownAccounts
      .map((account) => ({ username: account.username, displayName: account.displayName, status: account.status, ...failuresByUsername.get(account.usernameKey!)! }))
      .sort((left, right) => right.failures - left.failures)
      .slice(0, 5);
    const unknownAccountFailures = [...failuresByUsername.entries()]
      .filter(([key]) => !knownAccounts.some((account) => account.usernameKey === key))
      .reduce((sum, [, entry]) => sum + entry.failures, 0);

    const activeTotal = byStatus.active ?? 0;
    const scopedActive = organizationUnits.reduce((sum, unit) => sum + unit._count.userScopes, 0);

    return {
      generatedAt: now.toISOString(),
      accounts: {
        total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
        byStatus,
        mustChangePassword,
        roleIssues
      },
      roles: roles.map((role) => ({ code: role.code, label: role.label, active: activeByRole.get(role.code) ?? 0 })),
      pendingAccounts: pendingUsers.map((user) => ({
        ...user,
        roleLabel: user.systemRole ? roleLabel.get(user.systemRole) ?? user.systemRole : null,
        createdAt: user.createdAt.toISOString()
      })),
      sessions: { active: activeSessions.length, users: new Set(activeSessions.map((session) => session.userId)).size },
      logins: { days, success24h, failure24h, failedAccounts: failedAccounts.map((entry) => ({ ...entry, lastAt: entry.lastAt.toISOString() })), unknownAccountFailures },
      units: {
        active: organizationUnits.length,
        withAccounts: organizationUnits.filter((unit) => unit._count.userScopes > 0).length,
        top: organizationUnits
          .filter((unit) => unit._count.userScopes > 0)
          .sort((left, right) => right._count.userScopes - left._count.userScopes || left.name.localeCompare(right.name, "vi"))
          .slice(0, 6)
          .map((unit) => ({ id: unit.id, name: unit.name, active: unit._count.userScopes })),
        noPrimaryUnit: Math.max(activeTotal - scopedActive, 0)
      },
      catalogs: catalogGroups.map((group) => ({ type: group.type, active: group._count._all })).sort((left, right) => right.active - left.active),
      recentAdminActions: recentAdminActions.map((entry) => ({
        id: entry.id,
        action: entry.action,
        label: ADMIN_ACTION_LABELS[entry.action] ?? entry.action,
        actor: entry.actor?.displayName ?? entry.username ?? "Hệ thống",
        targetEntity: entry.targetEntity,
        timestamp: entry.timestamp.toISOString()
      }))
    };
  }
}
