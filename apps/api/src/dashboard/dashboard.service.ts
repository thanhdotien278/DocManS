import { ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import type { SafeUserContext } from "../auth/auth.types.js";
import { ApprovedProjectsService } from "../approved-projects/approved-projects.service.js";
import { readApprovedBudget } from "../approved-projects/project-funding.js";
import {
  computeProjectProgress,
  PROJECT_HEALTH_LABELS,
  PROJECT_HEALTH_VALUES,
  summarizeProjectFunding,
  type ProjectFundingSummary,
  type ProjectHealth,
  type ProjectProgressSummary
} from "../approved-projects/project-progress.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import {
  canReadProposal,
  isResearchManagementDeputyHead,
  isResearchOversightAuthority,
  isSystemAdmin,
  readableProposalCandidatesWhere
} from "../proposals-shared/proposal-access.js";
import { isRelationshipActiveAt } from "../proposals-shared/proposal-participation.js";
import { ProposalManagementOfficerService } from "../proposals-shared/proposal-management-officer.service.js";
import { ProposalReviewAccessService } from "../proposals-shared/proposal-review-access.service.js";
import { PROPOSAL_STATUS_LABELS } from "../proposals-shared/proposal-workflow.js";
import { ProposalParticipationService } from "../research-proposals/proposal-participation.service.js";
import type { DashboardCommonFilters, DashboardProductStatus, ParsedDashboardQuery } from "./dashboard-query.js";

const VN_OFFSET_MS = 7 * 3_600_000;

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  preparing: "Chuẩn bị triển khai",
  executing: "Đang thực hiện",
  paused: "Tạm dừng",
  pending_acceptance: "Chờ nghiệm thu",
  accepted: "Đã nghiệm thu",
  failed: "Không đạt",
  closed: "Đóng/lưu trữ"
};

export const PRODUCT_STATUS_LABELS: Record<DashboardProductStatus, string> = {
  accepted: "Đã nghiệm thu",
  failed: "Không đạt",
  pending_acceptance: "Chờ nghiệm thu",
  supplement_requested: "Cần bổ sung",
  draft: "Đang hoàn thiện"
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  publication: "Bài báo khoa học",
  article: "Bài báo khoa học",
  book: "Sách / Giáo trình",
  monograph: "Sách chuyên khảo",
  patent: "Sáng chế / Giải pháp hữu ích",
  software: "Phần mềm / Công cụ",
  guideline: "Quy trình kỹ thuật",
  training: "Đào tạo sau đại học",
  report: "Báo cáo tổng kết",
  unclassified: "Chưa phân loại"
};

const DEFAULT_SCOPE_LABELS: Record<string, string> = {
  military: "Quân sự",
  civil: "Dân sự",
  unclassified: "Chưa phân loại"
};

export type DashboardProjectItem = {
  id: string;
  code: string | null;
  proposalId: string;
  title: string;
  status: string;
  statusLabel: string;
  health: ProjectHealth;
  healthLabel: string;
  progress: ProjectProgressSummary;
  overdue: boolean;
  approaching: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
  year: number;
  unitId: string;
  unitCode: string;
  unitName: string;
  piName: string;
  officerId: string;
  officerName: string;
  levelCode: string;
  levelLabel: string;
  fieldCode: string;
  fieldLabel: string;
  scopeCode: string;
  scopeLabel: string;
  milestones: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    status: string;
    isImportant: boolean;
    overdue: boolean;
  }>;
  canReadAcceptanceDossier: boolean;
  canViewRowFunding: boolean;
  rowFunding: ProjectFundingSummary | null;
  aggregateFunding: ProjectFundingSummary;
};

