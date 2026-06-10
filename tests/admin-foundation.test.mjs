import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ForbiddenException } from "@nestjs/common";
import { AdminCatalogsController } from "../dist/apps/api/admin/admin-catalogs.controller.js";
import { AdminCatalogsService } from "../dist/apps/api/admin/admin-catalogs.service.js";
import { AdminConfigController } from "../dist/apps/api/admin/admin-config.controller.js";
import { AdminConfigService } from "../dist/apps/api/admin/admin-config.service.js";
import { adminRequestPipe } from "../dist/apps/api/admin/admin-request.pipe.js";
import { AdminUsersController } from "../dist/apps/api/admin/admin-users.controller.js";
import { AdminUsersService } from "../dist/apps/api/admin/admin-users.service.js";
import { evaluatePermission } from "../dist/apps/api/permissions/permission-policy.js";

const adminUser = {
  id: "user-admin",
  username: "admin",
  displayName: "Admin",
  role: "system-admin",
  roleLabel: "Quản trị hệ thống",
  unit: "Học viện Quân y",
  roles: ["system-admin"],
  organizationScopes: [{ id: "org-root", code: "HVQY", name: "Học viện Quân y" }]
};

const staffUser = {
  ...adminUser,
  id: "user-staff",
  username: "staff",
  role: "scientific-management",
  roleLabel: "Chuyên viên",
  roles: ["scientific-management"]
};

function createAuditLog() {
  return {
    records: [],
    async record(input) {
      this.records.push(input);
      return input;
    }
  };
}

function createPasswordService() {
  return {
    async hashPassword(password) {
      return `hashed:${password}`;
    }
  };
}

