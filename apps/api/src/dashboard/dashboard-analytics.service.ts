import { BadRequestException, Injectable } from "@nestjs/common";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PROJECT_HEALTH_LABELS, PROJECT_HEALTH_VALUES, round2, round3, type ProjectHealth } from "../approved-projects/project-progress.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { isResearchOversightAuthority } from "../proposals-shared/proposal-access.js";
import {
  DASHBOARD_QUERY_INVALID,
  type DrillDownMetric,
  type ParsedDashboardQuery
} from "./dashboard-query.js";
import {
  assertDashboardAccess,
  DashboardService,
  matchesProjectFilters,
  matchesProposalFilters,
  type DashboardProductItem,
  type DashboardProjectItem,
  type DashboardProposalItem
} from "./dashboard.service.js";
import { DAY_MS, maxRangeEndUtc, vietnamDateParts } from "./vietnam-time.js";


export type DistributionBucket = {
  key: string;
  code?: string;
  label: string;
  count: number;
  totalBudget: number;
  totalDisbursed: number;
  overdueCount: number;
};

export type UnitHealthRow = {
  unitId: string;
  unitCode: string;
  unitName: string;
  total: number;
  on_track: number;
  at_risk: number;
  delayed: number;
  completed: number;
};

export type TrendPoint = {
  date: string;
  live: boolean;
  total: number;
  on_track: number;
  at_risk: number;
  delayed: number;
  completed: number;
  plannedPercent: number;
  actualPercent: number;
  spi: number;
  overdueMilestones: number;
  lateReports: number;
  approvedBudget: number;
  disbursedAmount: number;
};

export type DrillDownProjectRow = {
  kind: "project";
  id: string;
  code: string | null;
  proposalId: string;
  title: string;
  unitId: string;
  unitCode: string;
  unitName: string;
  piName: string;
  officerId: string;
  officerName: string;
  levelLabel: string;
  fieldLabel: string;
  scopeLabel: string;
  year: number;
  status: string;
  statusLabel: string;
  health: ProjectHealth;
  healthLabel: string;
  plannedPercent: number;
  actualPercent: number;
  spi: number;
  overdueMilestones: number;
  maxDaysOverdue: number;
  lateReports: number;
  startDate: string | null;
  endDate: string | null;
  milestones: DashboardProjectItem["milestones"];
  totalBudget: number | null;
  totalDisbursed: number | null;
  totalSettled: number | null;
};

export type DrillDownProposalRow = {
  kind: "proposal";
  id: string;
  code: string | null;
  title: string;
  unitId: string;
  unitCode: string;
  unitName: string;
  piName: string;
  officerId: string;
  officerName: string;
  levelLabel: string;
  fieldLabel: string;
  scopeLabel: string;
  intakeTitle: string | null;
  year: number;
  status: string;
  statusLabel: string;
  submittedAt: string | null;
  totalBudget: number | null;
  totalDisbursed: null;
};

export type DrillDownProductRow = {
  kind: "product";
  key: string;
  projectId: string;
  projectCode: string | null;
  projectTitle: string;
  unitId: string;
  unitName: string;
  piName: string;
  year: number;
  name: string;
  type: string;
  typeLabel: string;
  description: string;
  productStatus: string;
  productStatusLabel: string;
};

export type DrillDownRow = DrillDownProjectRow | DrillDownProposalRow | DrillDownProductRow;

