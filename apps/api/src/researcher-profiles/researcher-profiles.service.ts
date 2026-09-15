import { PasswordService } from "../auth/password.service.js";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
// @ts-ignore: runtime package is JavaScript; repository consumers use its TypeScript source contract.
import type { ContextVersionTokenV1 } from "@rtms/permissions";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { assertResearcherProfileAction, canEditOwnResearcherProfile, canManageResearcherProfiles, hasResearcherProfileScope, projectResearcherProfileAuthorization } from "./researcher-profile-access.js";
import type { CreateResearcherProfileDto, ResearcherProfileParticipationInput, ResearcherProfilePublicationInput, UpdateResearcherProfileDto, ResearcherAccountInput } from "./researcher-profiles.dto.js";
import { MailService } from "../notifications/mail.service.js";

type ProfileWithRelations = {
  id: string;
  managementOrganizationUnitId: string;
  externalAffiliation: string | null;
  profileType: string;
  fullName: string;
  fullNameKey: string;
  academicRankCatalogItemId: string | null;
  academicDegreeCatalogItemId: string | null;
  title: string | null;
  position: string | null;
  militaryRank: string | null;
  contactEmail: string | null;
  contactEmailKey: string | null;
  contactPhone: string | null;
  contactPhoneKey: string | null;
  contactNote: string | null;
  status: string;
  aggregateVersion: number;
  createdById: string;
  updatedById: string;
  createdAt: Date;
  updatedAt: Date;
  managementOrganizationUnit: { id: string; code: string; name: string; status: string };
  academicRankCatalogItem: { id: string; code: string; name: string; type: string } | null;
  academicDegreeCatalogItem: { id: string; code: string; name: string; type: string } | null;
  researchFields: Array<{ catalogItem: { id: string; code: string; name: string; type: string } }>;
  expertiseKeywords: Array<{ keyword: string; keywordKey: string }>;
  credentialDeliveries: Array<{ id: string; status: string; recipientEmail: string; createdAt: Date }>;
  linkedUserId: string | null;
  linkedUser: { id: string; username: string; displayName: string; status: string; systemRole: string | null; mustChangePassword: boolean } | null;
  publications: Array<{ id: string; title: string; venue: string | null; publicationYear: number | null; doi: string | null; authors: string | null; status: string; notes: string | null; createdAt: Date; updatedAt: Date }>;
  participations: Array<{ id: string; projectTitle: string; participationRole: string; level: string; startsOn: Date | null; endsOn: Date | null; status: string; notes: string | null; sourceType: string; sourceRecordId: string | null; supersedesId: string | null; createdAt: Date; updatedAt: Date }>;
};

