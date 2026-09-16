import "dotenv/config";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Local test fixtures only. Run after the base seed; existing accounts are untouched.
const databaseUrl = new URL(process.env.DATABASE_URL);
assert(["localhost", "127.0.0.1", "[::1]"].includes(databaseUrl.hostname), "Local database required");
assert.notEqual(process.env.NODE_ENV, "production");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl.href }) });
const usernames = [];

try {
  await prisma.$transaction(async (tx) => {
    const host = await tx.organizationUnit.findUniqueOrThrow({ where: { code: "KHTI" } });
    const external = await tx.organizationUnit.findUniqueOrThrow({ where: { code: "EXT" } });
    const creator = await tx.user.findUniqueOrThrow({ where: { id: "user-admin" } });
    assert.equal(host.status, "active");
    assert.equal(external.status, "active");
    for (const profileType of ["INTERNAL", "EXTERNAL"]) {
      for (let index = 1; index <= 10; index++) {
        const outside = profileType === "EXTERNAL";
        const username = `test_${outside ? "external" : "internal"}${String(index).padStart(2, "0")}`;
        usernames.push(username);
        const id = `user-${username}`;
        const profileId = `profile-${username}`;
        const fullName = `Nhà nghiên cứu test ${outside ? "ngoài đơn vị" : "nội bộ"} ${String(index).padStart(2, "0")}`;
        const primary = outside ? external : host;
        await tx.user.upsert({
          where: { id }, update: {},
          create: {
            id, username, usernameKey: username, displayName: fullName,
            passwordHash: `scrypt:${id}:${scryptSync("1234", id, 64).toString("hex")}`,
            status: "active", mustChangePassword: false,
            systemRole: outside ? "EXTERNAL_RESEARCHER_USER" : "RESEARCHER_INTERNAL_USER",
            unit: primary.name,
            organizationScopes: { create: [
              { organizationUnitId: primary.id, isPrimary: true },
              ...(outside ? [{ organizationUnitId: host.id, isPrimary: false }] : [])
            ] }
          }
        });
        await tx.researcherProfile.upsert({
          where: { id: profileId }, update: {},
          create: {
            id: profileId, linkedUserId: id, managementOrganizationUnitId: host.id,
            profileType, externalAffiliation: outside ? external.name : null,
            fullName, fullNameKey: fullName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase(),
            status: "ACTIVE", createdById: creator.id, updatedById: creator.id,
            accountLinks: { create: { userId: id, effectiveFrom: new Date(), createdById: creator.id, reason: "Local reviewer/council test seed" } },
            history: { create: { actorId: creator.id, action: "seed-test-profile", reason: "Local reviewer/council test seed", afterFacts: { linkedUserId: id, profileType } } }
          }
        });
      }
    }
    assert.equal(await tx.researcherProfile.count({ where: {
      id: { in: usernames.map((username) => `profile-${username}`) }, status: "ACTIVE",
      managementOrganizationUnitId: host.id,
      linkedUser: { is: { status: "active", mustChangePassword: false,
        organizationScopes: { some: { organizationUnitId: host.id } } } }
    } }), 20);
  }, { timeout: 30000 });
  console.log("Verified 20 linked test profiles: test_internal01..10 and test_external01..10.");
} finally {
  await prisma.$disconnect();
}