function createAdminPrisma() {
  const store = {
    users: [],
    roleAssignments: [],
    organizationScopes: [],
    catalogs: [],
    systemParameters: [],
    notificationTemplates: []
  };

  return {
    store,
    role: {
      async findMany() {
        return store.roles ?? [
          { id: "role-admin", code: "system-admin", label: "Quản trị hệ thống", status: "active" },
          { id: "role-staff", code: "scientific-management", label: "Chuyên viên", status: "active" }
        ];
      },
      async findUnique({ where }) {
        const roles = store.roles ?? [
          { id: "role-admin", code: "system-admin", label: "Quản trị hệ thống", status: "active" },
          { id: "role-staff", code: "scientific-management", label: "Chuyên viên", status: "active" }
        ];
        return roles.find((role) => role.code === where.code || role.id === where.id) ?? null;
      },
      async create({ data }) {
        const record = { id: "role-created", createdAt: new Date(), updatedAt: new Date(), ...data };
        store.roles = [...(store.roles ?? []), record];
        return record;
      },
      async update({ where, data }) {
        const current = store.roles ?? [
          { id: "role-admin", code: "system-admin", label: "Quản trị hệ thống", status: "active" }
        ];
        const index = current.findIndex((role) => role.id === where.id);
        current[index] = { ...current[index], ...data, updatedAt: new Date() };
        store.roles = current;
        return current[index];
      }
    },
    organizationUnit: {
      async findMany() {
        return store.units ?? [{ id: "org-root", code: "HVQY", name: "Học viện Quân y", status: "active" }];
      },
      async findUnique({ where }) {
        const units = store.units ?? [{ id: "org-root", code: "HVQY", name: "Học viện Quân y", status: "active" }];
        return units.find((unit) => unit.id === where.id || unit.code === where.code) ?? null;
      },
      async create({ data }) {
        const record = { id: "unit-created", createdAt: new Date(), updatedAt: new Date(), ...data };
        store.units = [...(store.units ?? []), record];
        return record;
      },
      async update({ where, data }) {
        const current = store.units ?? [{ id: "org-root", code: "HVQY", name: "Học viện Quân y", status: "active" }];
        const index = current.findIndex((unit) => unit.id === where.id);
        current[index] = { ...current[index], ...data, updatedAt: new Date() };
        store.units = current;
        return current[index];
      }
    },
    user: {
      async findMany(args = {}) {
        const where = args.where ?? {};
        return store.users.filter((user) => {
          const search = where.OR?.[0]?.username?.contains ?? where.OR?.[1]?.displayName?.contains;
          if (search) {
            const normalized = search.toLowerCase();
            const matchesSearch =
              user.username.toLowerCase().includes(normalized) ||
              user.displayName.toLowerCase().includes(normalized);
            if (!matchesSearch) {
              return false;
            }
          }
          if (where.role && user.role !== where.role) {
            return false;
          }
          const roleCode = where.roleAssignments?.some?.role?.code;
          if (roleCode && !user.roleAssignments?.some((assignment) => assignment.role?.code === roleCode)) {
            return false;
          }
          const roleId = where.roleAssignments?.some?.roleId;
          if (roleId && !user.roleAssignments?.some((assignment) => assignment.role?.id === roleId)) {
            return false;
          }
          if (where.unit && user.unit !== where.unit) {
            return false;
          }
          const organizationUnitId = where.organizationScopes?.some?.organizationUnitId;
          if (organizationUnitId && !user.organizationScopes?.some((scope) => scope.organizationUnit?.id === organizationUnitId)) {
            return false;
          }
          if (where.status && user.status !== where.status) {
            return false;
          }
          return true;
        });
      },
      async findUnique({ where }) {
        return store.users.find((user) => user.id === where.id || user.usernameKey === where.usernameKey) ?? null;
      },
      async create({ data }) {
        const record = { id: "user-created", createdAt: new Date(), updatedAt: new Date(), ...data };
        store.users.push(record);
        return record;
      },
      async update({ where, data }) {
        const index = store.users.findIndex((user) => user.id === where.id);
        store.users[index] = { ...store.users[index], ...data, updatedAt: new Date() };
        return store.users[index];
      }
    },
    userRoleAssignment: {
      async create({ data }) {
        store.roleAssignments.push(data);
        return data;
      },
      async deleteMany({ where }) {
        const before = store.roleAssignments.length;
        store.roleAssignments = store.roleAssignments.filter((assignment) => assignment.userId !== where.userId);
        return { count: before - store.roleAssignments.length };
      }
    },
    userOrganizationScope: {
      async create({ data }) {
        store.organizationScopes.push(data);
        return data;
      },
      async deleteMany({ where }) {
        const before = store.organizationScopes.length;
        store.organizationScopes = store.organizationScopes.filter((scope) => scope.userId !== where.userId);
        return { count: before - store.organizationScopes.length };
      }
    },
    catalogItem: {
      async findMany() {
        return store.catalogs.filter((item) => !item.deletedAt);
      },
      async create({ data }) {
        const record = { id: "catalog-created", createdAt: new Date(), updatedAt: new Date(), deletedAt: null, ...data };
        store.catalogs.push(record);
        return record;
      },
      async update({ where, data }) {
        const index = store.catalogs.findIndex((item) => item.id === where.id);
        store.catalogs[index] = { ...store.catalogs[index], ...data, updatedAt: new Date() };
        return store.catalogs[index];
      }
    },
    systemParameter: {
      async upsert({ where, create, update }) {
        const index = store.systemParameters.findIndex((item) => item.key === where.key);
        if (index >= 0) {
          store.systemParameters[index] = { ...store.systemParameters[index], ...update, updatedAt: new Date() };
          return store.systemParameters[index];
        }
        const record = { id: "parameter-created", createdAt: new Date(), updatedAt: new Date(), ...create };
        store.systemParameters.push(record);
        return record;
      }
    },
    notificationTemplate: {
      async upsert({ where, create, update }) {
        const index = store.notificationTemplates.findIndex((item) => item.key === where.key);
        if (index >= 0) {
          store.notificationTemplates[index] = { ...store.notificationTemplates[index], ...update, updatedAt: new Date() };
          return store.notificationTemplates[index];
        }
        const record = { id: "template-created", createdAt: new Date(), updatedAt: new Date(), ...create };
        store.notificationTemplates.push(record);
        return record;
      }
    }
  };
}

