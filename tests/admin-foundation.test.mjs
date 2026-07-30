import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ForbiddenException } from "@nestjs/common";
import { AdminCatalogsController } from "../dist/apps/api/admin/admin-catalogs.controller.js";
import { AdminCatalogsService } from "../dist/apps/api/admin/admin-catalogs.service.js";
import { AdminConfigController } from "../dist/apps/api/admin/admin-config.controller.js";
import { AdminConfigService } from "../dist/apps/api/admin/admin-config.service.js";
import { adminRequestPipe } from "../dist/apps/api/admin/admin-request.pipe.js";
import { AdminRolesController, AdminUsersController } from "../dist/apps/api/admin/admin-users.controller.js";
import { AdminUsersService } from "../dist/apps/api/admin/admin-users.service.js";
import { evaluatePermission } from "../dist/apps/api/permissions/permission-policy.js";

const adminUser = {
  id: "user-admin",
  username: "admin",
  displayName: "Admin",
  role: "system-admin",
  roleLabel: "Quản trị hệ thống",
  systemRole: "SYSTEM_ADMIN",
  unit: "Học viện Quân y",
  organizationScopes: [{ id: "org-root", code: "HVQY", name: "Học viện Quân y" }]
};

const staffUser = {
  ...adminUser,
  id: "user-staff",
  username: "staff",
  role: "scientific-management",
  roleLabel: "Chuyên viên",
  systemRole: "SCIENTIFIC_MANAGEMENT_STAFF"
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
    failNextScopeCreate: false,
    catalogs: [],
    systemParameters: [],
    notificationTemplates: []
  };

  const prisma = {
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
          if (where.systemRole && user.systemRole !== where.systemRole) {
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
        if (store.failNextScopeCreate) {
          store.failNextScopeCreate = false;
          throw new Error("scope write failed");
        }
        store.organizationScopes.push(data);
        return data;
      },
      async deleteMany({ where }) {
        const before = store.organizationScopes.length;
        store.organizationScopes = store.organizationScopes.filter(
          (scope) => scope.userId !== where.userId || (where.isPrimary !== undefined && scope.isPrimary !== where.isPrimary)
        );
        return { count: before - store.organizationScopes.length };
      },
      async updateMany({ where, data }) {
        let count = 0;
        store.organizationScopes = store.organizationScopes.map((scope) => {
          if (scope.userId === where.userId && (where.isPrimary === undefined || scope.isPrimary === where.isPrimary)) {
            count += 1;
            return { ...scope, ...data };
          }
          return scope;
        });
        return { count };
      },
      async upsert({ where, create, update }) {
        const key = where.userId_organizationUnitId;
        const index = store.organizationScopes.findIndex(
          (scope) => scope.userId === key.userId && scope.organizationUnitId === key.organizationUnitId
        );
        if (index >= 0) {
          store.organizationScopes[index] = { ...store.organizationScopes[index], ...update };
          return store.organizationScopes[index];
        }
        if (store.failNextScopeCreate) {
          store.failNextScopeCreate = false;
          throw new Error("scope write failed");
        }
        store.organizationScopes.push(create);
        return create;
      }
    },
    catalogItem: {
      async findMany(args = {}) {
        return store.catalogs
          .filter((item) => !item.deletedAt)
          .filter((item) => !args.where?.type || item.type === args.where.type);
      },
      async findUnique({ where }) {
        return store.catalogs.find((item) => item.id === where.id) ?? null;
      },
      async create({ data }) {
        if (store.catalogs.some((item) => item.type === data.type && item.code === data.code)) {
          const error = new Error("Unique constraint failed");
          error.code = "P2002";
          throw error;
        }
        const record = { id: `catalog-${store.catalogs.length + 1}`, createdAt: new Date(), updatedAt: new Date(), deletedAt: null, ...data };
        store.catalogs.push(record);
        return record;
      },
      async update({ where, data }) {
        const index = store.catalogs.findIndex((item) => item.id === where.id);
        store.catalogs[index] = { ...store.catalogs[index], ...data, updatedAt: new Date() };
        return store.catalogs[index];
      },
      async updateMany({ where, data }) {
        let count = 0;
        store.catalogs = store.catalogs.map((item) => {
          const matchesId = where.id === undefined || item.id === where.id;
          const matchesDeletedAt = where.deletedAt === undefined || item.deletedAt === where.deletedAt;
          if (matchesId && matchesDeletedAt) {
            count += 1;
            return { ...item, ...data, updatedAt: new Date() };
          }
          return item;
        });
        return { count };
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
    },
    async $transaction(callback) {
      const users = structuredClone(store.users);
      const organizationScopes = structuredClone(store.organizationScopes);
      const catalogs = structuredClone(store.catalogs);
      const systemParameters = structuredClone(store.systemParameters);
      const notificationTemplates = structuredClone(store.notificationTemplates);
      try {
        return await callback(prisma);
      } catch (error) {
        store.users = users;
        store.organizationScopes = organizationScopes;
        store.catalogs = catalogs;
        store.systemParameters = systemParameters;
        store.notificationTemplates = notificationTemplates;
        throw error;
      }
    }
  };

  return prisma;
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

  it("password-reset initiation is restricted to system administrators and forwards request context", async () => {
    const calls = [];
    const controller = new AdminUsersController({
      async initiatePasswordReset(actor, userId, context) {
        calls.push({ actor, userId, context });
        return { token: "one-time", expiresAt: "2026-07-30T00:30:00.000Z" };
      }
    });
    await assert.rejects(() => controller.initiatePasswordReset({ currentUser: staffUser }, "user-1", {}), ForbiddenException);
    const result = await controller.initiatePasswordReset({ currentUser: adminUser, ip: "127.0.0.1", headers: { "user-agent": "node-test" } }, "user-1", {});
    assert.equal(result.token, "one-time");
    assert.deepEqual(calls[0].context, { ip: "127.0.0.1", userAgent: "node-test" });
  });

  it("accepts each canonical system role when creating a user", async () => {
    const prisma = createAdminPrisma();
    const auditLog = createAuditLog();
    const service = new AdminUsersService(prisma, auditLog, createPasswordService());

    for (const [index, systemRole] of [
      "SYSTEM_ADMIN",
      "SCIENTIFIC_MANAGEMENT_STAFF",
      "LEADERSHIP_APPROVAL_AUTHORITY",
      "RESEARCHER_INTERNAL_USER"
    ].entries()) {
      const result = await service.createUser(adminUser, {
        username: `new.user.${index}`,
        displayName: `New User ${index}`,
        password: "ChangeMe123",
        systemRole,
        organizationUnitId: "org-root"
      });

      assert.equal(result.username, `new.user.${index}`);
      assert.equal(prisma.store.users[index].passwordHash, "hashed:ChangeMe123");
      assert.equal(prisma.store.users[index].systemRole, systemRole);
    }

    assert.equal(prisma.store.organizationScopes.length, 4);
    assert.deepEqual(auditLog.records.map((record) => record.action), ["AUD-ST-1.3-01", "AUD-ST-1.3-01", "AUD-ST-1.3-01", "AUD-ST-1.3-01"]);
  });

  it("Story 1.4: rolls back user creation when the initial organization scope cannot be written", async () => {
    const prisma = createAdminPrisma();
    const service = new AdminUsersService(prisma, createAuditLog(), createPasswordService());
    prisma.store.failNextScopeCreate = true;

    await assert.rejects(
      () => service.createUser(adminUser, {
        username: "scope.failure",
        displayName: "Scope Failure",
        password: "ChangeMe123",
        systemRole: "RESEARCHER_INTERNAL_USER",
        organizationUnitId: "org-root"
      }),
      /scope write failed/
    );

    assert.deepEqual(prisma.store.users, []);
    assert.deepEqual(prisma.store.organizationScopes, []);
  });

  it("rejects non-canonical system roles for user create and update", async () => {
    const prisma = createAdminPrisma();
    const service = new AdminUsersService(prisma, createAuditLog(), createPasswordService());

    await assert.rejects(
      () => service.createUser(adminUser, {
        username: "invalid.role",
        displayName: "Invalid Role",
        password: "ChangeMe123",
        systemRole: "reviewer",
        organizationUnitId: "org-root"
      }),
      { name: "BadRequestException" }
    );

    prisma.store.users.push({
      id: "target-user",
      username: "target",
      usernameKey: "target",
      displayName: "Target",
      status: "active",
      role: "system-admin",
      roleLabel: "Quản trị hệ thống",
      systemRole: "SYSTEM_ADMIN",
      unit: "Học viện Quân y",
      passwordHash: "secret"
    });
    await assert.rejects(() => service.updateUser(adminUser, "target-user", { systemRole: "ROLE_ADMIN" }), {
      name: "BadRequestException"
    });
    assert.equal(prisma.store.users[0].systemRole, "SYSTEM_ADMIN");
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
        systemRole: "RESEARCHER_INTERNAL_USER",
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
        systemRole: "SCIENTIFIC_MANAGEMENT_STAFF",
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
        systemRole: "RESEARCHER_INTERNAL_USER",
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
      (await service.listUsers({ systemRole: "RESEARCHER_INTERNAL_USER" })).map((user) => user.username),
      ["alice.pi", "charlie.reviewer"]
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
          systemRole: "RESEARCHER_INTERNAL_USER",
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
      systemRole: "SYSTEM_ADMIN",
      unit: "Học viện Quân y",
      passwordHash: "secret"
    });

    await service.updateUser(adminUser, "target-user", {
      displayName: "Updated Target",
      systemRole: "SCIENTIFIC_MANAGEMENT_STAFF",
      organizationUnitId: "org-child"
    });
    await service.setUserStatus(adminUser, "target-user", "locked");
    await service.setUserStatus(adminUser, "target-user", "active");

    assert.equal(prisma.store.users[0].displayName, "Updated Target");
    assert.equal(prisma.store.users[0].systemRole, "SCIENTIFIC_MANAGEMENT_STAFF");
    assert.equal(prisma.store.users[0].unit, "Khoa chuyên môn");
    assert.equal(prisma.store.users[0].status, "active");
    assert.deepEqual(
      auditLog.records.map((record) => record.action),
      ["AUD-ST-1.3-02", "AUD-ST-1.3-03", "AUD-ST-1.3-04", "AUD-ST-1.3-05", "AUD-ST-1.3-06"]
    );
    assert.equal(auditLog.records.some((record) => JSON.stringify(record).includes("secret")), false);
  });

  it("Story 1.4 Session 5: rolls back role, status, and scope when the scope write fails", async () => {
    const prisma = createAdminPrisma();
    const auditLog = createAuditLog();
    const service = new AdminUsersService(prisma, auditLog, createPasswordService());
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
      systemRole: "SYSTEM_ADMIN",
      unit: "Học viện Quân y",
      passwordHash: "secret"
    });
    prisma.store.organizationScopes.push({ userId: "target-user", organizationUnitId: "org-root", isPrimary: true });
    prisma.store.failNextScopeCreate = true;

    await assert.rejects(
      () =>
        service.updateUser(adminUser, "target-user", {
          systemRole: "SCIENTIFIC_MANAGEMENT_STAFF",
          organizationUnitId: "org-child",
          status: "locked"
        }),
      /scope write failed/
    );

    assert.deepEqual(
      { systemRole: prisma.store.users[0].systemRole, status: prisma.store.users[0].status, unit: prisma.store.users[0].unit },
      { systemRole: "SYSTEM_ADMIN", status: "active", unit: "Học viện Quân y" }
    );
    assert.deepEqual(prisma.store.organizationScopes, [{ userId: "target-user", organizationUnitId: "org-root", isPrimary: true }]);
    assert.deepEqual(auditLog.records, []);
  });

  it("Story 1.4: keeps explicit secondary scopes when the primary scope changes", async () => {
    const prisma = createAdminPrisma();
    const service = new AdminUsersService(prisma, createAuditLog(), createPasswordService());
    prisma.store.units = [
      { id: "org-root", code: "HVQY", name: "Học viện Quân y", status: "active" },
      { id: "org-child", code: "KHOA", name: "Khoa chuyên môn", status: "active" },
      { id: "org-explicit", code: "KHQS", name: "Phòng KHQS", status: "active" }
    ];
    prisma.store.users.push({
      id: "target-user", username: "target", usernameKey: "target", displayName: "Target", status: "active",
      systemRole: "SYSTEM_ADMIN", unit: "Học viện Quân y", passwordHash: "secret"
    });
    prisma.store.organizationScopes.push(
      { userId: "target-user", organizationUnitId: "org-root", isPrimary: true },
      { userId: "target-user", organizationUnitId: "org-explicit", isPrimary: false }
    );

    await service.updateUser(adminUser, "target-user", { organizationUnitId: "org-child" });

    assert.deepEqual(prisma.store.organizationScopes, [
      { userId: "target-user", organizationUnitId: "org-root", isPrimary: false },
      { userId: "target-user", organizationUnitId: "org-explicit", isPrimary: false },
      { userId: "target-user", organizationUnitId: "org-child", isPrimary: true }
    ]);
  });

  it("Story 1.6: catalog APIs require admin, validate supported changes, soft-delete, and audit successes", async () => {
    const prisma = createAdminPrisma();
    const auditLog = createAuditLog();
    const catalogController = new AdminCatalogsController(new AdminCatalogsService(prisma, auditLog));

    await assert.rejects(
      () => catalogController.createCatalogItem({ currentUser: staffUser }, { type: "research-field", code: "AI", name: "AI" }),
      ForbiddenException
    );

    const created = await catalogController.createCatalogItem(
      { currentUser: adminUser },
      { type: "research-field", code: "AI", name: "Trí tuệ nhân tạo" }
    );
    assert.equal(created.item.status, "active");
    await assert.rejects(
      () => catalogController.createCatalogItem({ currentUser: adminUser }, { type: "research-field", code: "AI", name: "Trùng mã" }),
      { name: "BadRequestException" }
    );
    await assert.rejects(
      () => catalogController.updateCatalogItem({ currentUser: adminUser }, created.item.id, { code: "AI-NEW" }),
      { name: "BadRequestException" }
    );
    await assert.rejects(
      () => catalogController.updateCatalogItem({ currentUser: adminUser }, created.item.id, { type: "proposal-type" }),
      { name: "BadRequestException" }
    );
    await assert.rejects(
      () => catalogController.updateCatalogItem({ currentUser: adminUser }, created.item.id, {}),
      { name: "BadRequestException" }
    );

    const updated = await catalogController.updateCatalogItem(
      { currentUser: adminUser },
      created.item.id,
      { name: "Trí tuệ nhân tạo ứng dụng", description: "Nhóm lĩnh vực thử nghiệm", status: "inactive" }
    );
    assert.equal(updated.item.name, "Trí tuệ nhân tạo ứng dụng");
    assert.equal(updated.item.status, "inactive");

    const activeAgain = await catalogController.updateCatalogItem(
      { currentUser: adminUser },
      created.item.id,
      { status: "active" }
    );
    assert.equal(activeAgain.item.status, "active");

    await catalogController.softDeleteCatalogItem({ currentUser: adminUser }, created.item.id);
    assert.deepEqual(await catalogController.listCatalogItems({ currentUser: adminUser }, "research-field"), { items: [] });
    await assert.rejects(
      () => catalogController.updateCatalogItem({ currentUser: adminUser }, created.item.id, { status: "inactive" }),
      { name: "NotFoundException" }
    );

    assert.deepEqual(
      auditLog.records.map((record) => record.action),
      ["create-catalog", "update-catalog", "update-catalog", "soft-delete-catalog"]
    );
  });

  it("Story 1.6: config APIs reject unsupported parameters/templates/placeholders without partial persistence", async () => {
    const prisma = createAdminPrisma();
    const auditLog = createAuditLog();
    const configController = new AdminConfigController(new AdminConfigService(prisma, auditLog));

    await assert.rejects(
      () => configController.updateSystemParameter({ currentUser: staffUser }, { key: "session_timeout_minutes", value: "720", label: "Thời gian phiên" }),
      ForbiddenException
    );

    await configController.updateSystemParameter(
      { currentUser: adminUser },
      { key: "session_timeout_minutes", value: "720", label: "Thời gian phiên" }
    );
    await assert.rejects(
      () => configController.updateSystemParameter({ currentUser: adminUser }, { key: "session_timeout_minutes", value: "0", label: "Thời gian phiên" }),
      { name: "BadRequestException" }
    );
    await assert.rejects(
      () => configController.updateSystemParameter({ currentUser: adminUser }, { key: "unknown_parameter", value: "1", label: "Không hỗ trợ" }),
      { name: "BadRequestException" }
    );
    assert.deepEqual(
      prisma.store.systemParameters.map((record) => `${record.key}:${record.value}`),
      ["session_timeout_minutes:720"]
    );

    await configController.updateNotificationTemplate(
      { currentUser: adminUser },
      {
        key: "user_created",
        subject: "Tài khoản {{username}} đã được tạo",
        body: "Xin chào {{displayName}}, tài khoản {{username}} đã sẵn sàng."
      }
    );
    await assert.rejects(
      () =>
        configController.updateNotificationTemplate(
          { currentUser: adminUser },
          {
            key: "user_created",
            subject: "Tài khoản {{rawPassword}}",
            body: "Nội dung {{unknown}}"
          }
        ),
      { name: "BadRequestException" }
    );
    await assert.rejects(
      () =>
        configController.updateNotificationTemplate(
          { currentUser: adminUser },
          {
            key: "login_notice",
            subject: "Thông báo",
            body: "Nội dung"
          }
        ),
      { name: "BadRequestException" }
    );

    prisma.store.notificationTemplates[0].status = "inactive";
    await configController.updateNotificationTemplate(
      { currentUser: adminUser },
      {
        key: "user_created",
        subject: "Tài khoản {{username}} đã cập nhật",
        body: "Xin chào {{displayName}}, tài khoản {{username}} đã cập nhật."
      }
    );
    assert.equal(prisma.store.notificationTemplates[0].status, "inactive");

    assert.deepEqual(
      auditLog.records.map((record) => record.action),
      ["update-system-parameter", "update-notification-template", "update-notification-template"]
    );
    assert.deepEqual(
      prisma.store.notificationTemplates.map((record) => `${record.key}:${record.subject}`),
      ["user_created:Tài khoản {{username}} đã cập nhật"]
    );
  });

  it("lists exactly the four immutable system roles and still manages organization units", async () => {
    const prisma = createAdminPrisma();
    const auditLog = createAuditLog();
    const service = new AdminUsersService(prisma, auditLog, createPasswordService());

    const roles = await service.listRoles();
    const unit = await service.createOrganizationUnit(adminUser, { code: "QYCT", name: "Khoa Quân y cơ sở" });
    const updatedUnit = await service.updateOrganizationUnit(adminUser, unit.id, { status: "inactive" });

    assert.deepEqual(roles.map((role) => role.code), [
      "SYSTEM_ADMIN",
      "SCIENTIFIC_MANAGEMENT_STAFF",
      "LEADERSHIP_APPROVAL_AUTHORITY",
      "RESEARCHER_INTERNAL_USER"
    ]);
    assert.equal(updatedUnit.status, "inactive");
    assert.deepEqual(
      auditLog.records.map((record) => record.action),
      ["create-organization-unit", "update-organization-unit"]
    );
  });

  it("does not expose role creation or role updates", () => {
    const controller = new AdminRolesController(new AdminUsersService(createAdminPrisma(), createAuditLog(), createPasswordService()));

    assert.equal(typeof controller.createRole, "undefined");
    assert.equal(typeof controller.updateRole, "undefined");
  });

  it("permission primitives accept one canonical system role and fail closed for missing, invalid, or legacy role context", () => {
    assert.deepEqual(evaluatePermission({}, "update", "catalog"), {
      allowed: false,
      reason: "Missing authenticated actor context."
    });

    assert.deepEqual(
      evaluatePermission(
        { userId: "user-admin", systemRole: "SYSTEM_ADMIN", organizationUnitIds: ["org-root"] },
        "update",
        "catalog"
      ),
      { allowed: true, reason: "System administrator can manage platform foundation resources." }
    );

    const missingOrLegacyRoleContexts = [
      { userId: "user-missing-role", organizationUnitIds: ["org-root"] },
      { userId: "user-legacy-role", roles: ["system-admin"], organizationUnitIds: ["org-root"] }
    ];
    for (const context of missingOrLegacyRoleContexts) {
      assert.deepEqual(evaluatePermission(context, "update", "catalog"), {
        allowed: false,
        reason: "Missing authenticated actor context."
      });
    }

    assert.deepEqual(evaluatePermission({ userId: "user-invalid-role", systemRole: "reviewer", organizationUnitIds: ["org-root"] }, "update", "catalog"), {
      allowed: false,
      reason: "Invalid system role context."
    });
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
