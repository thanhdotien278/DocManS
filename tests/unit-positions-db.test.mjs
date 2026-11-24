import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createMigratedDatabase } from "./helpers/disposable-database.mjs";
import { PrismaService } from "../dist/apps/api/infrastructure/prisma/prisma.service.js";
import { AuditLogService } from "../dist/apps/api/auth/audit-log.service.js";
import { AdminUsersService } from "../dist/apps/api/admin/admin-users.service.js";
import { AuthStore } from "../dist/apps/api/auth/auth.store.js";

// Chức danh tại đơn vị (Viện, Phòng, Khoa, Bộ môn) trên PostgreSQL thật: chỉ để hiển thị cùng tài khoản.
let database;
let db;
const originalUrl = process.env.DATABASE_URL;

before(async () => {
  database = await createMigratedDatabase("unit_positions");
  process.env.DATABASE_URL = database.url;
  db = new PrismaService();
});

after(async () => {
  await db?.$disconnect();
  process.env.DATABASE_URL = originalUrl;
  await database?.drop();
});

async function createUser(username, org) {
  return db.user.create({
    data: {
      username,
      usernameKey: username,
      displayName: `TS. ${username}`,
      passwordHash: "test-only-disabled",
      status: "active",
      systemRole: "RESEARCHER_INTERNAL_USER",
      unit: org.name,
      organizationScopes: { create: [{ organizationUnitId: org.id, isPrimary: true }] }
    }
  });
}

test("positions follow the unit type and its limits, can be held in several units, and appear on the session account", async () => {
  const service = new AdminUsersService(db, new AuditLogService(db), {});
  const adminUnit = await db.organizationUnit.create({ data: { code: "QTHT", name: "Ban Quản trị" } });
  const admin = await db.user.create({
    data: {
      username: "quantri",
      usernameKey: "quantri",
      displayName: "Quản trị",
      passwordHash: "x",
      status: "active",
      systemRole: "SYSTEM_ADMIN",
      unit: adminUnit.name,
      organizationScopes: { create: [{ organizationUnitId: adminUnit.id, isPrimary: true }] }
    }
  });
  const actor = {
    id: admin.id,
    username: admin.username,
    displayName: admin.displayName,
    systemRole: "SYSTEM_ADMIN",
    unit: adminUnit.name,
    organizationScopes: [{ id: adminUnit.id, code: adminUnit.code, name: adminUnit.name }]
  };

  // Loại đơn vị tự xác định theo tên khi tạo.
  const khoa = await service.createOrganizationUnit(actor, { code: "KHOA-NOI", name: "Khoa Nội" });
  const vien = await service.createOrganizationUnit(actor, { code: "VIEN-1", name: "Viện Bỏng Quốc gia" });
  const boMon = await service.createOrganizationUnit(actor, { code: "BM-1", name: "Bộ môn Sinh lý" });
  assert.deepEqual([khoa.unitType, vien.unitType, boMon.unitType], ["FACULTY", "INSTITUTE", "DIVISION"]);

  const users = [];
  for (let i = 1; i <= 7; i += 1) users.push(await createUser(`nkh${i}`, khoa));

  // Khoa: 1 Trưởng khoa, 2 Phó khoa.
  await service.setUserPositions(actor, users[0].id, { positions: [{ organizationUnitId: khoa.id, positionCode: "HEAD" }] });
  await assert.rejects(
    () => service.setUserPositions(actor, users[1].id, { positions: [{ organizationUnitId: khoa.id, positionCode: "HEAD" }] }),
    /đã đủ 1 Trưởng khoa/
  );
  await service.setUserPositions(actor, users[1].id, { positions: [{ organizationUnitId: khoa.id, positionCode: "DEPUTY_HEAD" }] });
  await service.setUserPositions(actor, users[2].id, { positions: [{ organizationUnitId: khoa.id, positionCode: "DEPUTY_HEAD" }] });
  await assert.rejects(
    () => service.setUserPositions(actor, users[3].id, { positions: [{ organizationUnitId: khoa.id, positionCode: "DEPUTY_HEAD" }] }),
    /đã đủ 2 Phó khoa/
  );
  // Chức danh phải đúng loại đơn vị; mỗi đơn vị một chức danh.
  await assert.rejects(
    () => service.setUserPositions(actor, users[3].id, { positions: [{ organizationUnitId: khoa.id, positionCode: "DIRECTOR" }] }),
    /không áp dụng/
  );
  await assert.rejects(
    () =>
      service.setUserPositions(actor, users[3].id, {
        positions: [
          { organizationUnitId: vien.id, positionCode: "DIRECTOR" },
          { organizationUnitId: vien.id, positionCode: "DEPUTY_DIRECTOR" }
        ]
      }),
    /một chức danh/
  );

  // Viện: 5 Phó Giám đốc; kiêm nhiệm Trưởng khoa và Phó Giám đốc Viện.
  for (const user of [users[0], users[3], users[4], users[5], users[6]]) {
    const keep = user.id === users[0].id ? [{ organizationUnitId: khoa.id, positionCode: "HEAD" }] : [];
    await service.setUserPositions(actor, user.id, { positions: [...keep, { organizationUnitId: vien.id, positionCode: "DEPUTY_DIRECTOR" }] });
  }
  await assert.rejects(
    () => service.setUserPositions(actor, users[1].id, { positions: [{ organizationUnitId: vien.id, positionCode: "DEPUTY_DIRECTOR" }] }),
    /đã đủ 5 Phó Giám đốc/
  );
  const listed = (await service.listUsers({})).find((user) => user.id === users[0].id);
  assert.deepEqual(listed.positions.map((position) => position.label), ["Trưởng khoa – Khoa Nội", "Phó Giám đốc – Viện Bỏng Quốc gia"]);

  // Đổi loại đơn vị làm chức danh mất nghĩa thì bị chặn.
  await assert.rejects(() => service.updateOrganizationUnit(actor, vien.id, { unitType: "FACULTY" }), /chức danh không thuộc loại mới/);

  // Chức danh có trong tài khoản đăng nhập (hiện ở thanh trên cùng), không đổi vai trò hệ thống.
  const store = new AuthStore(db);
  const sessionUser = store.toSafeUser(await store.findUserById(users[0].id));
  assert.deepEqual(sessionUser.positions, ["Trưởng khoa – Khoa Nội", "Phó Giám đốc – Viện Bỏng Quốc gia"]);
  assert.equal(sessionUser.systemRole, "RESEARCHER_INTERNAL_USER");

  // Đơn vị ngừng hoạt động không xuất hiện trên phiên đăng nhập (tài khoản vẫn còn phạm vi ở đơn vị khác).
  await db.userOrganizationScope.create({ data: { userId: users[0].id, organizationUnitId: vien.id, isPrimary: false } });
  await service.updateOrganizationUnit(actor, khoa.id, { status: "inactive" });
  const afterDeactivate = store.toSafeUser(await store.findUserById(users[0].id));
  assert.deepEqual(afterDeactivate.positions, ["Phó Giám đốc – Viện Bỏng Quốc gia"]);

  // Gỡ toàn bộ chức danh.
  await service.setUserPositions(actor, users[0].id, { positions: [] });
  assert.equal(await db.unitPosition.count({ where: { userId: users[0].id } }), 0);
  assert.ok(await db.auditLog.findFirst({ where: { action: "set-user-unit-positions", targetEntityId: users[0].id } }));
});