function shiftIsoDays(isoDate: string, deltaDays: number): string {
  const ms = new Date(`${isoDate}T00:00:00.000Z`).getTime() + deltaDays * DAY_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

function toDrillDownProjectRow(item: DashboardProjectItem): DrillDownProjectRow {
  return {
    kind: "project",
    id: item.id,
    code: item.code,
    proposalId: item.proposalId,
    title: item.title,
    unitId: item.unitId,
    unitCode: item.unitCode,
    unitName: item.unitName,
    piName: item.piName,
    officerId: item.officerId,
    officerName: item.officerName,
    levelLabel: item.levelLabel,
    fieldLabel: item.fieldLabel,
    scopeLabel: item.scopeLabel,
    year: item.year,
    status: item.status,
    statusLabel: item.statusLabel,
    health: item.health,
    healthLabel: item.healthLabel,
    plannedPercent: item.progress.plannedPercent,
    actualPercent: item.progress.actualPercent,
    spi: item.progress.spi,
    overdueMilestones: item.progress.overdueMilestones,
    maxDaysOverdue: item.progress.maxDaysOverdue,
    lateReports: item.progress.lateReports,
    startDate: item.startDate,
    endDate: item.endDate,
    milestones: item.milestones,
    totalBudget: item.canViewRowFunding && item.rowFunding ? item.rowFunding.approvedBudget : null,
    totalDisbursed: item.canViewRowFunding && item.rowFunding ? item.rowFunding.totalDisbursed : null,
    totalSettled: item.canViewRowFunding && item.rowFunding ? item.rowFunding.totalSettled : null
  };
}

function toDrillDownProposalRow(item: DashboardProposalItem): DrillDownProposalRow {
  return {
    kind: "proposal",
    id: item.id,
    code: item.code,
    title: item.title,
    unitId: item.unitId,
    unitCode: item.unitCode,
    unitName: item.unitName,
    piName: item.piName,
    officerId: item.officerId,
    officerName: item.officerName,
    levelLabel: item.levelLabel,
    fieldLabel: item.fieldLabel,
    scopeLabel: item.scopeLabel,
    intakeTitle: item.intakeTitle,
    year: item.year,
    status: item.status,
    statusLabel: item.statusLabel,
    submittedAt: item.submittedAt,
    totalBudget: item.canViewRowFunding ? item.rawBudget : null,
    totalDisbursed: null
  };
}

function toDrillDownProductRow(item: DashboardProductItem): DrillDownProductRow {
  return {
    kind: "product",
    key: item.key,
    projectId: item.projectId,
    projectCode: item.projectCode,
    projectTitle: item.projectTitle,
    unitId: item.unitId,
    unitName: item.unitName,
    piName: item.piName,
    year: item.year,
    name: item.name,
    type: item.type,
    typeLabel: item.typeLabel,
    description: item.description,
    productStatus: item.productStatus,
    productStatusLabel: item.productStatusLabel
  };
}

@Injectable()
export class DashboardAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService
  ) {}

  async getDistribution(actor: SafeUserContext, query: ParsedDashboardQuery, now = new Date()) {
    assertDashboardAccess(actor);
    const fundingRestricted = isResearchOversightAuthority(actor);

    if (query.subject === "proposals") {
      const allProposals = await this.dashboard.loadAuthorizedProposals(actor, now);
      const proposals = allProposals.filter((item) => matchesProposalFilters(item, query));

      const makeProposalBuckets = (
        pick: (item: DashboardProposalItem) => { key: string; code?: string; label: string }
      ): DistributionBucket[] => {
        const map = new Map<string, DistributionBucket>();
        for (const item of proposals) {
          const { key, code, label } = pick(item);
          const bucket = map.get(key) ?? {
            key,
            ...(code !== undefined ? { code } : {}),
            label,
            count: 0,
            totalBudget: 0,
            totalDisbursed: 0,
            overdueCount: 0
          };
          bucket.count += 1;
          bucket.totalBudget += item.aggregateBudget;
          map.set(key, bucket);
        }
        return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "vi"));
      };

      const totalBudget = proposals.reduce((sum, item) => sum + item.aggregateBudget, 0);

      return {
        subject: "proposals" as const,
        fundingRestricted,
        totals: {
          count: proposals.length,
          totalBudget,
          totalDisbursed: 0,
          totalSettled: 0,
          overdueCount: 0,
          completedCount: proposals.filter((p) => p.status === "approved").length
        },
        byUnit: makeProposalBuckets((p) => ({ key: p.unitId, code: p.unitCode, label: p.unitName })),
        byLevel: makeProposalBuckets((p) => ({ key: p.levelCode, label: p.levelLabel })),
        byField: makeProposalBuckets((p) => ({ key: p.fieldCode, label: p.fieldLabel })),
        byStatus: makeProposalBuckets((p) => ({ key: p.status, label: p.statusLabel })),
        byScope: makeProposalBuckets((p) => ({ key: p.scopeCode, label: p.scopeLabel })),
        byOfficer: makeProposalBuckets((p) => ({ key: p.officerId, label: p.officerName })),
        byYear: makeProposalBuckets((p) => ({ key: String(p.year), label: String(p.year) })).sort(
          (a, b) => Number(a.key) - Number(b.key)
        ),
        byHealth: [] as DistributionBucket[],
        byUnitHealth: [] as UnitHealthRow[]
      };
    }

    const allProjects = await this.dashboard.loadAuthorizedProjects(actor, now);
    const projects = allProjects.filter((item) => matchesProjectFilters(item, query));

    const makeProjectBuckets = (
      pick: (item: DashboardProjectItem) => { key: string; code?: string; label: string }
    ): DistributionBucket[] => {
      const map = new Map<string, DistributionBucket>();
      for (const item of projects) {
        const { key, code, label } = pick(item);
        const bucket = map.get(key) ?? {
          key,
          ...(code !== undefined ? { code } : {}),
          label,
          count: 0,
          totalBudget: 0,
          totalDisbursed: 0,
          overdueCount: 0
        };
        bucket.count += 1;
        bucket.totalBudget += item.aggregateFunding.approvedBudget;
        bucket.totalDisbursed += item.aggregateFunding.totalDisbursed;
        if (item.overdue || item.progress.maxDaysOverdue > 0) bucket.overdueCount += 1;
        map.set(key, bucket);
      }
      return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "vi"));
    };

    const healthOrder = new Map(PROJECT_HEALTH_VALUES.map((code, idx) => [code, idx]));
    const byHealth = makeProjectBuckets((p) => ({
      key: p.health,
      label: PROJECT_HEALTH_LABELS[p.health]
    })).sort((a, b) => (healthOrder.get(a.key as ProjectHealth) ?? 99) - (healthOrder.get(b.key as ProjectHealth) ?? 99));

    const unitHealthMap = new Map<string, UnitHealthRow>();
    for (const item of projects) {
      const row = unitHealthMap.get(item.unitId) ?? {
        unitId: item.unitId,
        unitCode: item.unitCode,
        unitName: item.unitName,
        total: 0,
        on_track: 0,
        at_risk: 0,
        delayed: 0,
        completed: 0
      };
      row.total += 1;
      row[item.health] += 1;
      unitHealthMap.set(item.unitId, row);
    }

    const byUnitHealth = [...unitHealthMap.values()].sort(
      (a, b) => b.delayed - a.delayed || b.total - a.total || a.unitName.localeCompare(b.unitName, "vi")
    );

    let totalBudget = 0;
    let totalDisbursed = 0;
    let totalSettled = 0;
    let overdueCount = 0;
    let completedCount = 0;

    for (const item of projects) {
      totalBudget += item.aggregateFunding.approvedBudget;
      totalDisbursed += item.aggregateFunding.totalDisbursed;
      totalSettled += item.aggregateFunding.totalSettled;
      if (item.overdue || item.progress.maxDaysOverdue > 0) overdueCount += 1;
      if (item.health === "completed") completedCount += 1;
    }

    return {
      subject: "projects" as const,
      fundingRestricted,
      totals: {
        count: projects.length,
        totalBudget,
        totalDisbursed,
        totalSettled,
        overdueCount,
        completedCount
      },
      byUnit: makeProjectBuckets((p) => ({ key: p.unitId, code: p.unitCode, label: p.unitName })),
      byLevel: makeProjectBuckets((p) => ({ key: p.levelCode, label: p.levelLabel })),
      byField: makeProjectBuckets((p) => ({ key: p.fieldCode, label: p.fieldLabel })),
      byStatus: makeProjectBuckets((p) => ({ key: p.status, label: p.statusLabel })),
      byScope: makeProjectBuckets((p) => ({ key: p.scopeCode, label: p.scopeLabel })),
      byOfficer: makeProjectBuckets((p) => ({ key: p.officerId, label: p.officerName })),
      byYear: makeProjectBuckets((p) => ({ key: String(p.year), label: String(p.year) })).sort(
        (a, b) => Number(a.key) - Number(b.key)
      ),
      byHealth,
      byUnitHealth
    };
  }

  async getTrends(actor: SafeUserContext, query: ParsedDashboardQuery, now = new Date()) {
    assertDashboardAccess(actor);
    const todayVn = vietnamDateParts(now).dateStr;
    const isHistoricalYear = query.year !== undefined && query.year < Number(todayVn.slice(0, 4));
    const to = query.to ?? (isHistoricalYear ? `${query.year}-12-31` : todayVn);
    const from = query.from ?? (isHistoricalYear ? `${query.year}-01-01` : shiftIsoDays(to, -84));

    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T00:00:00.000Z`);
    if (fromDate.getTime() > toDate.getTime()) {
      throw new BadRequestException({
        code: DASHBOARD_QUERY_INVALID,
        field: "from",
        message: "Ngày bắt đầu không được lớn hơn ngày kết thúc."
      });
    }
    if (toDate.getTime() > maxRangeEndUtc(fromDate).getTime()) {
      throw new BadRequestException({
        code: DASHBOARD_QUERY_INVALID,
        field: "to",
        message: "Khoảng thời gian xu hướng tối đa 3 năm."
      });
    }

    const oversight = isResearchOversightAuthority(actor);
    const allProjects = await this.dashboard.loadAuthorizedProjects(actor, now);
    const snapshotBaseProjects = allProjects.filter((item) =>
      matchesProjectFilters(item, { ...query, health: undefined, status: undefined })
    );
    const liveProjects = allProjects.filter((item) => matchesProjectFilters(item, query));
    const projectMap = new Map(snapshotBaseProjects.map((p) => [p.id, p]));
    const projectIds = [...projectMap.keys()];

    const pointsByDate = new Map<string, TrendPoint>();

    if (projectIds.length > 0) {
      const snapshots = await this.prisma.projectHealthSnapshot.findMany({
        where: {
          projectId: { in: projectIds },
          snapshotDate: { gte: fromDate, lte: toDate },
          ...(query.health ? { health: query.health } : {}),
          ...(query.status ? { projectStatus: query.status } : {})
        },
        orderBy: [{ snapshotDate: "asc" }, { projectId: "asc" }]
      });

      const grouped = new Map<string, typeof snapshots>();
      for (const snap of snapshots) {
        const key = snap.snapshotDate.toISOString().slice(0, 10);
        const list = grouped.get(key) ?? [];
        list.push(snap);
        grouped.set(key, list);
      }

      for (const [date, rows] of grouped.entries()) {
        let onTrack = 0;
        let atRisk = 0;
        let delayed = 0;
        let completed = 0;
        let sumPlanned = 0;
        let sumActual = 0;
        let overdueMilestones = 0;
        let lateReports = 0;
        let approvedBudget = 0;
        let disbursedAmount = 0;

        for (const row of rows) {
          if (row.health === "on_track") onTrack += 1;
          else if (row.health === "at_risk") atRisk += 1;
          else if (row.health === "delayed") delayed += 1;
          else if (row.health === "completed") completed += 1;

          sumPlanned += Number(row.plannedPercent);
          sumActual += Number(row.actualPercent);
          overdueMilestones += row.overdueMilestones;
          lateReports += row.lateReports;

          const proj = projectMap.get(row.projectId);
          if (proj && (oversight || proj.canViewRowFunding)) {
            approvedBudget += Number(row.approvedBudget);
            disbursedAmount += Number(row.disbursedAmount);
          }
        }

        const n = rows.length;
        pointsByDate.set(date, {
          date,
          live: false,
          total: n,
          on_track: onTrack,
          at_risk: atRisk,
          delayed,
          completed,
          plannedPercent: n ? round2(sumPlanned / n) : 0,
          actualPercent: n ? round2(sumActual / n) : 0,
          spi: sumPlanned > 0 ? round3(Math.min(2, sumActual / sumPlanned)) : 1,
          overdueMilestones,
          lateReports,
          approvedBudget: Math.round(approvedBudget),
          disbursedAmount: Math.round(disbursedAmount)
        });
      }
    }

    const buildLivePoint = (): TrendPoint => {
      let onTrack = 0;
      let atRisk = 0;
      let delayed = 0;
      let completed = 0;
      let sumPlanned = 0;
      let sumActual = 0;
      let overdueMilestones = 0;
      let lateReports = 0;
      let approvedBudget = 0;
      let disbursedAmount = 0;

      for (const item of liveProjects) {
        if (item.health === "on_track") onTrack += 1;
        else if (item.health === "at_risk") atRisk += 1;
        else if (item.health === "delayed") delayed += 1;
        else if (item.health === "completed") completed += 1;

        sumPlanned += item.progress.plannedPercent;
        sumActual += item.progress.actualPercent;
        overdueMilestones += item.progress.overdueMilestones;
        lateReports += item.progress.lateReports;
        approvedBudget += item.aggregateFunding.approvedBudget;
        disbursedAmount += item.aggregateFunding.totalDisbursed;
      }

      const n = liveProjects.length;
      return {
        date: todayVn,
        live: true,
        total: n,
        on_track: onTrack,
        at_risk: atRisk,
        delayed,
        completed,
        plannedPercent: n ? round2(sumPlanned / n) : 0,
        actualPercent: n ? round2(sumActual / n) : 0,
        spi: sumPlanned > 0 ? round3(Math.min(2, sumActual / sumPlanned)) : 1,
        overdueMilestones,
        lateReports,
        approvedBudget,
        disbursedAmount
      };
    };

    if (from <= todayVn && to >= todayVn) {
      pointsByDate.set(todayVn, buildLivePoint());
    }

    const points = [...pointsByDate.values()].sort((a, b) => a.date.localeCompare(b.date));

    return {
      from,
      to,
      today: todayVn,
      fundingRestricted: oversight,
      points
    };
  }

  async resolveDrillDownRows(
    actor: SafeUserContext,
    query: ParsedDashboardQuery,
    now = new Date()
  ): Promise<{ metric: DrillDownMetric; fundingRestricted: boolean; rows: DrillDownRow[] }> {
    assertDashboardAccess(actor);
    const metric = query.metric!;
    const fundingRestricted = isResearchOversightAuthority(actor);

    if (metric === "proposals") {
      const allProposals = await this.dashboard.loadAuthorizedProposals(actor, now);
      const filtered = allProposals.filter((item) => matchesProposalFilters(item, query));
      return {
        metric,
        fundingRestricted,
        rows: filtered.map(toDrillDownProposalRow)
      };
    }

    if (metric === "products") {
      const products = await this.dashboard.loadAuthorizedProducts(actor, query, undefined, now);
      return {
        metric,
        fundingRestricted,
        rows: products.map(toDrillDownProductRow)
      };
    }

    const allProjects = await this.dashboard.loadAuthorizedProjects(actor, now);
    let filtered = allProjects.filter((item) => matchesProjectFilters(item, query));

    if (metric === "overdue_projects") {
      filtered = filtered.filter((item) => item.overdue || item.progress.maxDaysOverdue > 0);
    } else if (metric === "funding") {
      filtered = [...filtered].sort(
        (a, b) =>
          (b.canViewRowFunding ? b.aggregateFunding.approvedBudget : 0) -
          (a.canViewRowFunding ? a.aggregateFunding.approvedBudget : 0)
      );
    }

    return {
      metric,
      fundingRestricted,
      rows: filtered.map(toDrillDownProjectRow)
    };
  }

  async getDrillDown(actor: SafeUserContext, query: ParsedDashboardQuery, now = new Date()) {
    const { metric, fundingRestricted, rows } = await this.resolveDrillDownRows(actor, query, now);
    const total = rows.length;
    const start = (query.page - 1) * query.pageSize;
    const items = rows.slice(start, start + query.pageSize);

    return {
      metric,
      fundingRestricted,
      total,
      page: query.page,
      pageSize: query.pageSize,
      items
    };
  }
}
