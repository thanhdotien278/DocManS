import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
// @ts-ignore: runtime package is JavaScript; repository consumers use its TypeScript source contract.
import type { ContextVersionTokenV1 } from "@rtms/permissions";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { assertResearcherProfileAction, hasResearcherProfileScope, projectResearcherProfileAuthorization } from "./researcher-profile-access.js";
import type { CreateResearcherProfileDto, UpdateResearcherProfileDto } from "./researcher-profiles.dto.js";

type ProfileWithRelations = {
  id: string;
  managementOrganizationUnitId: string;
  externalAffiliation: string | null;
  fullName: string;
  fullNameKey: string;
  academicRankCatalogItemId: string | null;
  academicDegreeCatalogItemId: string | null;
  title: string | null;
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
};

const profileInclude = {
  managementOrganizationUnit: { select: { id: true, code: true, name: true, status: true } },
  academicRankCatalogItem: { select: { id: true, code: true, name: true, type: true } },
  academicDegreeCatalogItem: { select: { id: true, code: true, name: true, type: true } },
  researchFields: { include: { catalogItem: { select: { id: true, code: true, name: true, type: true } } }, orderBy: { catalogItem: { name: "asc" } } },
  expertiseKeywords: { orderBy: { keywordKey: "asc" } }
} as const;

export function normalizeResearcherKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLocaleLowerCase("vi").replace(/\s+/g, " ").trim();
}

function normalizeEmail(value?: string) {
  return value?.trim().toLocaleLowerCase("en-US");
}

function normalizePhone(value?: string) {
  return value?.replace(/[^0-9+]/g, "");
}

function activeScopeIds(actor: SafeUserContext) {
  return actor.organizationScopes.map((scope) => scope.id);
}

