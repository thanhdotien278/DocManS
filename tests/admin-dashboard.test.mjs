import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ForbiddenException } from "@nestjs/common";
import { AdminDashboardService } from "../dist/apps/api/admin/admin-dashboard.service.js";
import { AdminDashboardController } from "../dist/apps/api/admin/admin-users.controller.js";

const now = new Date("2026-11-15T06:00:00.000Z"); // 13:00 giờ Việt Nam
const hoursAgo = (hours) => new Date(now.getTime() - hours * 3_600_000);

function createPrisma() {
  const logins = [
    { timestamp: hoursAgo(1), result: "success", username: "admin" },
    { timestamp: hoursAgo(2), result: "failure", username: "Admin" },
    { timestamp: hoursAgo(3), result: "failure", username: "admin" },
    { timestamp: hoursAgo(4), result: "failure", username: "Mat-khau-go-nham!" },
    { timestamp: hoursAgo(30), result: "failure", username: "admin" },
    // 06:30 giờ VN ngày 15/11 nhưng vẫn là 23:30 UTC ngày 14/11.
    { timestamp: new Date("2026-11-14T23:30:00.000Z"), result: "success", username: "staff" }
  ];
  return {
    user: {
      groupBy: async () => [
        { status: "active", systemRole: "SYSTEM_ADMIN", _count: { _all: 1 } },
        { status: "active", systemRole: "RESEARCHER_INTERNAL_USER", _count: { _all: 3 } },
        { status: "pending_approval", systemRole: "RESEARCHER_INTERNAL_USER", _count: { _all: 2 } }
      ],
      count: async () => 1,
      findMany: async ({ where }) =>
        where.status
          ? [{ id: "u-pending", username: "moi", displayName: "Người mới", status: "pending_approval", systemRole: "RESEARCHER_INTERNAL_USER", unit: "", createdAt: hoursAgo(24 * 9) }]
          : [{ usernameKey: "admin", username: "admin", displayName: "Quản trị", status: "active" }].filter((user) => where.usernameKey.in.includes(user.usernameKey))
    },
    systemRoleMigrationIssue: { count: async () => 0 },
    session: { findMany: async () => [{ userId: "a" }, { userId: "a" }, { userId: "b" }] },
    auditLog: {
      findMany: async ({ where }) =>
        where.action === "login"
          ? logins.filter((login) => login.timestamp >= where.timestamp.gte)
          : [{ id: "log-1", action: "AUD-ST-1.3-05", timestamp: hoursAgo(5), targetEntity: "user", actor: { displayName: "Quản trị", username: "admin" }, username: "admin" }]
    },
    organizationUnit: {
      findMany: async () => [
        { id: "org-a", name: "Khoa A", _count: { userScopes: 3 } },
        { id: "org-b", name: "Khoa B", _count: { userScopes: 0 } }
      ]
    },
    catalogItem: { groupBy: async () => [{ type: "research-field", _count: { _all: 4 } }] }
  };
}

const usersService = { listRoles: async () => [{ code: "SYSTEM_ADMIN", label: "Quản trị hệ thống" }, { code: "RESEARCHER_INTERNAL_USER", label: "Người dùng nghiên cứu nội bộ" }] };

describe("admin dashboard overview", () => {
  it("aggregates real account, session and login facts", async () => {
    const overview = await new AdminDashboardService(createPrisma(), usersService).getOverview(now);

    assert.equal(overview.accounts.total, 6);
    assert.deepEqual(overview.accounts.byStatus, { active: 4, pending_approval: 2 });
    assert.deepEqual(overview.roles.map((role) => role.active), [1, 3]);
    assert.equal(overview.pendingAccounts[0].roleLabel, "Người dùng nghiên cứu nội bộ");
    assert.deepEqual(overview.sessions, { active: 3, users: 2 });

    assert.equal(overview.logins.days.length, 14);
    assert.equal(overview.logins.days.at(-1).date, "2026-11-15");
    assert.deepEqual(overview.logins.days.at(-1), { date: "2026-11-15", success: 2, failure: 3 });
    assert.equal(overview.logins.success24h, 2);
    assert.equal(overview.logins.failure24h, 3);
    // Tên đăng nhập không khớp tài khoản (có thể là mật khẩu gõ nhầm) chỉ được đếm, không trả về.
    assert.deepEqual(overview.logins.failedAccounts.map(({ username, failures }) => [username, failures]), [["admin", 2]]);
    assert.equal(overview.logins.unknownAccountFailures, 1);
    assert.ok(!JSON.stringify(overview).includes("Mat-khau-go-nham!"));

    assert.deepEqual(overview.units, { active: 2, withAccounts: 1, top: [{ id: "org-a", name: "Khoa A", active: 3 }], noPrimaryUnit: 1 });
    assert.equal(overview.recentAdminActions[0].label, "Khóa tài khoản");
  });

  it("is readable only by SYSTEM_ADMIN", async () => {
    const controller = new AdminDashboardController({ getOverview: async () => ({ ok: true }) });
    await assert.rejects(() => controller.getOverview({ currentUser: { id: "s", systemRole: "RESEARCH_MANAGEMENT_STAFF" } }), ForbiddenException);
    assert.deepEqual(await controller.getOverview({ currentUser: { id: "a", systemRole: "SYSTEM_ADMIN" } }), { ok: true });
  });
});