export type DashboardProposalItem = {
  id: string;
  code: string | null;
  title: string;
  status: string;
  statusLabel: string;
  year: number;
  unitId: string;
  unitCode: string;
  unitName: string;
  piName: string;
  officerId: string;
  officerName: string;
  levelCode: string;
  levelLabel: string;
  fieldCode: string;
  fieldLabel: string;
  scopeCode: string;
  scopeLabel: string;
  intakeTitle: string | null;
  submittedAt: string | null;
  createdAt: string;
  rawBudget: number;
  aggregateBudget: number;
  canViewRowFunding: boolean;
};

export type DashboardProductItem = {
  key: string;
  projectId: string;
  projectCode: string | null;
  projectTitle: string;
  unitId: string;
  unitCode: string;
  unitName: string;
  piName: string;
  officerId: string;
  levelCode: string;
  fieldCode: string;
  scopeCode: string;
  projectStatus: string;
  projectHealth: ProjectHealth;
  year: number;
  name: string;
  type: string;
  typeLabel: string;
  description: string;
  dossierStatus: string;
  productStatus: DashboardProductStatus;
  productStatusLabel: string;
};

function vnYearFromDate(value: Date | string | null | undefined, fallback: Date): number {
  const source = value ? new Date(value) : fallback;
  const ms = Number.isNaN(source.getTime()) ? fallback.getTime() : source.getTime();
  return new Date(ms + VN_OFFSET_MS).getUTCFullYear();
}

export function productTypeLabel(code: string): string {
  const normalized = code.trim() || "unclassified";
  return PRODUCT_TYPE_LABELS[normalized.toLowerCase()] ?? normalized;
}

export function resolveProductStatus(projectStatus: string, dossierStatus: string): DashboardProductStatus {
  if (projectStatus === "accepted" || projectStatus === "closed") return "accepted";
  if (projectStatus === "failed") return "failed";
  if (dossierStatus === "submitted") return "pending_acceptance";
  if (dossierStatus === "supplement_requested") return "supplement_requested";
  return "draft";
}

export function assertDashboardAccess(actor?: SafeUserContext): SafeUserContext {
  if (!actor || isSystemAdmin(actor) || actor.systemRole === "STUDENT_USER") {
    throw new ForbiddenException({
      code: "ACTION_NOT_GRANTED",
      message: "Vai trò hiện tại không có quyền truy cập Dashboard phân tích nghiệp vụ."
    });
  }
  return actor;
}

export function matchesProjectFilters(item: DashboardProjectItem, filters: DashboardCommonFilters): boolean {
  if (filters.year !== undefined && item.year !== filters.year) return false;
  if (filters.unitId !== undefined && item.unitId !== filters.unitId) return false;
  if (filters.level !== undefined && item.levelCode !== filters.level) return false;
  if (filters.field !== undefined && item.fieldCode !== filters.field) return false;
  if (filters.scope !== undefined && item.scopeCode !== filters.scope) return false;
  if (filters.officerId !== undefined && item.officerId !== filters.officerId) return false;
  if (filters.status !== undefined && item.status !== filters.status) return false;
  if (filters.health !== undefined && item.health !== filters.health) return false;
  return true;
}