@Injectable()
export class ResearcherProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService
  ) {}

  async listProfiles(actor: SafeUserContext, query: { organizationUnitId?: string; status?: string; keyword?: string; page?: string; pageSize?: string }) {
    if (actor.systemRole !== "SCIENTIFIC_MANAGEMENT_STAFF") {
      throw new ForbiddenException({ message: "Bạn không có quyền xem danh sách hồ sơ nhà khoa học." });
    }
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
      ...(query.status ? { status: query.status } : {}),
      ...(keyword ? { OR: [{ fullNameKey: { contains: keyword } }, { expertiseKeywords: { some: { keywordKey: { contains: keyword } } } }] } : {})
    } as never;
    const [profiles, total] = await Promise.all([
      this.prisma.researcherProfile.findMany({ where, include: profileInclude, orderBy: [{ fullNameKey: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.researcherProfile.count({ where })
    ]);
    return {
      profiles: (profiles as unknown as ProfileWithRelations[]).map((profile) => this.toResponse(actor, profile)),
      organizationOptions: actor.organizationScopes,
      page,
      pageSize,
      total
    };
  }

  async listCatalogs(actor: SafeUserContext) {
    if (actor.systemRole !== "SCIENTIFIC_MANAGEMENT_STAFF") {
      throw new ForbiddenException({ message: "Bạn không có quyền xem danh mục hồ sơ nhà khoa học." });
    }
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
      const profile = await tx.researcherProfile.findUnique({ where: { id }, include: profileInclude }) as unknown as ProfileWithRelations | null;
      if (!profile) throw new NotFoundException({ message: "Không tìm thấy hồ sơ nhà khoa học." });
      assertResearcherProfileAction(actor, "researcher-profile.update", profile.managementOrganizationUnitId);
      this.assertProfileVersion(input.contextVersion, profile);
      await this.validateCatalogs(tx, input);
      const result = await tx.researcherProfile.updateMany({ where: { id, aggregateVersion: input.contextVersion.aggregateVersion }, data: { ...this.updateData(input), aggregateVersion: { increment: 1 }, updatedById: actor.id } });
      if (result.count !== 1) throw new ConflictException({ message: "Dữ liệu hồ sơ đã thay đổi. Vui lòng tải lại trước khi thử lại.", code: "CONTEXT_VERSION_MISMATCH", correlationId });
      const withChildren = (await tx.researcherProfile.update({ where: { id }, data: this.childData(input), include: profileInclude } as never)) as unknown as ProfileWithRelations;
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
      const profile = await tx.researcherProfile.findUnique({ where: { id }, include: profileInclude }) as unknown as ProfileWithRelations | null;
      if (!profile) throw new NotFoundException({ message: "Không tìm thấy hồ sơ nhà khoa học." });
      assertResearcherProfileAction(actor, action, profile.managementOrganizationUnitId);
      this.assertProfileVersion(contextVersion, profile);
      const result = await tx.researcherProfile.updateMany({ where: { id, aggregateVersion: contextVersion.aggregateVersion }, data: { status, aggregateVersion: { increment: 1 }, updatedById: actor.id } });
      if (result.count !== 1) throw new ConflictException({ message: "Dữ liệu hồ sơ đã thay đổi. Vui lòng tải lại trước khi thử lại.", code: "CONTEXT_VERSION_MISMATCH", correlationId });
      const next = (await tx.researcherProfile.findUnique({ where: { id }, include: profileInclude })) as unknown as ProfileWithRelations;
      await this.auditLog.record({ action: status === "ACTIVE" ? "activate-researcher-profile" : "deactivate-researcher-profile", result: "success", actorId: actor.id, targetEntity: "researcher-profile", targetEntityId: id, username: actor.username, correlationId, beforeFacts: this.auditFacts(profile), afterFacts: this.auditFacts(next) }, tx);
      return next;
    });
    return { profile: this.toResponse(actor, updated), correlationId };
  }

  private async findProfile(id: string) {
    const profile = (await this.prisma.researcherProfile.findUnique({ where: { id }, include: profileInclude })) as unknown as ProfileWithRelations | null;
    if (!profile) throw new NotFoundException({ message: "Không tìm thấy hồ sơ nhà khoa học." });
    return profile;
  }

  private async validateCatalogs(tx: Prisma.TransactionClient, input: Partial<CreateResearcherProfileDto>) {
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
      externalAffiliation: input.externalAffiliation,
      fullName: input.fullName,
      fullNameKey: normalizeResearcherKey(input.fullName),
      academicRankCatalogItemId: input.academicRankCatalogItemId,
      academicDegreeCatalogItemId: input.academicDegreeCatalogItemId,
      title: input.title,
      contactEmail: input.contactEmail,
      contactEmailKey: normalizeEmail(input.contactEmail),
      contactPhone: input.contactPhone,
      contactPhoneKey: normalizePhone(input.contactPhone),
      contactNote: input.contactNote,
      status: "ACTIVE",
      createdById: actorId,
      updatedById: actorId,
      researchFields: { create: input.researchFieldIds.map((catalogItemId) => ({ catalogItemId })) },
      expertiseKeywords: { create: (input.expertiseKeywords ?? []).map((keyword) => ({ keyword, keywordKey: normalizeResearcherKey(keyword) })) }
    };
  }

  private updateData(input: UpdateResearcherProfileDto) {
    const data: Record<string, unknown> = {};
    for (const field of ["fullName", "externalAffiliation", "academicRankCatalogItemId", "academicDegreeCatalogItemId", "title", "contactEmail", "contactPhone", "contactNote"] as const) {
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

  private assertProfileVersion(expected: ContextVersionTokenV1, profile: ProfileWithRelations) {
    if (expected.domain !== "researcher-profile" || expected.recordId !== profile.id || expected.aggregateVersion !== profile.aggregateVersion || expected.policyVersion !== "v1") {
      throw new ConflictException({ message: "Dữ liệu hồ sơ đã thay đổi. Vui lòng tải lại trước khi thử lại.", code: "CONTEXT_VERSION_MISMATCH" });
    }
  }

  private auditFacts(profile: ProfileWithRelations) {
    return { fullName: profile.fullName, managementOrganizationUnitId: profile.managementOrganizationUnitId, status: profile.status, aggregateVersion: profile.aggregateVersion, researchFieldIds: profile.researchFields.map((field) => field.catalogItem.id), expertiseKeywordKeys: profile.expertiseKeywords.map((keyword) => keyword.keywordKey) };
  }

  private toResponse(actor: SafeUserContext, profile: ProfileWithRelations) {
    return {
      id: profile.id,
      fullName: profile.fullName,
      externalAffiliation: profile.externalAffiliation,
      academicRank: profile.academicRankCatalogItem,
      academicDegree: profile.academicDegreeCatalogItem,
      title: profile.title,
      contactEmail: profile.contactEmail,
      contactPhone: profile.contactPhone,
      contactNote: profile.contactNote,
      managementOrganization: profile.managementOrganizationUnit,
      researchFields: profile.researchFields.map((field) => field.catalogItem),
      expertiseKeywords: profile.expertiseKeywords.map((keyword) => keyword.keyword),
      status: profile.status,
      aggregateVersion: profile.aggregateVersion,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      viewerAuthorization: projectResearcherProfileAuthorization(actor, profile)
    };
  }
}
