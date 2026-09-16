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
const outOfScopeStaff = { ...staff, organizationScopes: [{ id: "org-other", code: "OTHER", name: "Đơn vị khác" }] };

function catalog(id, type, name = id) {
  return { id, type, code: id, name, status: "active", deletedAt: null };
}

function profile(overrides = {}) {
  return {
    id: "profile-1",
    managementOrganizationUnitId: "org-1",
    externalAffiliation: null,
    profileType: "INTERNAL",
    fullName: "Nguyễn Ánh",
    fullNameKey: "nguyen anh",
    academicRankCatalogItemId: null,
    academicDegreeCatalogItemId: null,
    title: null,
    position: null,
    militaryRank: null,
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
    credentialDeliveries: [],
    linkedUserId: null,
    linkedUser: null,
    publications: [],
    participations: [],
    ...overrides
  };
}

function createFakePrisma({ profiles = [], failAudit = false } = {}) {
  const store = {
    profiles: profiles.map((item) => structuredClone(item)),
    users: [{
      id: "staff-1",
      username: "staff",
      displayName: "Staff",
      status: "active",
      systemRole: "SCIENTIFIC_MANAGEMENT_STAFF",
      unit: "Đơn vị 1",
      mustChangePassword: false,
      organizationScopes: [{ organizationUnitId: "org-1", organizationUnit: { id: "org-1", code: "ORG1", name: "Đơn vị 1", status: "active" } }]
    }],
    activations: [],
    deliveries: [],
    links: [],
    histories: [],
    audits: []
  };
  const decorate = (item) => {
    const linkedUser = store.users.find((user) => user.id === item.linkedUserId) ?? null;
    return {
      ...item,
      linkedUser,
      credentialDeliveries: store.deliveries.filter((delivery) => delivery.researcherProfileId === item.id)
    };
  };
  const prisma = {
    store,
    async $queryRaw() {},
    organizationUnit: {
      async findFirst({ where }) { return where.id === "org-1" && where.status === "active" ? { id: "org-1", code: "ORG1", name: "Đơn vị 1", status: "active" } : null; }
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
        }).map(decorate);
      },
      async count() { return store.profiles.length; },
      async findUnique({ where }) {
        const item = store.profiles.find((candidate) => candidate.id === where.id);
        return item ? decorate(item) : null;
      },
      async create({ data }) {
        const created = profile({
          id: `profile-${store.profiles.length + 1}`,
          fullName: data.fullName,
          fullNameKey: data.fullNameKey,
          profileType: data.profileType,
          contactEmail: data.contactEmail ?? null,
          contactEmailKey: data.contactEmailKey ?? null,
          researchFields: data.researchFields.create.map(({ catalogItemId }) => ({ catalogItem: catalog(catalogItemId, "research-field", "Y học quân sự") })),
          expertiseKeywords: data.expertiseKeywords.create
        });
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
        Object.assign(item, data, { aggregateVersion: data.aggregateVersion?.increment ? item.aggregateVersion + data.aggregateVersion.increment : item.aggregateVersion, updatedAt: new Date() });
        return decorate(item);
      }
    },
    user: {
      async findUnique({ where }) {
        if (where.id) return store.users.find((user) => user.id === where.id) ?? null;
        if (where.credentialEmail) return store.users.find((user) => user.credentialEmail === where.credentialEmail) ?? null;
        return null;
      },
      async create({ data }) {
        const created = {
          id: `user-${store.users.length + 1}`,
          credentialVersion: 0,
          username: data.username,
          usernameKey: data.usernameKey,
          displayName: data.displayName,
          passwordHash: data.passwordHash,
          credentialEmail: data.credentialEmail,
          mustChangePassword: data.mustChangePassword,
          status: data.status,
          systemRole: data.systemRole,
          unit: data.unit,
          organizationScopes: [{ organizationUnitId: data.organizationScopes.create.organizationUnitId, organizationUnit: { id: "org-1", code: "ORG1", name: "Đơn vị 1", status: "active" } }]
        };
        store.users.push(created);
        return created;
      }
    },
    researcherProfileAccountLink: {
      async create({ data }) { store.links.push(data); return { id: `link-${store.links.length}`, ...data }; }
    },
    accountActivationToken: {
      async updateMany({ where, data }) {
        for (const token of store.activations) if (token.userId === where.userId && token.usedAt === null) token.usedAt = data.usedAt;
        return { count: 1 };
      },
      async create({ data }) { store.activations.push({ id: `activation-${store.activations.length + 1}`, usedAt: null, ...data }); return store.activations.at(-1); }
    },
    accountCredentialDelivery: {
      async create({ data }) {
        const delivery = { id: `delivery-${store.deliveries.length + 1}`, createdAt: new Date("2026-08-23T00:00:00.000Z"), lastError: null, sentAt: null, attempts: 0, ...data };
        store.deliveries.push(delivery);
        return delivery;
      },
      async update({ where, data }) {
        const delivery = store.deliveries.find((item) => item.id === where.id);
        Object.assign(delivery, data);
        return delivery;
      }
    },
    researcherProfileHistory: {
      async create({ data }) { store.histories.push(data); return { id: `history-${store.histories.length}`, ...data }; }
    },
    async $transaction(callback) {
      const snapshot = structuredClone(store);
      try {
        return await callback(prisma);
      } catch (error) {
        Object.assign(store, snapshot);
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

function createService(prisma, audit) {
  const sent = [];
  const mail = {
    configuration() { return { loginUrl: "http://localhost:3000/login" }; },
    async sendAccountActivation(input) { sent.push(input); }
  };
  const password = {
    async hashPassword(value) { return `hash:${value}`; },
    createResetToken() { return { token: "raw-activation-token", tokenHash: "hashed-activation-token" }; }
  };
  return { service: new ResearcherProfilesService(prisma, audit, mail, password), sent };
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

  it("fails closed outside scope and exposes scoped manager capabilities", () => {
    assert.deepEqual(projectResearcherProfileAuthorization(outOfScopeStaff, profile()).allowedActions, []);
    const capability = projectResearcherProfileAuthorization(staff, profile());
    assert.deepEqual(capability.allowedActions, [
      "researcher-profile.account.create",
      "researcher-profile.account.link",
      "researcher-profile.activate",
      "researcher-profile.create",
      "researcher-profile.deactivate",
      "researcher-profile.history.read",
      "researcher-profile.participation.manage",
      "researcher-profile.publication.manage",
      "researcher-profile.read",
      "researcher-profile.update"
    ]);
    assert.equal(capability.contextVersion.domain, "researcher-profile");
  });

  it("creates a profile atomically and warns only about visible scoped duplicates", async () => {
    const { prisma, audit } = createFakePrisma({ profiles: [profile({ id: "hidden", managementOrganizationUnitId: "org-hidden" }), profile({ id: "visible" })] });
    const { service } = createService(prisma, audit);
    const warning = await service.createProfile(staff, createInput({ profileType: "EXTERNAL" }));
    assert.equal(warning.profile, null);
    assert.equal(warning.requiresConfirmation, true);
    assert.deepEqual(warning.duplicateCandidates.map((item) => item.id), ["visible"]);
    const saved = await service.createProfile(staff, { ...createInput({ profileType: "EXTERNAL" }), confirmDuplicate: true });
    assert.equal(saved.profile.fullName, "Nguyễn Ánh");
    assert.equal(prisma.store.audits.length, 1);
  });

  it("creates a default internal pending-activation account with a single-use setup token", async () => {
    const { prisma, audit } = createFakePrisma();
    const { service, sent } = createService(prisma, audit);
    const saved = await service.createProfile(staff, createInput({ contactEmail: " Researcher@Example.edu.vn " }));
    assert.equal(saved.profile.account.username, null);
    assert.equal(saved.profile.account.status, "pending_activation");
    assert.equal(saved.profile.account.email, "researcher@example.edu.vn");
    assert.equal(prisma.store.activations[0].tokenHash, "hashed-activation-token");
    assert.equal(prisma.store.deliveries[0].templateKey, "researcher_account_activation");
    assert.equal(sent[0].activationUrl, "http://localhost:3000/password-reset?mode=activation&token=raw-activation-token");
  });

  it("rejects a stale update before mutation", async () => {
    const { prisma, audit } = createFakePrisma({ profiles: [profile({ aggregateVersion: 2 })] });
    const { service } = createService(prisma, audit);
    await assert.rejects(() => service.updateProfile(staff, "profile-1", { fullName: "Mới", contextVersion: { domain: "researcher-profile", recordId: "profile-1", aggregateVersion: 1, relationshipVersion: 0, conflictVersion: 0, delegationVersion: 0, policyVersion: "v1" } }), ConflictException);
    assert.equal(prisma.store.profiles[0].fullName, "Nguyễn Ánh");
  });

  it("rolls back the observable create when the required audit append fails", async () => {
    const { prisma, audit } = createFakePrisma({ failAudit: true });
    const { service } = createService(prisma, audit);
    await assert.rejects(() => service.createProfile(staff, createInput({ profileType: "EXTERNAL" })), /audit failed/);
    assert.equal(prisma.store.profiles.length, 0);
  });
});