export function matchesProposalFilters(item: DashboardProposalItem, filters: DashboardCommonFilters): boolean {
  if (filters.year !== undefined && item.year !== filters.year) return false;
  if (filters.unitId !== undefined && item.unitId !== filters.unitId) return false;
  if (filters.level !== undefined && item.levelCode !== filters.level) return false;
  if (filters.field !== undefined && item.fieldCode !== filters.field) return false;
  if (filters.scope !== undefined && item.scopeCode !== filters.scope) return false;
  if (filters.officerId !== undefined && item.officerId !== filters.officerId) return false;
  if (filters.status !== undefined && item.status !== filters.status) return false;
  return true;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvedProjects: ApprovedProjectsService,
    private readonly participation: ProposalParticipationService,
    private readonly reviewAccess: ProposalReviewAccessService,
    private readonly managementOfficers: ProposalManagementOfficerService
  ) {}

  async loadCatalogMaps() {
    const [units, catalogItems] = await Promise.all([
      this.prisma.organizationUnit.findMany({
        where: { status: "active" },
        select: { id: true, code: true, name: true },
        orderBy: { name: "asc" }
      }),
      this.prisma.catalogItem.findMany({
        where: {
          deletedAt: null,
          status: "active",
          type: { in: ["proposal-type", "research-field", "proposal-nature"] }
        },
        select: { type: true, code: true, name: true },
        orderBy: { name: "asc" }
      })
    ]);

    const unitMap = new Map(units.map((u) => [u.id, u]));
    const levels = new Map<string, string>();
    const fields = new Map<string, string>();
    const scopes = new Map<string, string>(Object.entries(DEFAULT_SCOPE_LABELS));

    for (const item of catalogItems) {
      if (item.type === "proposal-type") levels.set(item.code, item.name);
      else if (item.type === "research-field") fields.set(item.code, item.name);
      else if (item.type === "proposal-nature") scopes.set(item.code, item.name);
    }

    return { units, unitMap, levels, fields, scopes };
  }

  async loadAuthorizedProposals(actor: SafeUserContext, now = new Date()): Promise<DashboardProposalItem[]> {
    assertDashboardAccess(actor);
    const where = readableProposalCandidatesWhere(actor);
    const [catalogs, candidates] = await Promise.all([
      this.loadCatalogMaps(),
      this.prisma.researchProposal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          owner: { select: { displayName: true, researcherProfile: { select: { fullName: true } } } },
          hostOrganizationUnit: { select: { id: true, code: true, name: true } },
          intakePeriod: { select: { title: true } }
        }
      })
    ]);

    if (!candidates.length) return [];

    const proposalIds = candidates.map((item) => item.id);
    const [participationMap, reviewAccessMap, officerMap] = await Promise.all([
      this.participation.resolveForProposals(actor.id, candidates as never, now),
      this.reviewAccess.resolveForProposals(actor.id, proposalIds, now),
      this.managementOfficers.resolveForProposals(proposalIds, now)
    ]);

    const oversight = isResearchOversightAuthority(actor);
    const visible: DashboardProposalItem[] = [];

    for (const proposal of candidates) {
      const part = participationMap.get(proposal.id);
      const rev = reviewAccessMap.get(proposal.id);
      const off = officerMap.get(proposal.id);
      if (!canReadProposal(actor, proposal, part, rev, off)) continue;

      const unit = proposal.hostOrganizationUnit ?? catalogs.unitMap.get(proposal.hostOrganizationUnitId);
      const levelCode = proposal.proposalTypeCode?.trim() || "unclassified";
      const fieldCode = proposal.researchFieldCode?.trim() || "unclassified";
      const scopeCode = proposal.proposalNatureCode?.trim() || "unclassified";
      const currentOfficer = off?.resolved ? off.officer : null;
      const officerId = currentOfficer?.officerUserId ?? "unassigned";
      const officerName = currentOfficer?.officer?.displayName ?? "Chưa phân công";
      const redactsAsReviewer =
        Boolean(rev?.isAssignedReviewer || rev?.hasReviewConflict || rev?.conflictUnresolved) &&
        !part?.isParticipant &&
        proposal.ownerId !== actor.id;
      const piName = redactsAsReviewer
        ? "—"
        : (proposal.owner?.researcherProfile?.fullName ?? proposal.owner?.displayName ?? "Chưa rõ");
      const rawBudget = readApprovedBudget(proposal.budgetMetadata);
      const canViewRowFunding =
        !oversight &&
        !redactsAsReviewer &&
        !(isResearchManagementDeputyHead(actor) && !part?.isParticipant && proposal.ownerId !== actor.id);

      visible.push({
        id: proposal.id,
        code: proposal.code ?? null,
        title: proposal.title,
        status: proposal.status,
        statusLabel: PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status,
        year: vnYearFromDate(proposal.startDate ?? proposal.submittedAt ?? proposal.createdAt, now),
        unitId: proposal.hostOrganizationUnitId,
        unitCode: unit?.code ?? "",
        unitName: unit?.name ?? "Đơn vị chưa xác định",
        piName,
        officerId,
        officerName,
        levelCode,
        levelLabel: levelCode === "unclassified" ? "Chưa phân loại" : (catalogs.levels.get(levelCode) ?? levelCode),
        fieldCode,
        fieldLabel: fieldCode === "unclassified" ? "Chưa phân loại" : (catalogs.fields.get(fieldCode) ?? fieldCode),
        scopeCode,
        scopeLabel: catalogs.scopes.get(scopeCode) ?? DEFAULT_SCOPE_LABELS[scopeCode] ?? scopeCode,
        intakeTitle: proposal.intakePeriod?.title ?? null,
        submittedAt: proposal.submittedAt?.toISOString() ?? null,
        createdAt: proposal.createdAt.toISOString(),
        rawBudget,
        aggregateBudget: oversight || canViewRowFunding ? rawBudget : 0,
        canViewRowFunding
      });
    }

    return visible;
  }

  async loadAuthorizedProjects(actor: SafeUserContext, now = new Date()): Promise<DashboardProjectItem[]> {
    assertDashboardAccess(actor);
    const [catalogs, rawProjects] = await Promise.all([
      this.loadCatalogMaps(),
      this.approvedProjects.listProjects(actor, { skipUnresolved: true })
    ]);

    if (!rawProjects.length) return [];

    const oversight = isResearchOversightAuthority(actor);
    const oversightFundingMap = new Map<string, ProjectFundingSummary>();

    if (oversight) {
      const rows = await this.prisma.approvedProject.findMany({
        where: { id: { in: rawProjects.map((p: any) => p.id) } },
        select: {
          id: true,
          scopeSnapshot: true,
          proposal: { select: { budgetMetadata: true } },
          fundingRecords: { select: { entryId: true, version: true, kind: true, amount: true } }
        }
      });
      for (const row of rows) {
        oversightFundingMap.set(row.id, summarizeProjectFunding(row));
      }
    }

    return rawProjects.map((project: any) => {
      const unit = project.hostOrganizationUnit ?? catalogs.unitMap.get(project.hostOrganizationUnitId);
      const levelCode = String(project.proposalTypeCode ?? "").trim() || "unclassified";
      const fieldCode = String(project.researchFieldCode ?? "").trim() || "unclassified";
      const scopeCode = String(project.proposalNatureCode ?? "").trim() || "unclassified";
      const piMember = (project.members ?? []).find(
        (member: any) => member.participationRole === "TOPIC_PI" && isRelationshipActiveAt(member, now)
      );
      const officerId = project.officer?.officerUserId ?? "unassigned";
      const officerName = project.officer?.displayName ?? "Chưa phân công";
      const progress: ProjectProgressSummary = project.progress;
      const rowFunding: ProjectFundingSummary | null = project.fundingSummary ?? null;
      const aggregateFunding: ProjectFundingSummary = oversight
        ? (oversightFundingMap.get(project.id) ?? { approvedBudget: 0, totalDisbursed: 0, totalSettled: 0 })
        : (rowFunding ?? { approvedBudget: 0, totalDisbursed: 0, totalSettled: 0 });
      const allowedActions: string[] = project.viewerAuthorization?.allowedActions ?? [];

      return {
        id: project.id,
        code: project.code ?? null,
        proposalId: project.proposalId,
        title: project.title,
        status: project.status,
        statusLabel: PROJECT_STATUS_LABELS[project.status] ?? project.status,
        health: progress.health,
        healthLabel: PROJECT_HEALTH_LABELS[progress.health],
        progress,
        overdue: Boolean(project.overdue),
        approaching: Boolean(project.approaching),
        startDate: project.startDate ?? null,
        endDate: project.endDate ?? null,
        createdAt: project.createdAt ?? null,
        year: vnYearFromDate(project.startDate ?? project.createdAt, now),
        unitId: project.hostOrganizationUnitId,
        unitCode: unit?.code ?? "",
        unitName: unit?.name ?? "Đơn vị chưa xác định",
        piName: piMember?.name ?? "Chưa rõ",
        officerId,
        officerName,
        levelCode,
        levelLabel: levelCode === "unclassified" ? "Chưa phân loại" : (catalogs.levels.get(levelCode) ?? levelCode),
        fieldCode,
        fieldLabel: fieldCode === "unclassified" ? "Chưa phân loại" : (catalogs.fields.get(fieldCode) ?? fieldCode),
        scopeCode,
        scopeLabel: catalogs.scopes.get(scopeCode) ?? DEFAULT_SCOPE_LABELS[scopeCode] ?? scopeCode,
        milestones: (project.milestones ?? []).map((ms: any) => ({
          id: ms.id,
          title: ms.title,
          dueDate: ms.dueDate instanceof Date ? ms.dueDate.toISOString() : (ms.dueDate ?? null),
          status: ms.status,
          isImportant: Boolean(ms.isImportant),
          overdue: Boolean(ms.overdue)
        })),
        canReadAcceptanceDossier: allowedActions.includes("acceptance-dossier.read"),
        canViewRowFunding: rowFunding !== null,
        rowFunding,
        aggregateFunding
      };
    });
  }

  async loadAuthorizedProducts(
    actor: SafeUserContext,
    filters: DashboardCommonFilters & { type?: string; productStatus?: DashboardProductStatus } = {},
    preloadedProjects?: DashboardProjectItem[],
    now = new Date()
  ): Promise<DashboardProductItem[]> {
    assertDashboardAccess(actor);
    const [catalogs, baseProjects, councilSeats] = await Promise.all([
      this.loadCatalogMaps(),
      preloadedProjects ? Promise.resolve(preloadedProjects) : this.loadAuthorizedProjects(actor, now),
      this.prisma.acceptanceCouncilMember.findMany({
        where: {
          userId: actor.id,
          invitationStatus: "accepted",
          councilEstablishedAt: { not: null }
        },
        select: { projectId: true }
      })
    ]);

    const projectMap = new Map<string, DashboardProjectItem>();
    for (const item of baseProjects) {
      if (item.canReadAcceptanceDossier) {
        projectMap.set(item.id, item);
      }
    }

    for (const seat of councilSeats) {
      if (projectMap.has(seat.projectId)) continue;
      try {
        const loaded = await this.approvedProjects.loadAuthorized(this.prisma, actor, seat.projectId, { dossierReader: true });
        if (!loaded.capability.allowedActions.includes("acceptance-dossier.read")) continue;
        const raw = loaded.project;
        const unit = raw.hostOrganizationUnit ?? catalogs.unitMap.get(raw.hostOrganizationUnitId);
        const scopeRecord = raw.scopeSnapshot as Record<string, unknown> | null;
        const levelCode = String(scopeRecord?.proposalTypeCode ?? raw.proposal?.proposalTypeCode ?? "").trim() || "unclassified";
        const fieldCode = String(scopeRecord?.researchFieldCode ?? raw.proposal?.researchFieldCode ?? "").trim() || "unclassified";
        const scopeCode = String(raw.proposal?.proposalNatureCode ?? scopeRecord?.proposalNatureCode ?? "").trim() || "unclassified";
        const piMember = (raw.members ?? []).find(
          (member: any) => member.participationRole === "TOPIC_PI" && isRelationshipActiveAt(member, now)
        );
        const progress = computeProjectProgress(raw, now);
        const officerRow = loaded.officer
          ? (raw.managementOfficers ?? []).find((row: any) => row.id === (loaded.officer as any)?.id || row.officerUserId === loaded.officer?.officerUserId)
          : null;
        projectMap.set(raw.id, {
          id: raw.id,
          code: raw.code ?? null,
          proposalId: raw.proposalId,
          title: raw.title,
          status: raw.status,
          statusLabel: PROJECT_STATUS_LABELS[raw.status] ?? raw.status,
          health: progress.health,
          healthLabel: PROJECT_HEALTH_LABELS[progress.health],
          progress,
          overdue: progress.maxDaysOverdue > 0,
          approaching: false,
          startDate: raw.startDate?.toISOString?.() ?? null,
          endDate: raw.endDate?.toISOString?.() ?? null,
          createdAt: raw.createdAt?.toISOString?.() ?? null,
          year: vnYearFromDate(raw.startDate ?? raw.createdAt, now),
          unitId: raw.hostOrganizationUnitId,
          unitCode: unit?.code ?? "",
          unitName: unit?.name ?? "Đơn vị chưa xác định",
          piName: piMember?.name ?? "Chưa rõ",
          officerId: loaded.officer?.officerUserId ?? "unassigned",
          officerName: officerRow?.officer?.displayName ?? "Chưa phân công",
          levelCode,
          levelLabel: levelCode === "unclassified" ? "Chưa phân loại" : (catalogs.levels.get(levelCode) ?? levelCode),
          fieldCode,
          fieldLabel: fieldCode === "unclassified" ? "Chưa phân loại" : (catalogs.fields.get(fieldCode) ?? fieldCode),
          scopeCode,
          scopeLabel: catalogs.scopes.get(scopeCode) ?? DEFAULT_SCOPE_LABELS[scopeCode] ?? scopeCode,
          milestones: [],
          canReadAcceptanceDossier: true,
          canViewRowFunding: false,
          rowFunding: null,
          aggregateFunding: { approvedBudget: 0, totalDisbursed: 0, totalSettled: 0 }
        });
      } catch (error) {
        if (error instanceof ForbiddenException || error instanceof ConflictException) continue;
        throw error;
      }
    }

    const authorizedProjectIds = [...projectMap.keys()];
    if (!authorizedProjectIds.length) return [];

    const dossiers = await this.prisma.acceptanceDossier.findMany({
      where: { projectId: { in: authorizedProjectIds } },
      select: { id: true, projectId: true, status: true, sections: true }
    });

    const items: DashboardProductItem[] = [];
    for (const dossier of dossiers) {
      const project = projectMap.get(dossier.projectId);
      if (!project || !matchesProjectFilters(project, filters)) continue;

      const sections = (dossier.sections ?? {}) as Record<string, unknown>;
      const rawProducts = Array.isArray(sections.products) ? sections.products : [];
      const productStatus = resolveProductStatus(project.status, dossier.status);

      rawProducts.forEach((rawProduct, index) => {
        if (!rawProduct || typeof rawProduct !== "object" || Array.isArray(rawProduct)) return;
        const p = rawProduct as Record<string, unknown>;
        const name = typeof p.name === "string" ? p.name.trim() : "";
        if (!name) return;
        const rawType = typeof p.type === "string" ? p.type.trim() : "";
        const type = rawType || "unclassified";
        const description = typeof p.description === "string" ? p.description.trim() : "";

        if (filters.type !== undefined && type.toLowerCase() !== filters.type.toLowerCase()) return;
        if (filters.productStatus !== undefined && productStatus !== filters.productStatus) return;

        items.push({
          key: `${dossier.id}:${index}`,
          projectId: project.id,
          projectCode: project.code,
          projectTitle: project.title,
          unitId: project.unitId,
          unitCode: project.unitCode,
          unitName: project.unitName,
          piName: project.piName,
          officerId: project.officerId,
          levelCode: project.levelCode,
          fieldCode: project.fieldCode,
          scopeCode: project.scopeCode,
          projectStatus: project.status,
          projectHealth: project.health,
          year: project.year,
          name,
          type,
          typeLabel: productTypeLabel(type),
          description,
          dossierStatus: dossier.status,
          productStatus,
          productStatusLabel: PRODUCT_STATUS_LABELS[productStatus]
        });
      });
    }

    return items;
  }

  async getStats(actor: SafeUserContext, query: ParsedDashboardQuery, now = new Date()) {
    assertDashboardAccess(actor);
    const [catalogs, allProjects, allProposals] = await Promise.all([
      this.loadCatalogMaps(),
      this.loadAuthorizedProjects(actor, now),
      this.loadAuthorizedProposals(actor, now)
    ]);

    const projects = allProjects.filter((item) => matchesProjectFilters(item, query));
    const proposals = allProposals.filter((item) => matchesProposalFilters(item, query));
    const allProducts = await this.loadAuthorizedProducts(actor, {}, allProjects, now);
    const products = allProducts.filter((item) => {
      if (query.year !== undefined && item.year !== query.year) return false;
      if (query.unitId !== undefined && item.unitId !== query.unitId) return false;
      if (query.level !== undefined && item.levelCode !== query.level) return false;
      if (query.field !== undefined && item.fieldCode !== query.field) return false;
      if (query.scope !== undefined && item.scopeCode !== query.scope) return false;
      if (query.officerId !== undefined && item.officerId !== query.officerId) return false;
      if (query.status !== undefined && item.projectStatus !== query.status) return false;
      if (query.health !== undefined && item.projectHealth !== query.health) return false;
      return true;
    });

    const byHealth: Record<ProjectHealth, number> = {
      on_track: 0,
      at_risk: 0,
      delayed: 0,
      completed: 0
    };

    let approvedBudget = 0;
    let totalDisbursed = 0;
    let totalSettled = 0;
    let sumPlanned = 0;
    let sumActual = 0;

    for (const p of projects) {
      byHealth[p.health] += 1;
      approvedBudget += p.aggregateFunding.approvedBudget;
      totalDisbursed += p.aggregateFunding.totalDisbursed;
      totalSettled += p.aggregateFunding.totalSettled;
      sumPlanned += p.progress.plannedPercent;
      sumActual += p.progress.actualPercent;
    }

    const proposalRequestedBudget = proposals.reduce((sum, item) => sum + item.aggregateBudget, 0);
    const count = projects.length;

    const unitOptionMap = new Map<string, { id: string; code: string; name: string }>();
    const officerOptionMap = new Map<string, { id: string; label: string }>();
    const yearSet = new Set<number>();

    for (const item of allProjects) {
      unitOptionMap.set(item.unitId, { id: item.unitId, code: item.unitCode, name: item.unitName });
      officerOptionMap.set(item.officerId, { id: item.officerId, label: item.officerName });
      yearSet.add(item.year);
    }
    for (const item of allProposals) {
      unitOptionMap.set(item.unitId, { id: item.unitId, code: item.unitCode, name: item.unitName });
      officerOptionMap.set(item.officerId, { id: item.officerId, label: item.officerName });
      yearSet.add(item.year);
    }
    for (const item of allProducts) {
      unitOptionMap.set(item.unitId, { id: item.unitId, code: item.unitCode, name: item.unitName });
      yearSet.add(item.year);
    }

    return {
      generatedAt: now.toISOString(),
      fundingRestricted: isResearchOversightAuthority(actor),
      projects: {
        total: count,
        preparing: projects.filter((p) => p.status === "preparing").length,
        executing: projects.filter((p) => p.status === "executing").length,
        paused: projects.filter((p) => p.status === "paused").length,
        pendingAcceptance: projects.filter((p) => p.status === "pending_acceptance").length,
        accepted: projects.filter((p) => p.status === "accepted").length,
        failed: projects.filter((p) => p.status === "failed").length,
        closed: projects.filter((p) => p.status === "closed").length,
        overdue: projects.filter((p) => p.overdue || p.progress.maxDaysOverdue > 0).length,
        approaching: projects.filter((p) => p.approaching).length,
        byHealth,
        avgPlannedPercent: count ? Math.round((sumPlanned / count) * 100) / 100 : 0,
        avgActualPercent: count ? Math.round((sumActual / count) * 100) / 100 : 0,
        avgSpi: sumPlanned > 0 ? Math.round(Math.min(2, sumActual / sumPlanned) * 1000) / 1000 : 1
      },
      proposals: {
        total: proposals.length,
        active: proposals.filter((p) => p.status !== "draft").length,
        draft: proposals.filter((p) => p.status === "draft").length,
        submitted: proposals.filter((p) => p.status === "submitted").length,
        supplementRequested: proposals.filter((p) => p.status === "supplement_requested").length,
        resubmitted: proposals.filter((p) => p.status === "resubmitted").length,
        underReview: proposals.filter((p) => p.status === "under_review").length,
        readyForApproval: proposals.filter((p) => p.status === "ready_for_approval").length,
        approved: proposals.filter((p) => p.status === "approved").length,
        rejected: proposals.filter((p) => p.status === "rejected").length
      },
      funding: {
        approvedBudget,
        totalDisbursed,
        totalSettled,
        disbursementRate: approvedBudget > 0 ? Math.round((totalDisbursed / approvedBudget) * 10_000) / 100 : 0,
        proposalRequestedBudget
      },
      products: {
        total: products.length,
        accepted: products.filter((p) => p.productStatus === "accepted").length,
        pendingAcceptance: products.filter((p) => p.productStatus === "pending_acceptance").length
      },
      filterOptions: {
        years: [...yearSet].sort((a, b) => b - a),
        units: [...unitOptionMap.values()].sort((a, b) => a.name.localeCompare(b.name, "vi")),
        levels: [
          ...[...catalogs.levels.entries()].map(([code, label]) => ({ code, label })),
          { code: "unclassified", label: "Chưa phân loại" }
        ],
        fields: [
          ...[...catalogs.fields.entries()].map(([code, label]) => ({ code, label })),
          { code: "unclassified", label: "Chưa phân loại" }
        ],
        scopes: [...catalogs.scopes.entries()].map(([code, label]) => ({ code, label })),
        officers: [...officerOptionMap.values()].sort((a, b) =>
          a.id === "unassigned" ? 1 : b.id === "unassigned" ? -1 : a.label.localeCompare(b.label, "vi")
        ),
        healths: PROJECT_HEALTH_VALUES.map((code) => ({ code, label: PROJECT_HEALTH_LABELS[code] }))
      }
    };
  }

  async getProducts(actor: SafeUserContext, query: ParsedDashboardQuery, now = new Date()) {
    assertDashboardAccess(actor);
    const items = await this.loadAuthorizedProducts(actor, query, undefined, now);

    const byTypeMap = new Map<string, { key: string; label: string; count: number; acceptedCount: number }>();
    const byStatusMap = new Map<DashboardProductStatus, { key: DashboardProductStatus; label: string; count: number }>();

    for (const item of items) {
      const typeKey = item.type.toLowerCase();
      const typeBucket = byTypeMap.get(typeKey) ?? {
        key: typeKey,
        label: item.typeLabel,
        count: 0,
        acceptedCount: 0
      };
      typeBucket.count += 1;
      if (item.productStatus === "accepted") typeBucket.acceptedCount += 1;
      byTypeMap.set(typeKey, typeBucket);

      const statusBucket = byStatusMap.get(item.productStatus) ?? {
        key: item.productStatus,
        label: item.productStatusLabel,
        count: 0
      };
      statusBucket.count += 1;
      byStatusMap.set(item.productStatus, statusBucket);
    }

    return {
      totals: {
        count: items.length,
        projectCount: new Set(items.map((item) => item.projectId)).size,
        acceptedCount: items.filter((item) => item.productStatus === "accepted").length,
        pendingCount: items.filter((item) => item.productStatus === "pending_acceptance").length
      },
      byType: [...byTypeMap.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "vi")),
      byStatus: [...byStatusMap.values()].sort((a, b) => b.count - a.count)
    };
  }
}
