import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { isPermissionActionV1 } from "../packages/permissions/src/index.js";
import { createResearcherProfilePipe } from "../dist/apps/api/researcher-profiles/researcher-profiles.dto.js";
import { normalizeResearcherKey, ResearcherProfilesService } from "../dist/apps/api/researcher-profiles/researcher-profiles.service.js";
import { projectResearcherProfileAuthorization } from "../dist/apps/api/researcher-profiles/researcher-profile-access.js";

const staff = {
  id: "staff-1",
  username: "staff",
  displayName: "Staff",
  systemRole: "SCIENTIFIC_MANAGEMENT_STAFF",
  unit: "Phòng KHQS",
  organizationScopes: [{ id: "org-1", code: "ORG1", name: "Đơn vị 1" }]
};

const admin = { ...staff, id: "admin-1", systemRole: "SYSTEM_ADMIN" };

function catalog(id, type, name = id) {
  return { id, type, code: id, name, status: "active", deletedAt: null };
}

function profile(overrides = {}) {
  return {
    id: "profile-1",
    managementOrganizationUnitId: "org-1",
    externalAffiliation: null,
    fullName: "Nguyễn Ánh",
    fullNameKey: "nguyen anh",
    academicRankCatalogItemId: null,
    academicDegreeCatalogItemId: null,
    title: null,
    contactEmail: null,
    contactEmailKey: null,
    contactPhone: null,
    contactPhoneKey: null,
    contactNote: null,
    status: "ACTIVE",
    aggregateVersion: 0,
    createdById: "staff-1",
    updatedById: "staff-1",
    createdAt: new Date("2026-08-23T00:00:00.000Z"),
    updatedAt: new Date("2026-08-23T00:00:00.000Z"),
    managementOrganizationUnit: { id: "org-1", code: "ORG1", name: "Đơn vị 1", status: "active" },
    academicRankCatalogItem: null,
    academicDegreeCatalogItem: null,
    researchFields: [{ catalogItem: catalog("field-1", "research-field", "Y học quân sự") }],
    expertiseKeywords: [{ keyword: "Y học", keywordKey: "y hoc" }],
    ...overrides
  };
}

function createFakePrisma({ profiles = [], failAudit = false } = {}) {
  const store = { profiles: profiles.map((item) => structuredClone(item)), audits: [] };
  const prisma = {
    store,
    organizationUnit: {
      async findFirst({ where }) { return where.id === "org-1" && where.status === "active" ? { id: "org-1" } : null; }
    },
    catalogItem: {
      async findFirst({ where }) {
        const found = [catalog("field-1", "research-field")].find((item) => item.id === where.id && item.type === where.type && item.status === where.status && item.deletedAt === where.deletedAt);
        return found ?? null;
      },
      async findMany() { return [catalog("field-1", "research-field")]; }
    },
    researcherProfile: {
      async findMany({ where }) {
        return store.profiles.filter((item) => {
          const scope = where.managementOrganizationUnitId?.in ?? [where.managementOrganizationUnitId];
          const scopeMatch = scope.includes(item.managementOrganizationUnitId);
          const orMatch = !where.OR || where.OR.some((condition) => Object.entries(condition).some(([field, value]) => item[field] === value));
          return scopeMatch && orMatch;
        });
      },
      async count() { return store.profiles.length; },
      async findUnique({ where }) { return store.profiles.find((item) => item.id === where.id) ?? null; },
      async create({ data }) {
        const created = profile({ id: `profile-${store.profiles.length + 1}`, fullName: data.fullName, fullNameKey: data.fullNameKey, aggregateVersion: 0 });
        store.profiles.push(created);
        return created;
      },
      async updateMany({ where, data }) {
        const item = store.profiles.find((candidate) => candidate.id === where.id && candidate.aggregateVersion === where.aggregateVersion);
        if (!item) return { count: 0 };
        Object.assign(item, data, { aggregateVersion: item.aggregateVersion + 1 });
        return { count: 1 };
      },
      async update({ where, data }) {
        const item = store.profiles.find((candidate) => candidate.id === where.id);
        Object.assign(item, data, { updatedAt: new Date() });
        return item;
      }
    },
    async $transaction(callback) {
      const snapshot = structuredClone(store.profiles);
      try {
        return await callback(prisma);
      } catch (error) {
        store.profiles = snapshot;
        throw error;
      }
    }
  };
  const audit = {
    async record(input) {
      if (failAudit) throw new Error("audit failed");
      store.audits.push(input);
      return input;
    }
  };
  return { prisma, audit };
}

