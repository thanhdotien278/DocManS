import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { isPermissionActionV1 } from "../packages/permissions/src/index.js";
import { createResearcherProfilePipe, updateMyProfilePipe, updateResearcherProfilePipe } from "../dist/apps/api/researcher-profiles/researcher-profiles.dto.js";
import { normalizeResearcherKey, ResearcherProfilesService } from "../dist/apps/api/researcher-profiles/researcher-profiles.service.js";
import { linkableAccountRoles, projectResearcherProfileAuthorization } from "../dist/apps/api/researcher-profiles/researcher-profile-access.js";
import { ResearcherProfilesController } from "../dist/apps/api/researcher-profiles/researcher-profiles.controller.js";

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
const leadership = { ...staff, id: "leader-1", systemRole: "LEADERSHIP_APPROVAL_AUTHORITY" };
const researcher = { id: "researcher-1", username: "researcher", displayName: "Researcher", systemRole: "RESEARCHER_INTERNAL_USER", unit: "Đơn vị 1", organizationScopes: [{ id: "org-1", code: "ORG1", name: "Đơn vị 1" }] };

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
    curriculumVitae: null,
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
    publications: profiles.flatMap((item) => (item.publications ?? []).map((publication) => ({ researcherProfileId: item.id, ...structuredClone(publication) }))),
    histories: [],
    audits: []
  };
  const decorate = (item) => {
    const linkedUser = store.users.find((user) => user.id === item.linkedUserId) ?? null;
    return {
      ...item,
      linkedUser,
      credentialDeliveries: store.deliveries.filter((delivery) => delivery.researcherProfileId === item.id),
      publications: store.publications.filter((publication) => publication.researcherProfileId === item.id)
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
      async findFirst({ where }) {
        const item = store.profiles.find((candidate) => Object.entries(where).every(([key, value]) => candidate[key] === value));
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
        if (where.usernameKey) return store.users.find((user) => user.usernameKey === where.usernameKey) ?? null;
        return null;
      },
      async update({ where, data }) {
        const user = store.users.find((item) => item.id === where.id);
        Object.assign(user, data);
        return user;
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
    researcherProfilePublication: {
      async create({ data }) {
        const publication = { id: `publication-${store.publications.length + 1}`, createdAt: new Date("2026-08-23T00:00:00.000Z"), updatedAt: new Date("2026-08-23T00:00:00.000Z"), ...data };
        store.publications.push(publication);
        return publication;
      },
      async deleteMany({ where }) {
        const before = store.publications.length;
        store.publications = store.publications.filter((row) => row.researcherProfileId !== where.researcherProfileId || where.id.notIn.includes(row.id));
        return { count: before - store.publications.length };
      },
      async findFirst({ where }) {
        return store.publications.find((publication) => Object.entries(where).every(([key, value]) => publication[key] === value)) ?? null;
      },
      async update({ where, data }) {
        const publication = store.publications.find((item) => item.id === where.id);
        Object.assign(publication, data, { updatedAt: new Date() });
        return publication;
      }
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
      async create({ data }) { const record = { id: `history-${store.histories.length + 1}`, createdAt: new Date("2026-08-23T00:00:00.000Z"), ...data }; store.histories.push(record); return record; },
      async findMany() { return store.histories; }
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

function contextVersion(aggregateVersion = 0, recordId = "profile-1") {
  return { domain: "researcher-profile", recordId, aggregateVersion, relationshipVersion: 0, conflictVersion: 0, delegationVersion: 0, policyVersion: "v1" };
}

function validCv(overrides = {}) {
  return {
    cvSchemaVersion: 1,
    educationHistory: [{ degreeLevel: "Đại học", major: "Y khoa", institution: "Học viện Quân y", startYear: 1996, graduationYear: 2000, trainingMode: "Chính quy" }],
    workHistory: { summary: "Nghiên cứu", items: [{ period: "2001-2020", organization: "Đơn vị 1" }] },
    researchExperience: { intellectualProperty: [{ title: "Sáng chế" }], awards: [{ name: "Giải thưởng" }], projects: [{ projectTitle: "Đề tài", role: "Chủ nhiệm" }] },
    ...overrides,
    personalInfo: { gender: "Nam", idNumber: "ID-001", organization: "Đơn vị 1", shareDataAgreement: true, bankAccount: "123456", avatarUrl: "/avatar.jpg", ...overrides.personalInfo }
  };
}

describe("Story 2.1 researcher profile contracts", () => {
  it("registers exact profile actions and rejects wildcards", () => {
    assert.equal(isPermissionActionV1("researcher-profile.create"), true);
    assert.equal(isPermissionActionV1("researcher-profile.update"), true);
    assert.equal(isPermissionActionV1("researcher-profile.*"), false);
    assert.equal(isPermissionActionV1("researcher-profile.cv.read"), true);
    assert.equal(isPermissionActionV1("researcher-profile.cv.update"), true);
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
      "researcher-profile.cv.read",
      "researcher-profile.cv.update",
      "researcher-profile.deactivate",
      "researcher-profile.history.read",
      "researcher-profile.participation.manage",
      "researcher-profile.publication.manage",
      "researcher-profile.read",
      "researcher-profile.update"
    ]);
    assert.equal(capability.contextVersion.domain, "researcher-profile");
    // A linked owner (here an in-scope HEAD) never sees activate/deactivate on their own profile, active or not.
    const head = { ...staff, id: "head-1", systemRole: "SCIENTIFIC_MANAGEMENT_HEAD" };
    for (const status of ["ACTIVE", "INACTIVE"]) {
      const own = projectResearcherProfileAuthorization(head, profile({ linkedUserId: head.id, status })).allowedActions;
      assert.equal(own.includes("researcher-profile.activate") || own.includes("researcher-profile.deactivate"), false, status);
    }
    // Only SYSTEM_ADMIN may link HEAD/STAFF accounts, and only to INTERNAL profiles.
    assert.deepEqual(linkableAccountRoles(admin, "INTERNAL"), ["RESEARCHER_INTERNAL_USER", "SCIENTIFIC_MANAGEMENT_HEAD", "SCIENTIFIC_MANAGEMENT_STAFF"]);
    assert.deepEqual(linkableAccountRoles(admin, "EXTERNAL"), ["EXTERNAL_RESEARCHER_USER"]);
    assert.deepEqual(linkableAccountRoles(staff, "INTERNAL"), ["RESEARCHER_INTERNAL_USER"]);
    assert.deepEqual(linkableAccountRoles(head, "INTERNAL"), ["RESEARCHER_INTERNAL_USER"]);
    // HEAD-linked profile: in-scope peers lose manager writes, SYSTEM_ADMIN keeps them, the owner keeps self/cv grants.
    const headLinked = profile({ linkedUserId: head.id, linkedUser: { systemRole: "SCIENTIFIC_MANAGEMENT_HEAD", status: "active" } });
    const writes = ["researcher-profile.update", "researcher-profile.deactivate", "researcher-profile.cv.update"];
    const peer = projectResearcherProfileAuthorization(staff, headLinked).allowedActions;
    assert.deepEqual(writes.filter((action) => peer.includes(action)), []);
    assert.equal(peer.includes("researcher-profile.cv.read"), true);
    assert.deepEqual(writes.filter((action) => projectResearcherProfileAuthorization(admin, headLinked).allowedActions.includes(action)), writes);
    const owner = projectResearcherProfileAuthorization(head, headLinked).allowedActions;
    assert.equal(owner.includes("researcher-profile.cv.update") && owner.includes("researcher-profile.self.update"), true);
    assert.equal(owner.includes("researcher-profile.update"), false);
  });

  it("rejects a linked owner changing their own profile status with 403", async () => {
    const head = { ...staff, id: "head-1", systemRole: "SCIENTIFIC_MANAGEMENT_HEAD" };
    const { prisma, audit } = createFakePrisma({ profiles: [profile({ linkedUserId: head.id })] });
    prisma.store.users.push({ ...head, status: "active", mustChangePassword: false, organizationScopes: [{ organizationUnitId: "org-1", organizationUnit: { id: "org-1", code: "ORG1", name: "Đơn vị 1", status: "active" } }] });
    const { service } = createService(prisma, audit);
    const contextVersion = projectResearcherProfileAuthorization(head, profile()).contextVersion;
    await assert.rejects(service.setStatus(head, "profile-1", "INACTIVE", contextVersion), (error) => error instanceof ForbiddenException && /tự thay đổi trạng thái/.test(error.getResponse().message));
    assert.equal(prisma.store.audits.length, 0);
    // A STAFF peer cannot edit (or rename the account of) the HEAD-linked profile.
    await assert.rejects(service.updateProfile(staff, "profile-1", updateResearcherProfilePipe.transform({ contextVersion, fullName: "Đổi tên" })), ForbiddenException);
    assert.equal(prisma.store.audits.length, 0);
    assert.equal(prisma.store.users.find((user) => user.id === head.id).displayName, head.displayName);
  });

  it("links HEAD accounts only for SYSTEM_ADMIN on INTERNAL profiles", async () => {
    const scopes = [{ organizationUnitId: "org-1", organizationUnit: { id: "org-1", code: "ORG1", name: "Đơn vị 1", status: "active" } }];
    const head = { ...staff, id: "head-1", systemRole: "SCIENTIFIC_MANAGEMENT_HEAD", status: "active", mustChangePassword: false, organizationScopes: scopes };
    const attempt = async (actor, profileType) => {
      const { prisma, audit } = createFakePrisma({ profiles: [profile({ profileType })] });
      prisma.store.users.push(head, { ...admin, status: "active", mustChangePassword: false, organizationScopes: scopes });
      const { service } = createService(prisma, audit);
      const result = await service.linkResearcherAccount(actor, "profile-1", { userId: head.id, contextVersion: projectResearcherProfileAuthorization(actor, profile()).contextVersion });
      return { result, prisma };
    };
    const { result, prisma } = await attempt(admin, "INTERNAL");
    assert.equal(result.profile.linkedUserId ?? prisma.store.profiles[0].linkedUserId, head.id);
    assert.equal(prisma.store.audits.some((entry) => entry.action === "link-researcher-account"), true);
    await assert.rejects(attempt(staff, "INTERNAL"), ConflictException);
    await assert.rejects(attempt(admin, "EXTERNAL"), ConflictException);
  });

  it("projects CV actions only for the owner or an exact-scope manager", () => {
    assert.deepEqual(projectResearcherProfileAuthorization(outOfScopeStaff, profile()).allowedActions.includes("researcher-profile.cv.read"), false);
    assert.deepEqual(projectResearcherProfileAuthorization(researcher, profile({ linkedUserId: researcher.id })).allowedActions.filter((action) => action.startsWith("researcher-profile.cv.")), ["researcher-profile.cv.read", "researcher-profile.cv.update"]);
    assert.deepEqual(projectResearcherProfileAuthorization(leadership, profile()).allowedActions.includes("researcher-profile.cv.read"), false);
  });

  it("validates the versioned CV contract with dotted field errors", () => {
    const cases = [
      ["null CV", null, "curriculumVitae"],
      ["empty root key", { ...validCv(), "": true }, "curriculumVitae."],
      ["unknown key", { ...validCv(), personalInfo: { ...validCv().personalInfo, foo: true } }, "curriculumVitae.personalInfo.foo"],
      ["unknown nested row key", { ...validCv(), educationHistory: [{ ...validCv().educationHistory[0], extra: true }] }, "curriculumVitae.educationHistory.0.extra"],
      ["legacy work history array", { ...validCv(), workHistory: [] }, "curriculumVitae.workHistory"],
      ["missing education major", { ...validCv(), educationHistory: [{ degreeLevel: "Đại học", institution: "Học viện Quân y" }] }, "curriculumVitae.educationHistory.0.major"],
      ["missing personal gender", { ...validCv(), personalInfo: { ...validCv().personalInfo, gender: undefined } }, "curriculumVitae.personalInfo.gender"],
      ["missing personal identity", { ...validCv(), personalInfo: { ...validCv().personalInfo, idNumber: undefined } }, "curriculumVitae.personalInfo.idNumber"],
      ["missing personal organization", { ...validCv(), personalInfo: { ...validCv().personalInfo, organization: undefined } }, "curriculumVitae.personalInfo.organization"],
      ["missing personal consent", { ...validCv(), personalInfo: { ...validCv().personalInfo, shareDataAgreement: undefined } }, "curriculumVitae.personalInfo.shareDataAgreement"],
      ["null work history", { ...validCv(), workHistory: null }, "curriculumVitae.workHistory"],
      ["null history list", { ...validCv(), educationHistory: null }, "curriculumVitae.educationHistory"],
      ["null personal list", { ...validCv(), personalInfo: { ...validCv().personalInfo, languages: null } }, "curriculumVitae.personalInfo.languages"],
      ["blank other research field", validCv({ personalInfo: { otherResearchFields: ["Toán cao cấp", " "] } }), "curriculumVitae.personalInfo.otherResearchFields.1"],
      ["invalid year", { ...validCv(), educationHistory: [{ ...validCv().educationHistory[0], graduationYear: 1949 }] }, "curriculumVitae.educationHistory.0.graduationYear"],
      ["invalid date", { ...validCv(), personalInfo: { ...validCv().personalInfo, birthDate: "2020-02-30" } }, "curriculumVitae.personalInfo.birthDate"],
      ["unsafe avatar URL", validCv({ personalInfo: { avatarUrl: "javascript:alert(1)" } }), "curriculumVitae.personalInfo.avatarUrl"],
      ["protocol-relative avatar URL", validCv({ personalInfo: { avatarUrl: "//evil.test/a.jpg" } }), "curriculumVitae.personalInfo.avatarUrl"],
      ["long plain avatar URL", validCv({ personalInfo: { avatarUrl: `https://example.test/${"a".repeat(2048)}` } }), "curriculumVitae.personalInfo.avatarUrl"],
      ["svg avatar data URL", validCv({ personalInfo: { avatarUrl: "data:image/svg+xml;base64,PHN2Zz4=" } }), "curriculumVitae.personalInfo.avatarUrl"],
      ["oversized avatar data URL", validCv({ personalInfo: { avatarUrl: `data:image/jpeg;base64,${"A".repeat(1_000_000)}` } }), "curriculumVitae.personalInfo.avatarUrl"],
      ["unsafe intellectual property proof URL", validCv({ researchExperience: { intellectualProperty: [{ title: "Sáng chế", proofUrl: "data:text/html,unsafe" }] } }), "curriculumVitae.researchExperience.intellectualProperty.0.proofUrl"],
      ["unsafe award proof URL", validCv({ researchExperience: { awards: [{ name: "Giải thưởng", proofUrl: "javascript:alert(1)" }] } }), "curriculumVitae.researchExperience.awards.0.proofUrl"],
      ["list limit", { ...validCv(), educationHistory: Array.from({ length: 201 }, () => ({ degreeLevel: "Đại học", major: "Y khoa", institution: "Học viện Quân y" })) }, "curriculumVitae.educationHistory"],
      ["string limit", { ...validCv(), workHistory: { summary: "x".repeat(4001) } }, "curriculumVitae.workHistory.summary"],
      ["document limit", { ...validCv(), educationHistory: Array.from({ length: 200 }, () => ({ degreeLevel: "x".repeat(1000), major: "x".repeat(1000), institution: "x".repeat(1000), trainingMode: "x".repeat(1000), thesisTitle: "x".repeat(1000) })) }, "curriculumVitae"],
      ["duplicate publication section", { ...validCv(), researchExperience: { publications: [] } }, "curriculumVitae.researchExperience.publications"]
    ];
    for (const [, curriculumVitae, field] of cases) {
      assert.throws(() => updateResearcherProfilePipe.transform({ contextVersion: contextVersion(), curriculumVitae }), (error) => {
        assert.ok(error instanceof BadRequestException);
        assert.deepEqual(error.getResponse().errors.map((item) => item.field), [field]);
        return true;
      });
    }
    assert.deepEqual(updateResearcherProfilePipe.transform({ contextVersion: contextVersion(), expertiseKeywords: ["Y học", "y hoc", " Y  HỌC ", "Nội soi"] }).expertiseKeywords, ["Y học", "Nội soi"]);
    const normalized = updateMyProfilePipe.transform({ contextVersion: contextVersion(), curriculumVitae: validCv({ personalInfo: { gender: ` ${"Nữ".normalize("NFD")} ` } }) });
    assert.equal(normalized.curriculumVitae.personalInfo.gender, "Nữ");
    assert.deepEqual(updateMyProfilePipe.transform({ contextVersion: contextVersion(), curriculumVitae: validCv({ personalInfo: { otherResearchFields: ["Toán cao cấp"] } }) }).curriculumVitae.personalInfo.otherResearchFields, ["Toán cao cấp"]);
  });

  it("validates Tab 4 publication metadata and contract limits", async () => {
    const publication = {
      title: "Nghiên cứu khoa học",
      publicationYear: 1899,
      issnIsbn: "ISSN 1234-5678",
      publicationType: "Báo cáo hội nghị",
      classification: "Q1",
      proofUrl: "https://example.test/proof",
      notes: "Ghi chú"
    };
    const parsed = createInput({ publications: [publication] });
    assert.deepEqual(parsed.publications[0], {
      id: undefined,
      title: "Nghiên cứu khoa học",
      venue: undefined,
      publicationYear: 1899,
      doi: undefined,
      authors: undefined,
      issnIsbn: "ISSN 1234-5678",
      publicationType: "Báo cáo hội nghị",
      classification: "Q1",
      proofUrl: "https://example.test/proof",
      status: "ACTIVE",
      notes: "Ghi chú"
    });
    assert.throws(() => createInput({ publications: Array.from({ length: 201 }, () => ({ title: "Bài viết" })) }), BadRequestException);
    for (const publicationYear of [1800, 2200]) {
      assert.equal(createInput({ publications: [{ title: "Bài viết", publicationYear }] }).publications[0].publicationYear, publicationYear);
    }
    for (const publicationYear of [1799, 2201]) {
      assert.throws(() => createInput({ publications: [{ title: "Bài viết", publicationYear }] }), BadRequestException);
    }
    for (const proofUrl of ["javascript:alert(1)", "data:text/html,unsafe"]) {
      assert.throws(() => createInput({ publications: [{ title: "Bài viết", proofUrl }] }), (error) => {
        assert.ok(error instanceof BadRequestException);
        assert.deepEqual(error.getResponse().errors.map((item) => item.field), ["publications.0.proofUrl"]);
        return true;
      });
    }
    for (const proofUrl of ["http://example.test/proof", "/proof.pdf"]) {
      assert.equal(createInput({ publications: [{ title: "Bài viết", proofUrl }] }).publications[0].proofUrl, proofUrl);
    }
    assert.throws(() => createInput({ publications: [{ title: "Bài viết", notes: "x".repeat(4001) }] }), BadRequestException);
    for (const [field, row] of [["title", { title: "" }], ["publicationYear", { title: "Bài", publicationYear: 1 }], ["status", { title: "Bài", status: "OTHER" }], ["authors", { title: "Bài", authors: 5 }]]) {
      assert.throws(() => createInput({ publications: [row] }), (error) => {
        assert.ok(error instanceof BadRequestException);
        assert.equal(error.getResponse().errors[0].field, `publications.0.${field}`);
        return true;
      });
    }

    const { prisma, audit } = createFakePrisma({ profiles: [profile()] });
    const { service } = createService(prisma, audit);
    const saved = await service.updateProfile(staff, "profile-1", updateResearcherProfilePipe.transform({ contextVersion: contextVersion(), publications: [publication], curriculumVitae: validCv() }));
    const reloaded = await service.getProfile(staff, "profile-1");
    assert.deepEqual(reloaded.curriculumVitae.researchExperience, validCv().researchExperience);
    assert.equal(reloaded.publications[0].title, publication.title);
    assert.equal(reloaded.publications[0].publicationType, "Báo cáo hội nghị");
    const publicationId = saved.profile.publications[0].id;
    const updatedPublication = { ...publication, id: publicationId, issnIsbn: "ISBN 9876-5432", classification: "Q2", proofUrl: "https://example.test/proof-v2" };
    const updated = await service.updateProfile(staff, "profile-1", updateResearcherProfilePipe.transform({ contextVersion: contextVersion(saved.profile.aggregateVersion), publications: [updatedPublication] }));
    const persisted = prisma.store.publications[0];
    assert.equal(persisted.publicationYear, 1899);
    assert.deepEqual({ issnIsbn: persisted.issnIsbn, classification: persisted.classification, proofUrl: persisted.proofUrl }, { issnIsbn: updatedPublication.issnIsbn, classification: updatedPublication.classification, proofUrl: updatedPublication.proofUrl });
    assert.deepEqual({ issnIsbn: updated.profile.publications[0].issnIsbn, classification: updated.profile.publications[0].classification, proofUrl: updated.profile.publications[0].proofUrl }, { issnIsbn: updatedPublication.issnIsbn, classification: updatedPublication.classification, proofUrl: updatedPublication.proofUrl });
    const added = await service.updateProfile(staff, "profile-1", updateResearcherProfilePipe.transform({
      contextVersion: contextVersion(updated.profile.aggregateVersion),
      publications: [updatedPublication, { title: "Giữ B" }, { title: "Ẩn C", status: "INACTIVE" }]
    }));
    const kept = added.profile.publications.filter((row) => row.id !== publicationId);
    const removed = await service.updateProfile(staff, "profile-1", updateResearcherProfilePipe.transform({
      contextVersion: contextVersion(added.profile.aggregateVersion), publications: kept
    }));
    assert.deepEqual(removed.profile.publications.map((row) => row.title), ["Giữ B", "Ẩn C"]);
    assert.equal(prisma.store.publications.some((row) => row.id === publicationId), false);
    assert.equal(prisma.store.publications.find((row) => row.title === "Ẩn C").status, "INACTIVE");
    const deletionAudit = prisma.store.audits.at(-1);
    assert.equal(deletionAudit.beforeFacts.publications.length, 3);
    assert.equal(deletionAudit.afterFacts.publications.length, 2);
    prisma.store.publications.push({ ...prisma.store.publications[0], id: "foreign-publication", researcherProfileId: "profile-other" });
    const beforeForeign = structuredClone(prisma.store);
    await assert.rejects(() => service.updateProfile(staff, "profile-1", updateResearcherProfilePipe.transform({
      contextVersion: contextVersion(removed.profile.aggregateVersion),
      publications: [{ ...kept[0], title: "Must roll back" }, { id: "foreign-publication", title: "Foreign" }]
    })), NotFoundException);
    assert.deepEqual(prisma.store, beforeForeign);
    const unchanged = await service.updateProfile(staff, "profile-1", updateResearcherProfilePipe.transform({ contextVersion: contextVersion(removed.profile.aggregateVersion), title: "TS" }));
    assert.equal(unchanged.profile.publications.length, 2);
    const cleared = await service.updateProfile(staff, "profile-1", updateResearcherProfilePipe.transform({ contextVersion: contextVersion(unchanged.profile.aggregateVersion), publications: [] }));
    assert.deepEqual(cleared.profile.publications, []);
    assert.equal(prisma.store.publications[0].id, "foreign-publication");
  });

  it("reads an empty CV, saves the whole document, redacts sensitive facts, and keeps CV out of list rows", async () => {
    const { prisma, audit } = createFakePrisma({ profiles: [profile()] });
    const { service } = createService(prisma, audit);
    const empty = await service.getProfile(staff, "profile-1");
    assert.deepEqual(empty.curriculumVitae, { cvSchemaVersion: 1 });
    assert.deepEqual(empty.viewerAuthorization.allowedActions.filter((action) => action.startsWith("researcher-profile.cv.")), ["researcher-profile.cv.read", "researcher-profile.cv.update"]);
    const input = updateResearcherProfilePipe.transform({ contextVersion: contextVersion(), curriculumVitae: validCv() });
    const saved = await service.updateProfile(staff, "profile-1", input);
    assert.equal(saved.profile.aggregateVersion, 1);
    assert.equal(saved.profile.curriculumVitae.personalInfo.bankAccount, "123456");
    const afterFacts = prisma.store.audits.at(-1).afterFacts;
    assert.equal(afterFacts.curriculumVitae.personalInfo.bankAccount, undefined);
    assert.equal(afterFacts.curriculumVitae.personalInfo.avatarUrl, undefined);
    assert.ok(afterFacts.cvChanges.some((change) => change.section === "personalInfo" && change.field === "bankAccount" && change.changed === true));
    const listed = await service.listProfiles(staff, {});
    assert.equal("curriculumVitae" in listed.profiles[0], false);
  });

  it("round-trips a CV through the owner path and exposes redacted CV history", async () => {
    const ownerProfile = profile({ id: "profile-owner", linkedUserId: researcher.id });
    const { prisma, audit } = createFakePrisma({ profiles: [ownerProfile] });
    prisma.store.users.push({ ...researcher, status: "active", mustChangePassword: false, organizationScopes: [{ organizationUnitId: "org-1", organizationUnit: { id: "org-1", code: "ORG1", name: "Đơn vị 1", status: "active" } }] });
    const { service } = createService(prisma, audit);
    const initialCv = validCv({ personalInfo: { idIssueDate: "2000-01-01", idIssuePlace: "Hà Nội", bankName: "Ngân hàng", bankBranch: "Chi nhánh", smartCaSerial: "SCA-001" } });
    const input = updateMyProfilePipe.transform({ contextVersion: contextVersion(0, "profile-owner"), curriculumVitae: initialCv });
    const saved = await service.updateMyProfile(researcher, input);
    assert.equal(saved.profile.curriculumVitae.cvSchemaVersion, 1);
    const editedCv = structuredClone(initialCv);
    editedCv.personalInfo.bankAccount = "654321";
    const editedInput = updateMyProfilePipe.transform({ contextVersion: contextVersion(saved.profile.aggregateVersion, "profile-owner"), curriculumVitae: editedCv });
    const edited = await service.updateMyProfile(researcher, editedInput);
    const latestAudit = prisma.store.audits.at(-1);
    assert.deepEqual(latestAudit.afterFacts.cvChanges, [{ section: "personalInfo", field: "bankAccount", changed: true }]);
    const history = await service.listHistory(researcher, "profile-owner");
    assert.deepEqual(history.at(-1).afterFacts.cvChanges, [{ section: "personalInfo", field: "bankAccount", changed: true }]);
    const sensitiveFields = ["avatarUrl", "idNumber", "idIssueDate", "idIssuePlace", "bankAccount", "bankName", "bankBranch", "smartCaSerial", "shareDataAgreement"];
    for (const facts of [latestAudit.beforeFacts, latestAudit.afterFacts, history.at(-1).beforeFacts, history.at(-1).afterFacts]) {
      for (const field of sensitiveFields) assert.equal(field in facts.curriculumVitae.personalInfo, false, `${field} leaked`);
    }
    await service.updateMyProfile(researcher, updateMyProfilePipe.transform({ contextVersion: contextVersion(edited.profile.aggregateVersion, "profile-owner"), fullName: "Tên Mới" }));
    assert.equal(prisma.store.users.find((user) => user.id === researcher.id).displayName, "Tên Mới");
  });

  it("drops legacy scientistType, stores and serves a data-URL portrait, and rolls back CV updates when audit fails", async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
    const avatarUrl = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
    const parsed = updateResearcherProfilePipe.transform({ contextVersion: contextVersion(), curriculumVitae: validCv({ personalInfo: { scientistType: "FOREIGN", avatarUrl: `data:image/jpeg;base64,${"A".repeat(300_000)}` } }) });
    assert.equal("scientistType" in parsed.curriculumVitae.personalInfo, false);
    const ownerProfile = profile({ linkedUserId: researcher.id, curriculumVitae: { ...validCv(), personalInfo: { ...validCv().personalInfo, scientistType: "DOMESTIC" } } });
    const { prisma, audit } = createFakePrisma({ profiles: [ownerProfile] });
    prisma.store.users.push({ ...researcher, status: "active", mustChangePassword: false, organizationScopes: [{ organizationUnitId: "org-1", organizationUnit: { id: "org-1", code: "ORG1", name: "Đơn vị 1", status: "active" } }] });
    const { service } = createService(prisma, audit);
    await service.updateMyProfile(researcher, updateMyProfilePipe.transform({ contextVersion: contextVersion(), curriculumVitae: validCv({ personalInfo: { scientistType: "FOREIGN", avatarUrl } }) }));
    assert.equal("scientistType" in prisma.store.profiles[0].curriculumVitae.personalInfo, false);
    const headers = {};
    let body;
    await new ResearcherProfilesController(service).myAvatar({ currentUser: researcher }, { setHeader(name, value) { headers[name] = value; }, send(content) { body = content; } });
    assert.deepEqual(body, jpeg);
    assert.deepEqual(headers, { "Content-Type": "image/jpeg", "Content-Length": String(jpeg.length), "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-cache" });
    prisma.store.profiles[0].curriculumVitae.personalInfo.avatarUrl = "/logo.png";
    await assert.rejects(() => service.getMyAvatar(researcher), NotFoundException);

    const available = createFakePrisma({ profiles: [profile()], failAudit: true });
    const availableService = createService(available.prisma, available.audit).service;
    const input = updateResearcherProfilePipe.transform({ contextVersion: contextVersion(), curriculumVitae: validCv() });
    await assert.rejects(() => availableService.updateProfile(staff, "profile-1", input), /audit failed/);
    assert.equal(available.prisma.store.profiles[0].curriculumVitae, null);
    assert.equal(available.prisma.store.profiles[0].aggregateVersion, 0);
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
    const input = updateResearcherProfilePipe.transform({ fullName: "Mới", curriculumVitae: validCv(), contextVersion: { domain: "researcher-profile", recordId: "profile-1", aggregateVersion: 1, relationshipVersion: 0, conflictVersion: 0, delegationVersion: 0, policyVersion: "v1" } });
    await assert.rejects(() => service.updateProfile(staff, "profile-1", input), (error) => {
      assert.ok(error instanceof ConflictException);
      assert.equal(error.getStatus(), 409);
      assert.equal(error.getResponse().code, "CONTEXT_VERSION_MISMATCH");
      return true;
    });
    assert.equal(prisma.store.profiles[0].fullName, "Nguyễn Ánh");
    assert.equal(prisma.store.profiles[0].curriculumVitae, null);
    assert.equal(prisma.store.profiles[0].aggregateVersion, 2);
  });

  it("denies out-of-scope reads and leadership manager writes", async () => {
    const { prisma, audit } = createFakePrisma({ profiles: [profile()] });
    const { service } = createService(prisma, audit);
    await assert.rejects(() => service.getProfile(outOfScopeStaff, "profile-1"), ForbiddenException);
    await assert.rejects(() => service.updateProfile(leadership, "profile-1", { curriculumVitae: validCv(), contextVersion: contextVersion() }), ForbiddenException);
  });

  it("rejects self username changes and lets a scoped manager set a linked researcher's username", async () => {
    assert.throws(() => updateMyProfilePipe.transform({ contextVersion: contextVersion(), username: "nva" }), (error) => {
      assert.deepEqual(error.getResponse().errors.map((item) => item.field), ["administrativeFields"]);
      return true;
    });
    const linkedUser = { ...researcher, username: null, usernameKey: null, status: "active", mustChangePassword: false, organizationScopes: [] };
    const { prisma, audit } = createFakePrisma({ profiles: [profile({ linkedUserId: researcher.id }), profile({ id: "profile-unlinked" }), profile({ id: "profile-staff", linkedUserId: "head-2" })] });
    prisma.store.users.push(linkedUser, { id: "other-user", username: "taken", usernameKey: "taken" }, { id: "head-2", username: "head", usernameKey: "head", systemRole: "SCIENTIFIC_MANAGEMENT_HEAD", status: "active" });
    const { service } = createService(prisma, audit);
    const saved = await service.updateProfile(staff, "profile-1", updateResearcherProfilePipe.transform({ contextVersion: contextVersion(), username: " NVA " }));
    assert.equal(linkedUser.username, "nva");
    assert.equal(saved.profile.account.username, "nva");
    assert.equal(prisma.store.audits.find((item) => item.action === "change-username").targetEntityId, researcher.id);
    await assert.rejects(() => service.updateProfile(staff, "profile-1", updateResearcherProfilePipe.transform({ contextVersion: contextVersion(1), username: "taken" })), (error) => {
      assert.ok(error instanceof ConflictException);
      assert.deepEqual(error.getResponse().errors.map((item) => item.field), ["username"]);
      return true;
    });
    assert.equal(linkedUser.username, "nva");
    await assert.rejects(() => service.updateProfile(staff, "profile-unlinked", updateResearcherProfilePipe.transform({ contextVersion: contextVersion(0, "profile-unlinked"), username: "abc" })), BadRequestException);
    await assert.rejects(() => service.updateProfile(staff, "profile-staff", updateResearcherProfilePipe.transform({ contextVersion: contextVersion(0, "profile-staff"), username: "abc" })), ForbiddenException);
  });

  it("rolls back the observable create when the required audit append fails", async () => {
    const { prisma, audit } = createFakePrisma({ failAudit: true });
    const { service } = createService(prisma, audit);
    await assert.rejects(() => service.createProfile(staff, createInput({ profileType: "EXTERNAL" })), /audit failed/);
    assert.equal(prisma.store.profiles.length, 0);
  });
});