describe("admin foundation API behavior", () => {
  it("admin user endpoints fail closed for non-admin users", async () => {
    const prisma = createAdminPrisma();
    const controller = new AdminUsersController(
      new AdminUsersService(prisma, createAuditLog(), createPasswordService())
    );

    await assert.rejects(
      () => controller.listUsers({ currentUser: staffUser }),
      (error) => error instanceof ForbiddenException && error.getStatus() === 403
    );
  });

  it("creates a user with role and organization scope assignments and an audit row", async () => {
    const prisma = createAdminPrisma();
    const auditLog = createAuditLog();
    const service = new AdminUsersService(prisma, auditLog, createPasswordService());

    const result = await service.createUser(adminUser, {
      username: "new.staff",
      displayName: "New Staff",
      password: "ChangeMe123",
      roleCode: "system-admin",
      organizationUnitId: "org-root"
    });

    assert.equal(result.username, "new.staff");
    assert.equal(prisma.store.users[0].passwordHash, "hashed:ChangeMe123");
    assert.deepEqual(prisma.store.roleAssignments[0], {
      userId: "user-created",
      roleId: "role-admin",
      isPrimary: true
    });
    assert.deepEqual(prisma.store.organizationScopes[0], {
      userId: "user-created",
      organizationUnitId: "org-root",
      isPrimary: true
    });
    assert.equal(auditLog.records[0].action, "AUD-ST-1.3-01");
    assert.equal(auditLog.records[0].actorId, "user-admin");
    assert.equal(auditLog.records[0].targetEntity, "user");
    assert.equal(auditLog.records[0].targetEntityId, "user-created");
  });

  it("TEST-ST-1.3-API-FILTER-01..08 lists, searches, filters, combines, and safely rejects invalid status", async () => {
    const prisma = createAdminPrisma();
    const auditLog = createAuditLog();
    prisma.store.users.push(
      {
        id: "user-1",
        username: "alice.pi",
        usernameKey: "alice.pi",
        displayName: "Alice PI",
        status: "active",
        role: "principal-investigator",
        roleLabel: "Chủ nhiệm đề tài",
        unit: "Khoa A",
        passwordHash: "secret",
        roleAssignments: [{ isPrimary: true, role: { id: "role-pi", code: "principal-investigator", label: "Chủ nhiệm đề tài" } }],
        organizationScopes: [{ isPrimary: true, organizationUnit: { id: "org-a", name: "Khoa A" } }]
      },
      {
        id: "user-2",
        username: "bob.staff",
        usernameKey: "bob.staff",
        displayName: "Bob Staff",
        status: "locked",
        role: "scientific-management",
        roleLabel: "Chuyên viên",
        unit: "Khoa B",
        passwordHash: "secret",
        roleAssignments: [{ isPrimary: true, role: { id: "role-staff", code: "scientific-management", label: "Chuyên viên" } }],
        organizationScopes: [{ isPrimary: true, organizationUnit: { id: "org-b", name: "Khoa B" } }]
      },
      {
        id: "user-3",
        username: "charlie.reviewer",
        usernameKey: "charlie.reviewer",
        displayName: "Charlie Reviewer",
        status: "disabled",
        role: "reviewer",
        roleLabel: "Phản biện",
        unit: "Khoa A",
        passwordHash: "secret",
        roleAssignments: [{ isPrimary: true, role: { id: "role-reviewer", code: "reviewer", label: "Phản biện" } }],
        organizationScopes: [{ isPrimary: true, organizationUnit: { id: "org-a", name: "Khoa A" } }]
      }
    );
    const service = new AdminUsersService(prisma, auditLog, createPasswordService());

    assert.deepEqual(
      (await service.listUsers()).map((user) => user.username),
      ["alice.pi", "bob.staff", "charlie.reviewer"]
    );
    assert.equal(auditLog.records.length, 0);
    assert.equal("passwordHash" in (await service.listUsers())[0], false);
    assert.deepEqual(
      (await service.listUsers({ keyword: "  ALICE  " })).map((user) => user.username),
      ["alice.pi"]
    );
    assert.deepEqual(
      (await service.listUsers({ keyword: "reviewer" })).map((user) => user.username),
      ["charlie.reviewer"]
    );
    assert.deepEqual(
      (await service.listUsers({ roleCode: "principal-investigator" })).map((user) => user.username),
      ["alice.pi"]
    );
    assert.deepEqual(
      (await service.listUsers({ roleId: "role-staff" })).map((user) => user.username),
      ["bob.staff"]
    );
    assert.deepEqual(
      (await service.listUsers({ organizationId: "org-a" })).map((user) => user.username),
      ["alice.pi", "charlie.reviewer"]
    );
    assert.deepEqual(
      (await service.listUsers({ status: "locked" })).map((user) => user.username),
      ["bob.staff"]
    );
    assert.deepEqual(
      (
        await service.listUsers({
          keyword: "alice",
          roleCode: "principal-investigator",
          organizationId: "org-a",
          status: "active"
        })
      ).map((user) => user.username),
      ["alice.pi"]
    );
    assert.deepEqual((await service.listUsers({ keyword: "missing-user" })).map((user) => user.username), []);
    await assert.rejects(() => service.listUsers({ status: "all" }), { name: "BadRequestException" });
  });

  it("TEST-ST-1.3-SVC-02..06 updates profile, role, scope, and status with specific audit IDs", async () => {
    const prisma = createAdminPrisma();
    const auditLog = createAuditLog();
    const service = new AdminUsersService(prisma, auditLog, createPasswordService());
    prisma.store.roles = [
      { id: "role-admin", code: "system-admin", label: "Quản trị hệ thống", status: "active" },
      { id: "role-staff", code: "scientific-management", label: "Chuyên viên", status: "active" }
    ];
    prisma.store.units = [
      { id: "org-root", code: "HVQY", name: "Học viện Quân y", status: "active" },
      { id: "org-child", code: "KHOA", name: "Khoa chuyên môn", status: "active" }
    ];
    prisma.store.users.push({
      id: "target-user",
      username: "target",
      usernameKey: "target",
      displayName: "Target",
      status: "active",
      role: "system-admin",
      roleLabel: "Quản trị hệ thống",
      unit: "Học viện Quân y",
      passwordHash: "secret"
    });

    await service.updateUser(adminUser, "target-user", {
      displayName: "Updated Target",
      roleCode: "scientific-management",
      organizationUnitId: "org-child"
    });
    await service.setUserStatus(adminUser, "target-user", "locked");
    await service.setUserStatus(adminUser, "target-user", "active");

    assert.equal(prisma.store.users[0].displayName, "Updated Target");
    assert.equal(prisma.store.users[0].role, "scientific-management");
    assert.equal(prisma.store.users[0].unit, "Khoa chuyên môn");
    assert.equal(prisma.store.users[0].status, "active");
    assert.deepEqual(
      auditLog.records.map((record) => record.action),
      ["AUD-ST-1.3-02", "AUD-ST-1.3-03", "AUD-ST-1.3-04", "AUD-ST-1.3-05", "AUD-ST-1.3-06"]
    );
    assert.equal(auditLog.records.some((record) => JSON.stringify(record).includes("secret")), false);
  });

  it("catalog and config endpoints require admin and record audits", async () => {
    const prisma = createAdminPrisma();
    const auditLog = createAuditLog();
    const catalogController = new AdminCatalogsController(new AdminCatalogsService(prisma, auditLog));
    const configController = new AdminConfigController(new AdminConfigService(prisma, auditLog));

    await assert.rejects(
      () => catalogController.createCatalogItem({ currentUser: staffUser }, { type: "research-field", code: "AI", name: "AI" }),
      ForbiddenException
    );

    await catalogController.createCatalogItem(
      { currentUser: adminUser },
      { type: "research-field", code: "AI", name: "Trí tuệ nhân tạo" }
    );
    await configController.updateSystemParameter(
      { currentUser: adminUser },
      { key: "session_timeout_minutes", value: "720", label: "Thời gian phiên" }
    );
    await configController.updateNotificationTemplate(
      { currentUser: adminUser },
      { key: "login_notice", subject: "Thông báo", body: "Nội dung mẫu" }
    );

    assert.deepEqual(
      auditLog.records.map((record) => record.action),
      ["create-catalog", "update-system-parameter", "update-notification-template"]
    );
  });

  it("admin can create and update roles and organization units with audit rows", async () => {
    const prisma = createAdminPrisma();
    const auditLog = createAuditLog();
    const service = new AdminUsersService(prisma, auditLog, createPasswordService());

    const role = await service.createRole(adminUser, {
      code: "council-member",
      label: "Thành viên hội đồng",
      description: "Tham gia hội đồng đánh giá"
    });
    const updatedRole = await service.updateRole(adminUser, role.id, { status: "inactive" });
    const unit = await service.createOrganizationUnit(adminUser, { code: "QYCT", name: "Khoa Quân y cơ sở" });
    const updatedUnit = await service.updateOrganizationUnit(adminUser, unit.id, { status: "inactive" });

    assert.equal(updatedRole.status, "inactive");
    assert.equal(updatedUnit.status, "inactive");
    assert.deepEqual(
      auditLog.records.map((record) => record.action),
      ["create-role", "update-role", "create-organization-unit", "update-organization-unit"]
    );
  });

  it("permission primitives fail closed without complete context and allow admin management actions", () => {
    assert.deepEqual(evaluatePermission({}, "update", "catalog"), {
      allowed: false,
      reason: "Missing authenticated actor context."
    });

    assert.deepEqual(
      evaluatePermission(
        { userId: "user-admin", roles: ["system-admin"], organizationUnitIds: ["org-root"] },
        "update",
        "catalog"
      ),
      { allowed: true, reason: "System administrator can manage platform foundation resources." }
    );
  });

  it("admin DTO validation rejects malformed request bodies before service handling", () => {
    const pipe = adminRequestPipe({
      username: { maxLength: 80 },
      displayName: { maxLength: 160 },
      password: { maxLength: 256 }
    });

    assert.throws(() => pipe.transform(null), { name: "BadRequestException" });
    assert.throws(() => pipe.transform({ username: "admin", displayName: "", password: "x" }), {
      name: "BadRequestException"
    });
    assert.throws(() => pipe.transform({ username: "a".repeat(81), displayName: "Admin", password: "x" }), {
      name: "BadRequestException"
    });
    assert.deepEqual(pipe.transform({ username: "admin", displayName: "Admin", password: "x" }), {
      username: "admin",
      displayName: "Admin",
      password: "x"
    });
  });
});