const profileInclude = {
  managementOrganizationUnit: { select: { id: true, code: true, name: true, status: true } },
  academicRankCatalogItem: { select: { id: true, code: true, name: true, type: true } },
  academicDegreeCatalogItem: { select: { id: true, code: true, name: true, type: true } },
  researchFields: { include: { catalogItem: { select: { id: true, code: true, name: true, type: true } } }, orderBy: { catalogItem: { name: "asc" } } },
  expertiseKeywords: { orderBy: { keywordKey: "asc" } },
  credentialDeliveries: { select: { id: true, status: true, recipientEmail: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
  linkedUser: { select: { id: true, username: true, displayName: true, status: true, systemRole: true, mustChangePassword: true } },
  publications: { orderBy: [{ publicationYear: "desc" }, { title: "asc" }] },
  participations: { orderBy: [{ startsOn: "desc" }, { projectTitle: "asc" }] }
} satisfies Prisma.ResearcherProfileInclude;

export function normalizeResearcherKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLocaleLowerCase("vi").replace(/\s+/g, " ").trim();
}

function normalizeEmail(value?: string | null) {
  return value?.trim().toLocaleLowerCase("en-US");
}

function normalizePhone(value?: string | null) {
  return value?.replace(/[^0-9+]/g, "");
}

function activeScopeIds(actor: SafeUserContext) {
  return actor.organizationScopes.map((scope) => scope.id);
}

@Injectable()
export class ResearcherProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly mailService: MailService,
    private readonly passwordService: PasswordService
  ) {}

  async listProfiles(actor: SafeUserContext, query: { profileType?: string; researchFieldId?: string; organizationUnitId?: string; status?: string; keyword?: string; page?: string; pageSize?: string }) {
    if (Object.values(query).some((value) => value !== undefined && typeof value !== "string")) throw new BadRequestException();
    if (!canManageResearcherProfiles(actor)) {
      throw new ForbiddenException({ message: "Bạn không có quyền xem danh sách hồ sơ nhà khoa học." });
    }
    if (query.profileType && !["INTERNAL", "EXTERNAL"].includes(query.profileType)) throw new BadRequestException();
    if (query.status && !["ACTIVE", "INACTIVE"].includes(query.status)) throw new BadRequestException();
    const organizationIds = activeScopeIds(actor);
    const requestedOrganizationId = query.organizationUnitId?.trim();
    if (requestedOrganizationId && !hasResearcherProfileScope(actor, requestedOrganizationId)) {
      throw new ForbiddenException({ message: "Bạn không có quyền xem hồ sơ trong phạm vi này." });
    }
    const page = Math.max(Number.parseInt(query.page ?? "1", 10) || 1, 1);
    const pageSize = Math.min(Math.max(Number.parseInt(query.pageSize ?? "20", 10) || 20, 1), 100);
    const keyword = query.keyword?.trim() ? normalizeResearcherKey(query.keyword) : undefined;
    const where = {
      managementOrganizationUnitId: requestedOrganizationId ? requestedOrganizationId : { in: organizationIds },
      ...(query.profileType ? { profileType: query.profileType } : {}),
      ...(query.researchFieldId ? { researchFields: { some: { catalogItemId: query.researchFieldId } } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(keyword ? { OR: [{ fullNameKey: { contains: keyword } }, { contactEmailKey: { contains: keyword } }, { expertiseKeywords: { some: { keywordKey: { contains: keyword } } } }] } : {})
    } as never;
    const [profiles, total] = await Promise.all([
      this.prisma.researcherProfile.findMany({ where, select: { id: true, fullName: true, profileType: true, status: true, managementOrganizationUnitId: true, linkedUserId: true, aggregateVersion: true, managementOrganizationUnit: profileInclude.managementOrganizationUnit, linkedUser: profileInclude.linkedUser }, orderBy: [{ fullNameKey: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.researcherProfile.count({ where })
    ]);
    return {
      profiles: profiles.map((profile) => ({ id: profile.id, fullName: profile.fullName, profileType: profile.profileType, status: profile.status, managementOrganization: profile.managementOrganizationUnit, account: profile.linkedUser ? this.safeAccount(profile.linkedUser) : null, viewerAuthorization: projectResearcherProfileAuthorization(actor, profile) })),
      organizationOptions: actor.organizationScopes,
      page,
      pageSize,
      total,
      canCreate: organizationIds.length > 0
    };
  }

  async listCatalogs(actor: SafeUserContext) {
    if (!canManageResearcherProfiles(actor)) await this.getMyProfile(actor);
    const items = await this.prisma.catalogItem.findMany({ where: { status: "active", deletedAt: null, type: { in: ["research-field", "academic-rank", "academic-degree"] } }, orderBy: [{ type: "asc" }, { name: "asc" }] });
    return {
      researchFields: items.filter((item) => item.type === "research-field"),
      academicRanks: items.filter((item) => item.type === "academic-rank"),
      academicDegrees: items.filter((item) => item.type === "academic-degree")
    };
  }

  async getProfile(actor: SafeUserContext, id: string) {
    const profile = await this.findProfile(id);
    assertResearcherProfileAction(actor, "researcher-profile.read", profile.managementOrganizationUnitId);
    return this.toResponse(actor, profile);
  }

  async createProfile(actor: SafeUserContext, input: CreateResearcherProfileDto) {
    assertResearcherProfileAction(actor, "researcher-profile.create", input.managementOrganizationUnitId);
    const correlationId = randomUUID();
    const profile = await this.prisma.$transaction(async (tx) => {
      await this.assertCurrentManager(tx, actor, input.managementOrganizationUnitId, "researcher-profile.create");
      const organization = await tx.organizationUnit.findFirst({ where: { id: input.managementOrganizationUnitId, status: "active" } });
      if (!organization) throw new BadRequestException({ message: "Đơn vị quản lý không hợp lệ." });
      await this.validateCatalogs(tx, input);
      const duplicateCandidates = await this.findDuplicateCandidates(tx, input, actor);
      if (duplicateCandidates.length > 0 && !input.confirmDuplicate) {
        return { profile: null, duplicateCandidates };
      }
      const created = (await tx.researcherProfile.create({
        data: this.createData(input, actor.id),
        include: profileInclude
      } as never)) as unknown as ProfileWithRelations;
      await this.auditLog.record({
        action: "create-researcher-profile",
        result: "success",
        actorId: actor.id,
        targetEntity: "researcher-profile",
        targetEntityId: created.id,
        username: actor.username,
        correlationId,
        afterFacts: this.auditFacts(created)
      }, tx);
      await this.writeProfileHistory(tx, created.id, actor.id, "CREATE", undefined, this.auditFacts(created));
      return { profile: created, duplicateCandidates };
    });
    return {
      profile: profile.profile ? this.toResponse(actor, profile.profile) : null,
      duplicateWarning: profile.duplicateCandidates.length > 0,
      requiresConfirmation: !profile.profile,
      duplicateCandidates: profile.duplicateCandidates,
      correlationId
    };
  }

  async updateProfile(actor: SafeUserContext, id: string, input: UpdateResearcherProfileDto) {
    const current = await this.findProfile(id);
    assertResearcherProfileAction(actor, "researcher-profile.update", current.managementOrganizationUnitId);
    this.assertProfileVersion(input.contextVersion, current);
    const correlationId = randomUUID();
    const updated = await this.prisma.$transaction(async (tx) => {
      const profile = await this.lockedProfile(tx, actor, id, "researcher-profile.update");
      if (!profile) throw new NotFoundException({ message: "Không tìm thấy hồ sơ nhà khoa học." });
      assertResearcherProfileAction(actor, "researcher-profile.update", profile.managementOrganizationUnitId);
      this.assertProfileVersion(input.contextVersion, profile);
      if (input.profileType !== undefined && input.profileType !== profile.profileType && profile.linkedUserId) {
        throw new ConflictException({ message: "Không thể đổi loại hồ sơ khi hồ sơ đang liên kết tài khoản.", code: "PROFILE_ACCOUNT_ROLE_CONFLICT" });
      }
      await this.validateCatalogs(tx, input);
      const result = await tx.researcherProfile.updateMany({ where: { id, aggregateVersion: input.contextVersion.aggregateVersion }, data: { ...this.updateData(input), aggregateVersion: { increment: 1 }, updatedById: actor.id } });
      if (result.count !== 1) throw new ConflictException({ message: "Dữ liệu hồ sơ đã thay đổi. Vui lòng tải lại trước khi thử lại.", code: "CONTEXT_VERSION_MISMATCH", correlationId });
      if (Object.keys(this.childData(input)).length > 0) await tx.researcherProfile.update({ where: { id }, data: this.childData(input) as never });
      await this.syncPublications(tx, id, input.publications, actor.id);
      await this.syncParticipations(tx, id, input.participations, actor.id);
      const withChildren = (await tx.researcherProfile.findUnique({ where: { id }, include: profileInclude } as never)) as unknown as ProfileWithRelations;
      await this.auditLog.record({
        action: "update-researcher-profile",
        result: "success",
        actorId: actor.id,
        targetEntity: "researcher-profile",
        targetEntityId: id,
        username: actor.username,
        correlationId,
        beforeFacts: this.auditFacts(profile),
        afterFacts: this.auditFacts(withChildren)
      }, tx);
      await this.writeProfileHistory(tx, id, actor.id, "UPDATE", this.auditFacts(profile), this.auditFacts(withChildren));
      return withChildren;
    });
    return { profile: this.toResponse(actor, updated), correlationId };
  }

  async setStatus(actor: SafeUserContext, id: string, status: "ACTIVE" | "INACTIVE", contextVersion: ContextVersionTokenV1) {
    const current = await this.findProfile(id);
    const action = status === "ACTIVE" ? "researcher-profile.activate" : "researcher-profile.deactivate";
    assertResearcherProfileAction(actor, action, current.managementOrganizationUnitId);
    this.assertProfileVersion(contextVersion, current);
    const correlationId = randomUUID();
    const updated = await this.prisma.$transaction(async (tx) => {
      const profile = await this.lockedProfile(tx, actor, id, action);
      if (!profile) throw new NotFoundException({ message: "Không tìm thấy hồ sơ nhà khoa học." });
      assertResearcherProfileAction(actor, action, profile.managementOrganizationUnitId);
      this.assertProfileVersion(contextVersion, profile);
      const result = await tx.researcherProfile.updateMany({ where: { id, aggregateVersion: contextVersion.aggregateVersion }, data: { status, aggregateVersion: { increment: 1 }, updatedById: actor.id } });
      if (result.count !== 1) throw new ConflictException({ message: "Dữ liệu hồ sơ đã thay đổi. Vui lòng tải lại trước khi thử lại.", code: "CONTEXT_VERSION_MISMATCH", correlationId });
      const next = (await tx.researcherProfile.findUnique({ where: { id }, include: profileInclude })) as unknown as ProfileWithRelations;
      await this.auditLog.record({ action: status === "ACTIVE" ? "activate-researcher-profile" : "deactivate-researcher-profile", result: "success", actorId: actor.id, targetEntity: "researcher-profile", targetEntityId: id, username: actor.username, correlationId, beforeFacts: this.auditFacts(profile), afterFacts: this.auditFacts(next) }, tx);
      await this.writeProfileHistory(tx, id, actor.id, status === "ACTIVE" ? "ACTIVATE" : "DEACTIVATE", this.auditFacts(profile), this.auditFacts(next));
      return next;
    });
    return { profile: this.toResponse(actor, updated), correlationId };
  }

  async listHistory(actor: SafeUserContext, id: string) {
    const profile = await this.findProfile(id);
    if (!canEditOwnResearcherProfile(actor, profile)) assertResearcherProfileAction(actor, "researcher-profile.history.read", profile.managementOrganizationUnitId);
    const manager = canManageResearcherProfiles(actor);
    const records = await this.prisma.researcherProfileHistory.findMany({ where: { researcherProfileId: id, ...(!manager ? { researcherProfile: { linkedUserId: actor.id, status: "ACTIVE" }, action: { in: ["CREATE", "UPDATE", "SELF_UPDATE"] } } : {}) }, orderBy: { createdAt: "desc" }, take: 100 });
    const personalFacts = (facts: unknown) => facts && typeof facts === "object" ? Object.fromEntries(Object.entries(facts).filter(([key]) => ["fullName", "externalAffiliation", "academicRankCatalogItemId", "academicDegreeCatalogItemId", "title", "position", "militaryRank", "contactEmail", "contactPhone", "contactNote", "researchFieldIds", "expertiseKeywordKeys", "publications", "participations"].includes(key))) : null;
    return records.map((record) => manager ? { ...record, createdAt: record.createdAt.toISOString() } : { id: record.id, action: record.action, createdAt: record.createdAt.toISOString(), beforeFacts: personalFacts(record.beforeFacts), afterFacts: personalFacts(record.afterFacts) });
  }

  async getMyProfile(actor: SafeUserContext) {
    const profile = (await this.prisma.researcherProfile.findFirst({ where: { linkedUserId: actor.id }, include: profileInclude } as never)) as unknown as ProfileWithRelations | null;
    if (!profile || !canEditOwnResearcherProfile(actor, profile)) throw new ForbiddenException({ message: "Hồ sơ liên kết không tồn tại, đã ngừng hoạt động hoặc không còn hợp lệ." });
    return this.toResponse(actor, profile);
  }

  async updateMyProfile(actor: SafeUserContext, input: UpdateResearcherProfileDto) {
    const current = (await this.prisma.researcherProfile.findFirst({ where: { linkedUserId: actor.id }, include: profileInclude } as never)) as unknown as ProfileWithRelations | null;
    if (!current || !canEditOwnResearcherProfile(actor, current)) throw new ForbiddenException({ message: "Hồ sơ liên kết không tồn tại, đã ngừng hoạt động hoặc không còn hợp lệ." });
    this.assertProfileVersion(input.contextVersion, current);
    const correlationId = randomUUID();
    const safeInput: UpdateResearcherProfileDto = {
      contextVersion: input.contextVersion,
      fullName: input.fullName,
      externalAffiliation: input.externalAffiliation,
      academicRankCatalogItemId: input.academicRankCatalogItemId,
      academicDegreeCatalogItemId: input.academicDegreeCatalogItemId,
      title: input.title,
      position: input.position,
      militaryRank: input.militaryRank,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      contactNote: input.contactNote,
      researchFieldIds: input.researchFieldIds,
      expertiseKeywords: input.expertiseKeywords,
      publications: input.publications,
      participations: input.participations
    };
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM researcher_profiles WHERE id = ${current.id} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${actor.id} FOR SHARE`;
      const activeUser = await tx.user.findUnique({ where: { id: actor.id } });
      if (!activeUser || activeUser.status !== "active" || activeUser.mustChangePassword) throw new ForbiddenException();
      const profile = (await tx.researcherProfile.findUnique({ where: { id: current.id }, include: profileInclude } as never)) as unknown as ProfileWithRelations | null;
      if (!profile || profile.linkedUserId !== actor.id || profile.status !== "ACTIVE") throw new ForbiddenException({ message: "Hồ sơ liên kết không tồn tại, đã ngừng hoạt động hoặc không còn hợp lệ." });
      this.assertProfileVersion(input.contextVersion, profile);
      await this.validateCatalogs(tx, safeInput);
      const result = await tx.researcherProfile.updateMany({ where: { id: profile.id, linkedUserId: actor.id, aggregateVersion: input.contextVersion.aggregateVersion }, data: { ...this.updateData(safeInput), aggregateVersion: { increment: 1 }, updatedById: actor.id } });
      if (result.count !== 1) throw new ConflictException({ message: "Dữ liệu hồ sơ đã thay đổi. Vui lòng tải lại trước khi thử lại.", code: "CONTEXT_VERSION_MISMATCH", correlationId });
      if (Object.keys(this.childData(safeInput)).length > 0) await tx.researcherProfile.update({ where: { id: profile.id }, data: this.childData(safeInput) as never });
      await this.syncPublications(tx, profile.id, safeInput.publications, actor.id);
      await this.syncParticipations(tx, profile.id, safeInput.participations, actor.id);
      const next = (await tx.researcherProfile.findUnique({ where: { id: profile.id }, include: profileInclude } as never)) as unknown as ProfileWithRelations;
      await this.auditLog.record({ action: "update-my-researcher-profile", result: "success", actorId: actor.id, targetEntity: "researcher-profile", targetEntityId: profile.id, username: actor.username, correlationId, beforeFacts: this.auditFacts(profile), afterFacts: this.auditFacts(next) }, tx);
      await this.writeProfileHistory(tx, profile.id, actor.id, "SELF_UPDATE", this.auditFacts(profile), this.auditFacts(next));
      return next;
    });
    return { profile: this.toResponse(actor, updated), correlationId };
  }

  private async lockedProfile(tx: Prisma.TransactionClient, actor: SafeUserContext, id: string, action: Parameters<typeof assertResearcherProfileAction>[1], expected?: ContextVersionTokenV1) {
    await tx.$queryRaw`SELECT id FROM researcher_profiles WHERE id = ${id} FOR UPDATE`;
    const profile = await tx.researcherProfile.findUnique({ where: { id }, include: profileInclude }) as unknown as ProfileWithRelations | null;
    if (!profile) throw new NotFoundException({ message: "Không tìm thấy hồ sơ nhà khoa học." });
    await this.assertCurrentManager(tx, actor, profile.managementOrganizationUnitId, action);
    if (expected) this.assertProfileVersion(expected, profile);
    return profile;
  }

  private async assertCurrentManager(tx: Prisma.TransactionClient, actor: SafeUserContext, organizationId: string, action: Parameters<typeof assertResearcherProfileAction>[1]) {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${actor.id} FOR SHARE`;
    await tx.$queryRaw`SELECT s.user_id FROM user_organization_scopes s JOIN organization_units o ON o.id = s.organization_unit_id WHERE s.user_id = ${actor.id} AND o.id = ${organizationId} FOR SHARE OF s, o`;
    const current = await tx.user.findUnique({ where: { id: actor.id }, include: { organizationScopes: { include: { organizationUnit: true } } } });
    if (!current || current.status !== "active" || current.mustChangePassword || current.systemRole !== actor.systemRole || !current.organizationScopes.some((scope) => scope.organizationUnitId === organizationId && scope.organizationUnit.status === "active")) throw new ForbiddenException({ message: "Quyền hoặc phạm vi đã thay đổi. Vui lòng đăng nhập lại." });
    assertResearcherProfileAction(actor, action, organizationId);
  }

  async accountCandidates(actor: SafeUserContext, profileId: string, keyword = "") {
    if (typeof keyword !== "string") throw new BadRequestException();
    const profile = await this.findProfile(profileId);
    assertResearcherProfileAction(actor, "researcher-profile.account.link", profile.managementOrganizationUnitId);
    if (profile.status !== "ACTIVE" || profile.linkedUserId) throw new ConflictException({ message: "Hồ sơ phải đang hoạt động và chưa liên kết tài khoản." });
    const accounts = await this.prisma.user.findMany({ where: { id: { not: actor.id }, status: "active", researcherProfile: null,
      systemRole: profile.profileType === "EXTERNAL" ? "EXTERNAL_RESEARCHER_USER" : "RESEARCHER_INTERNAL_USER",
      organizationScopes: { some: { organizationUnitId: profile.managementOrganizationUnitId, organizationUnit: { status: "active" } } },
      ...(keyword.trim() ? { OR: [{ username: { contains: keyword.trim().slice(0, 120), mode: "insensitive" as const } }, { displayName: { contains: keyword.trim().slice(0, 120), mode: "insensitive" as const } }] } : {}) },
      select: { id: true, username: true, displayName: true }, orderBy: { displayName: "asc" }, take: 50 });
    return { accounts };
  }

  async createResearcherAccount(actor: SafeUserContext, profileId: string, input: ResearcherAccountInput) {
    const email = input.email;
    if (!email) throw new BadRequestException({ message: "Cần nhập email nhận thông tin tài khoản." });
    await this.checkMailConfiguration(actor, profileId, "researcher-profile.account.create");
    const temporaryPassword = `Aa1!${randomBytes(24).toString("base64url")}`;
    const correlationId = randomUUID();
    const result = await this.accountTransaction(async (tx) => {
      const profile = await this.lockedProfile(tx, actor, profileId, "researcher-profile.account.create", input.contextVersion);
      if (profile.status !== "ACTIVE" || profile.linkedUserId) throw new ConflictException({ message: "Hồ sơ phải đang hoạt động và chưa liên kết tài khoản." });
      const username = this.accountUsername(input.username, email);
      const systemRole = profile.profileType === "EXTERNAL" ? "EXTERNAL_RESEARCHER_USER" : "RESEARCHER_INTERNAL_USER";
      const passwordHash = await this.passwordService.hashPassword(temporaryPassword);
      const user = await tx.user.create({ data: { username, usernameKey: username, displayName: profile.fullName, passwordHash, credentialEmail: email, mustChangePassword: true, status: "active", systemRole, unit: profile.managementOrganizationUnit.name,
        organizationScopes: { create: { organizationUnitId: profile.managementOrganizationUnitId, isPrimary: true } } } });
      await tx.researcherProfile.update({ where: { id: profileId }, data: { linkedUserId: user.id, aggregateVersion: { increment: 1 }, updatedById: actor.id } });
      await tx.researcherProfileAccountLink.create({ data: { researcherProfileId: profileId, userId: user.id, effectiveFrom: new Date(), reason: "profile-account-creation", createdById: actor.id } });
      const delivery = await tx.accountCredentialDelivery.create({ data: { researcherProfileId: profileId, userId: user.id, recipientEmail: email, templateKey: "researcher_account_created", status: "PENDING" } });
      for (const action of ["create-researcher-account", "link-researcher-account", "issue-researcher-credential"]) await this.auditLog.record({ action, result: "success", actorId: actor.id, targetEntity: "researcher-profile", targetEntityId: profileId, correlationId, afterFacts: { userId: user.id, systemRole, organizationUnitId: profile.managementOrganizationUnitId, deliveryId: delivery.id } }, tx);
      await this.writeProfileHistory(tx, profileId, actor.id, "ACCOUNT_CREATED", { linkedUserId: null }, { linkedUserId: user.id });
      return { user, delivery };
    });
    const delivery = await this.deliverCredential(result.delivery.id, email, result.user.username, result.user.displayName, temporaryPassword, actor, correlationId);
    return { account: this.safeAccount(result.user), delivery, correlationId };
  }

  async linkResearcherAccount(actor: SafeUserContext, profileId: string, input: ResearcherAccountInput) {
    if (!input.userId) throw new BadRequestException({ message: "Cần chọn tài khoản." });
    const correlationId = randomUUID();
    await this.accountTransaction(async (tx) => {
      const profile = await this.lockedProfile(tx, actor, profileId, "researcher-profile.account.link", input.contextVersion);
      if (profile.status !== "ACTIVE" || profile.linkedUserId) throw new ConflictException({ message: "Hồ sơ phải đang hoạt động và chưa liên kết tài khoản." });
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${input.userId} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: input.userId }, include: { organizationScopes: { include: { organizationUnit: true } }, researcherProfile: true } });
      const expectedRole = profile.profileType === "EXTERNAL" ? "EXTERNAL_RESEARCHER_USER" : "RESEARCHER_INTERNAL_USER";
      if (!user || user.id === actor.id || user.status !== "active" || user.systemRole !== expectedRole || user.researcherProfile || !user.organizationScopes.some((scope) => scope.organizationUnitId === profile.managementOrganizationUnitId && scope.organizationUnit.status === "active")) throw new ConflictException({ message: "Tài khoản đã liên kết hoặc không phù hợp loại/phạm vi hồ sơ." });
      await tx.researcherProfile.update({ where: { id: profileId }, data: { linkedUserId: user.id, aggregateVersion: { increment: 1 }, updatedById: actor.id } });
      await tx.researcherProfileAccountLink.create({ data: { researcherProfileId: profileId, userId: user.id, effectiveFrom: new Date(), reason: input.reason, createdById: actor.id } });
      await this.auditLog.record({ action: "link-researcher-account", result: "success", actorId: actor.id, targetEntity: "researcher-profile", targetEntityId: profileId, correlationId, afterFacts: { userId: user.id } }, tx);
      await this.writeProfileHistory(tx, profileId, actor.id, "ACCOUNT_LINKED", { linkedUserId: null }, { linkedUserId: user.id }, input.reason);
    });
    return { profile: await this.getProfile(actor, profileId), correlationId };
  }

  async unlinkResearcherAccount(actor: SafeUserContext, profileId: string, input: ResearcherAccountInput) {
    if (!input.reason) throw new BadRequestException({ message: "Cần nêu lý do hủy liên kết." });
    await this.accountTransaction(async (tx) => {
      const profile = await this.lockedProfile(tx, actor, profileId, "researcher-profile.account.unlink", input.contextVersion);
      if (!profile.linkedUserId) throw new ConflictException({ message: "Hồ sơ chưa liên kết tài khoản." });
      if (profile.linkedUserId === actor.id || (actor.systemRole !== "SYSTEM_ADMIN" && !["RESEARCHER_INTERNAL_USER", "EXTERNAL_RESEARCHER_USER"].includes(profile.linkedUser?.systemRole ?? ""))) throw new ForbiddenException();
      await tx.researcherProfile.update({ where: { id: profileId }, data: { linkedUserId: null, aggregateVersion: { increment: 1 }, updatedById: actor.id } });
      await tx.researcherProfileAccountLink.updateMany({ where: { researcherProfileId: profileId, status: "ACTIVE" }, data: { status: "ENDED", effectiveUntil: new Date(), reason: input.reason } });
      await this.auditLog.record({ action: "unlink-researcher-account", result: "success", actorId: actor.id, targetEntity: "researcher-profile", targetEntityId: profileId, reason: input.reason, beforeFacts: { userId: profile.linkedUserId } }, tx);
      await this.writeProfileHistory(tx, profileId, actor.id, "ACCOUNT_UNLINKED", { linkedUserId: profile.linkedUserId }, { linkedUserId: null }, input.reason);
    });
    return { profile: await this.getProfile(actor, profileId) };
  }

  async resetResearcherAccount(actor: SafeUserContext, profileId: string, input: ResearcherAccountInput) {
    if (!input.reason || !input.email) throw new BadRequestException({ message: "Cần nhập lý do và xác nhận email nhận mật khẩu tạm thời mới." });
    await this.checkMailConfiguration(actor, profileId, "researcher-profile.account.reset");
    const temporaryPassword = `Aa1!${randomBytes(24).toString("base64url")}`;
    const correlationId = randomUUID();
    const result = await this.accountTransaction(async (tx) => {
      const profile = await this.lockedProfile(tx, actor, profileId, "researcher-profile.account.reset", input.contextVersion);
      if (!profile.linkedUserId || profile.linkedUserId === actor.id || profile.status !== "ACTIVE") throw new ForbiddenException();
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${profile.linkedUserId} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: profile.linkedUserId }, include: { organizationScopes: { include: { organizationUnit: true } } } });
      if (!user || user.status !== "active" || user.systemRole !== (profile.profileType === "EXTERNAL" ? "EXTERNAL_RESEARCHER_USER" : "RESEARCHER_INTERNAL_USER") || !user.organizationScopes.some((scope) => scope.organizationUnitId === profile.managementOrganizationUnitId && scope.organizationUnit.status === "active")) throw new ForbiddenException();
      const passwordHash = await this.passwordService.hashPassword(temporaryPassword);
      await tx.user.update({ where: { id: user.id }, data: { passwordHash, credentialEmail: input.email, mustChangePassword: true, credentialVersion: { increment: 1 } } });
      await tx.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
      await tx.researcherProfile.update({ where: { id: profileId }, data: { aggregateVersion: { increment: 1 }, updatedById: actor.id } });
      const delivery = await tx.accountCredentialDelivery.create({ data: { researcherProfileId: profileId, userId: user.id, recipientEmail: input.email!, templateKey: "researcher_account_reset", status: "PENDING" } });
      await this.auditLog.record({ action: "reset-researcher-account", result: "success", actorId: actor.id, targetEntity: "researcher-profile", targetEntityId: profileId, correlationId, reason: input.reason, afterFacts: { userId: user.id, deliveryId: delivery.id } }, tx);
      await this.writeProfileHistory(tx, profileId, actor.id, "ACCOUNT_RESET", undefined, { userId: user.id, deliveryId: delivery.id }, input.reason);
      return { user, delivery };
    });
    return { delivery: await this.deliverCredential(result.delivery.id, input.email, result.user.username, result.user.displayName, temporaryPassword, actor, correlationId, "researcher_account_reset"), correlationId };
  }

  private async checkMailConfiguration(actor: SafeUserContext, profileId: string, action: "researcher-profile.account.create" | "researcher-profile.account.reset") {
    const profile = await this.findProfile(profileId);
    assertResearcherProfileAction(actor, action, profile.managementOrganizationUnitId);
    try { this.mailService.configuration(); } catch (error) {
      await this.auditLog.record({ action: "issue-researcher-credential", result: "failure", actorId: actor.id, targetEntity: "researcher-profile", targetEntityId: profileId, reason: "MAIL_NOT_CONFIGURED" });
      throw error;
    }
  }

  private async accountTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
    try { return await this.prisma.$transaction(operation); } catch (error) {
      if (error && typeof error === "object" && "code" in error && ["P2002", "P2034"].includes(String(error.code))) throw new ConflictException({ message: "Tài khoản hoặc liên kết đã thay đổi. Vui lòng tải lại." });
      throw error;
    }
  }

  private accountUsername(input: string | undefined, email: string) {
    const value = (input?.trim() || email).toLowerCase();
    if (!/^[a-z0-9][a-z0-9_.@+-]{2,127}$/.test(value)) throw new BadRequestException({ message: "Tên đăng nhập không hợp lệ." });
    return value;
  }

  private safeAccount(user: { id: string; username: string; displayName: string; status: string; systemRole: string | null; mustChangePassword: boolean }) {
    return { id: user.id, username: user.username, displayName: user.displayName, status: user.status, systemRole: user.systemRole, mustChangePassword: user.mustChangePassword };
  }

  private async deliverCredential(deliveryId: string, email: string, username: string, displayName: string, temporaryPassword: string, actor: SafeUserContext, correlationId: string, templateKey = "researcher_account_created") {
    let status = "ACCEPTED";
    try { await this.mailService.sendTemporaryCredential({ to: email, username, displayName, temporaryPassword, templateKey }); } catch { status = "UNKNOWN"; }
    await this.prisma.$transaction(async (tx) => {
      await tx.accountCredentialDelivery.update({ where: { id: deliveryId }, data: { status, attempts: { increment: 1 }, lastError: status === "UNKNOWN" ? "MAIL_DELIVERY_UNCONFIRMED" : null } });
      await this.auditLog.record({ action: "deliver-researcher-credential", result: status === "ACCEPTED" ? "success" : "failure", actorId: actor.id, targetEntity: "credential-delivery", targetEntityId: deliveryId, correlationId, reason: status === "UNKNOWN" ? "MAIL_DELIVERY_UNCONFIRMED" : undefined }, tx);
    });
    return { id: deliveryId, status };
  }

  private async findProfile(id: string) {
    const profile = (await this.prisma.researcherProfile.findUnique({ where: { id }, include: profileInclude })) as unknown as ProfileWithRelations | null;
    if (!profile) throw new NotFoundException({ message: "Không tìm thấy hồ sơ nhà khoa học." });
    return profile;
  }

  private async validateCatalogs(tx: Prisma.TransactionClient, input: Partial<UpdateResearcherProfileDto>) {
    const checks = [
      [input.academicRankCatalogItemId, "academic-rank", "academicRankCatalogItemId"],
      [input.academicDegreeCatalogItemId, "academic-degree", "academicDegreeCatalogItemId"]
    ] as const;
    for (const [id, type, field] of checks) {
      if (id && !(await tx.catalogItem.findFirst({ where: { id, type, status: "active", deletedAt: null } }))) throw new BadRequestException({ message: `${field} không hợp lệ.`, errors: [{ field, message: `${field} không hợp lệ.` }] });
    }
    for (const id of input.researchFieldIds ?? []) {
      if (!(await tx.catalogItem.findFirst({ where: { id, type: "research-field", status: "active", deletedAt: null } }))) throw new BadRequestException({ message: "researchFieldIds không hợp lệ.", errors: [{ field: "researchFieldIds", message: "researchFieldIds không hợp lệ." }] });
    }
  }

  private async findDuplicateCandidates(tx: Prisma.TransactionClient, input: CreateResearcherProfileDto, actor: SafeUserContext) {
    const fullNameKey = normalizeResearcherKey(input.fullName);
    const contactEmailKey = normalizeEmail(input.contactEmail);
    const contactPhoneKey = normalizePhone(input.contactPhone);
    const candidates = await tx.researcherProfile.findMany({ where: { managementOrganizationUnitId: { in: activeScopeIds(actor) }, OR: [{ fullNameKey }, ...(contactEmailKey ? [{ contactEmailKey }] : []), ...(contactPhoneKey ? [{ contactPhoneKey }] : [])] }, include: { managementOrganizationUnit: { select: { id: true, code: true, name: true } } }, take: 10 });
    return candidates.map((candidate) => ({ id: candidate.id, fullName: candidate.fullName, managementOrganization: candidate.managementOrganizationUnit }));
  }

  private createData(input: CreateResearcherProfileDto, actorId: string) {
    return {
      managementOrganizationUnitId: input.managementOrganizationUnitId,
      profileType: input.profileType ?? "INTERNAL",
      externalAffiliation: input.externalAffiliation,
      fullName: input.fullName,
      fullNameKey: normalizeResearcherKey(input.fullName),
      academicRankCatalogItemId: input.academicRankCatalogItemId,
      academicDegreeCatalogItemId: input.academicDegreeCatalogItemId,
      title: input.title,
      position: input.position,
      militaryRank: input.militaryRank,
      contactEmail: input.contactEmail,
      contactEmailKey: normalizeEmail(input.contactEmail),
      contactPhone: input.contactPhone,
      contactPhoneKey: normalizePhone(input.contactPhone),
      contactNote: input.contactNote,
      status: "ACTIVE",
      createdById: actorId,
      updatedById: actorId,
      researchFields: { create: input.researchFieldIds.map((catalogItemId) => ({ catalogItemId })) },
      expertiseKeywords: { create: (input.expertiseKeywords ?? []).map((keyword) => ({ keyword, keywordKey: normalizeResearcherKey(keyword) })) },
      publications: { create: (input.publications ?? []).map((publication) => this.publicationCreateData(publication, actorId)) },
      participations: { create: (input.participations ?? []).map((participation) => this.participationCreateData(participation, actorId)) }
    };
  }

  private updateData(input: UpdateResearcherProfileDto) {
    const data: Record<string, unknown> = {};
    for (const field of ["fullName", "externalAffiliation", "academicRankCatalogItemId", "academicDegreeCatalogItemId", "title", "position", "militaryRank", "contactEmail", "contactPhone", "contactNote", "profileType"] as const) {
      if (input[field] !== undefined) data[field] = input[field] ?? null;
    }
    if (input.fullName !== undefined) data.fullNameKey = normalizeResearcherKey(input.fullName);
    if (input.contactEmail !== undefined) data.contactEmailKey = normalizeEmail(input.contactEmail) ?? null;
    if (input.contactPhone !== undefined) data.contactPhoneKey = normalizePhone(input.contactPhone) ?? null;
    return data;
  }

  private childData(input: UpdateResearcherProfileDto) {
    const data: Record<string, unknown> = {};
    if (input.researchFieldIds !== undefined) data.researchFields = { deleteMany: {}, create: input.researchFieldIds.map((catalogItemId) => ({ catalogItemId })) };
    if (input.expertiseKeywords !== undefined) data.expertiseKeywords = { deleteMany: {}, create: (input.expertiseKeywords ?? []).map((keyword) => ({ keyword, keywordKey: normalizeResearcherKey(keyword) })) };
    return data;
  }

  private publicationCreateData(input: ResearcherProfilePublicationInput, actorId: string) {
    return {
      title: input.title,
      venue: input.venue ?? null,
      publicationYear: input.publicationYear ?? null,
      doi: input.doi ?? null,
      authors: input.authors ?? null,
      status: input.status ?? "ACTIVE",
      notes: input.notes ?? null,
      createdById: actorId,
      updatedById: actorId
    };
  }

  private participationCreateData(input: ResearcherProfileParticipationInput, actorId: string, supersedesId?: string) {
    return {
      projectTitle: input.projectTitle,
      participationRole: input.participationRole,
      level: input.level,
      startsOn: input.startsOn ? new Date(`${input.startsOn}T00:00:00.000Z`) : null,
      endsOn: input.endsOn ? new Date(`${input.endsOn}T00:00:00.000Z`) : null,
      status: input.status ?? "ACTIVE",
      notes: input.notes ?? null,
      sourceType: "SELF_REPORTED",
      sourceRecordId: null,
      supersedesId: supersedesId ?? null,
      createdById: actorId,
      updatedById: actorId
    };
  }

  private async syncPublications(tx: Prisma.TransactionClient, profileId: string, inputs: ResearcherProfilePublicationInput[] | undefined, actorId: string) {
    if (!inputs) return;
    for (const input of inputs) {
      if (!input.id) {
        await tx.researcherProfilePublication.create({ data: { researcherProfileId: profileId, ...this.publicationCreateData(input, actorId) } });
        continue;
      }
      const current = await tx.researcherProfilePublication.findFirst({ where: { id: input.id, researcherProfileId: profileId } });
      if (!current) throw new NotFoundException({ message: "Không tìm thấy công bố trong hồ sơ." });
      await tx.researcherProfilePublication.update({ where: { id: input.id }, data: { ...this.publicationCreateData(input, actorId), createdById: current.createdById } });
    }
  }

  private async syncParticipations(tx: Prisma.TransactionClient, profileId: string, inputs: ResearcherProfileParticipationInput[] | undefined, actorId: string) {
    if (!inputs) return;
    for (const input of inputs) {
      if (!input.id) {
        await tx.researcherProfileParticipation.create({ data: { researcherProfileId: profileId, ...this.participationCreateData(input, actorId) } });
        continue;
      }
      const current = await tx.researcherProfileParticipation.findFirst({ where: { id: input.id, researcherProfileId: profileId } });
      if (!current) throw new NotFoundException({ message: "Không tìm thấy quá trình tham gia trong hồ sơ." });
      if (current.status === "SUPERSEDED") throw new ConflictException({ message: "Quá trình tham gia đã được thay thế. Vui lòng tải lại." });
      const next = this.participationCreateData(input, actorId);
      if (["projectTitle", "participationRole", "level", "status", "notes"].every((key) => current[key as keyof typeof current] === next[key as keyof typeof next]) && current.startsOn?.toISOString() === next.startsOn?.toISOString() && current.endsOn?.toISOString() === next.endsOn?.toISOString()) continue;
      await tx.researcherProfileParticipation.update({ where: { id: input.id }, data: { status: "SUPERSEDED", updatedById: actorId } });
      await tx.researcherProfileParticipation.create({ data: { researcherProfileId: profileId, ...this.participationCreateData(input, actorId, input.id) } });
    }
  }

  private async writeProfileHistory(tx: Prisma.TransactionClient, profileId: string, actorId: string, action: string, beforeFacts?: Record<string, unknown>, afterFacts?: Record<string, unknown>, reason?: string) {
    await tx.researcherProfileHistory.create({ data: { researcherProfileId: profileId, actorId, action, reason, beforeFacts, afterFacts } as never });
  }

  private assertProfileVersion(expected: ContextVersionTokenV1, profile: ProfileWithRelations) {
    if (expected.domain !== "researcher-profile" || expected.recordId !== profile.id || expected.aggregateVersion !== profile.aggregateVersion || expected.policyVersion !== "v1" || expected.relationshipVersion !== 0 || expected.conflictVersion !== 0 || expected.delegationVersion !== 0) {
      throw new ConflictException({ message: "Dữ liệu hồ sơ đã thay đổi. Vui lòng tải lại trước khi thử lại.", code: "CONTEXT_VERSION_MISMATCH" });
    }
  }

  private auditFacts(profile: ProfileWithRelations) {
    return { fullName: profile.fullName, profileType: profile.profileType, managementOrganizationUnitId: profile.managementOrganizationUnitId,
      externalAffiliation: profile.externalAffiliation, academicRankCatalogItemId: profile.academicRankCatalogItemId, academicDegreeCatalogItemId: profile.academicDegreeCatalogItemId,
      title: profile.title, position: profile.position, militaryRank: profile.militaryRank, contactEmail: profile.contactEmail, contactPhone: profile.contactPhone, contactNote: profile.contactNote,
      status: profile.status, aggregateVersion: profile.aggregateVersion, linkedUserId: profile.linkedUserId,
      researchFieldIds: profile.researchFields.map((field) => field.catalogItem.id), expertiseKeywordKeys: profile.expertiseKeywords.map((keyword) => keyword.keywordKey),
      publications: JSON.parse(JSON.stringify(profile.publications)), participations: JSON.parse(JSON.stringify(profile.participations)) };
  }

  private toResponse(actor: SafeUserContext, profile: ProfileWithRelations) {
    return {
      id: profile.id,
      fullName: profile.fullName,
      profileType: profile.profileType,
      externalAffiliation: profile.externalAffiliation,
      academicRank: profile.academicRankCatalogItem,
      academicDegree: profile.academicDegreeCatalogItem,
      title: profile.title,
      position: profile.position,
      militaryRank: profile.militaryRank,
      contactEmail: profile.contactEmail,
      contactPhone: profile.contactPhone,
      contactNote: profile.contactNote,
      managementOrganization: profile.managementOrganizationUnit,
      researchFields: profile.researchFields.map((field) => field.catalogItem),
      expertiseKeywords: profile.expertiseKeywords.map((keyword) => keyword.keyword),
      publications: profile.publications.map((publication) => ({ ...publication, createdAt: publication.createdAt.toISOString(), updatedAt: publication.updatedAt.toISOString() })),
      participations: profile.participations.map((participation) => ({ ...participation, startsOn: participation.startsOn?.toISOString().slice(0, 10) ?? null, endsOn: participation.endsOn?.toISOString().slice(0, 10) ?? null, createdAt: participation.createdAt.toISOString(), updatedAt: participation.updatedAt.toISOString(), authority: participation.sourceType === "SELF_REPORTED" ? "SELF_REPORTED_NO_AUTHORITY" : "SOURCE_RECORD" })),
      account: profile.linkedUser ? { id: profile.linkedUser.id, username: profile.linkedUser.username, displayName: profile.linkedUser.displayName, status: profile.linkedUser.status, systemRole: profile.linkedUser.systemRole, mustChangePassword: profile.linkedUser.mustChangePassword } : null,
      ...(canManageResearcherProfiles(actor) ? { credentialDelivery: profile.credentialDeliveries[0] ?? null } : {}),
      status: profile.status,
      aggregateVersion: profile.aggregateVersion,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      viewerAuthorization: projectResearcherProfileAuthorization(actor, profile)
    };
  }
}