function createInput(overrides = {}) {
  return createResearcherProfilePipe.transform({
    fullName: "Nguyễn Ánh",
    managementOrganizationUnitId: "org-1",
    researchFieldIds: ["field-1"],
    expertiseKeywords: ["Y học"],
    ...overrides
  });
}

describe("Story 2.1 researcher profile contracts", () => {
  it("registers exact profile actions and rejects wildcards", () => {
    assert.equal(isPermissionActionV1("researcher-profile.create"), true);
    assert.equal(isPermissionActionV1("researcher-profile.update"), true);
    assert.equal(isPermissionActionV1("researcher-profile.*"), false);
  });

  it("normalizes Vietnamese comparison keys without changing display input", () => {
    assert.equal(normalizeResearcherKey("  Nguyễn   Ánh Đạo  "), "nguyen anh dao");
  });

  it("returns field-addressable validation errors", () => {
    assert.throws(() => createResearcherProfilePipe.transform({ fullName: "", managementOrganizationUnitId: "org-1", researchFieldIds: [] }), (error) => {
      assert.ok(error instanceof BadRequestException);
      assert.deepEqual(error.getResponse().errors.map((item) => item.field), ["fullName"]);
      return true;
    });
  });

  it("fails closed for system admins and exposes only scoped staff capabilities", () => {
    assert.deepEqual(projectResearcherProfileAuthorization(admin, profile()).allowedActions, []);
    const capability = projectResearcherProfileAuthorization(staff, profile());
    assert.deepEqual(capability.allowedActions, [
      "researcher-profile.activate",
      "researcher-profile.create",
      "researcher-profile.deactivate",
      "researcher-profile.read",
      "researcher-profile.update"
    ]);
    assert.equal(capability.contextVersion.domain, "researcher-profile");
  });

  it("creates a profile atomically and warns only about visible scoped duplicates", async () => {
    const { prisma, audit } = createFakePrisma({ profiles: [profile({ id: "hidden", managementOrganizationUnitId: "org-hidden" }), profile({ id: "visible" })] });
    const service = new ResearcherProfilesService(prisma, audit);
    const warning = await service.createProfile(staff, createInput());
    assert.equal(warning.profile, null);
    assert.equal(warning.requiresConfirmation, true);
    assert.deepEqual(warning.duplicateCandidates.map((item) => item.id), ["visible"]);
    const saved = await service.createProfile(staff, { ...createInput(), confirmDuplicate: true });
    assert.equal(saved.profile.fullName, "Nguyễn Ánh");
    assert.equal(prisma.store.audits.length, 1);
  });

  it("rejects a stale update before mutation", async () => {
    const { prisma, audit } = createFakePrisma({ profiles: [profile({ aggregateVersion: 2 })] });
    const service = new ResearcherProfilesService(prisma, audit);
    await assert.rejects(() => service.updateProfile(staff, "profile-1", { fullName: "Mới", contextVersion: { domain: "researcher-profile", recordId: "profile-1", aggregateVersion: 1, relationshipVersion: 0, conflictVersion: 0, delegationVersion: 0, policyVersion: "v1" } }), ConflictException);
    assert.equal(prisma.store.profiles[0].fullName, "Nguyễn Ánh");
  });

  it("rolls back the observable create when the required audit append fails", async () => {
    const { prisma, audit } = createFakePrisma({ failAudit: true });
    await assert.rejects(() => new ResearcherProfilesService(prisma, audit).createProfile(staff, createInput()), /audit failed/);
    assert.equal(prisma.store.profiles.length, 0);
  });
});
