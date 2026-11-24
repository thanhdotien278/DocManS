import { fundingTotals, latestFunding, readApprovedBudget } from "./project-funding.js";

export const PROJECT_HEALTH_VALUES = ["on_track", "at_risk", "delayed", "completed"] as const;
export type ProjectHealth = (typeof PROJECT_HEALTH_VALUES)[number];

export const PROJECT_HEALTH_LABELS: Record<ProjectHealth, string> = {
  on_track: "Đúng tiến độ",
  at_risk: "Nguy cơ trễ",
  delayed: "Chậm tiến độ",
  completed: "Đã hoàn thành"
};

export type ProjectProgressSummary = {
  plannedPercent: number;
  actualPercent: number;
  spi: number;
  health: ProjectHealth;
  totalMilestones: number;
  completedMilestones: number;
  overdueMilestones: number;
  maxDaysOverdue: number;
  lateReports: number;
};

export type ProjectFundingSummary = {
  approvedBudget: number;
  totalDisbursed: number;
  totalSettled: number;
};

const DAY_MS = 86_400_000;
const REPORTED_CHECKPOINT_STATUSES = new Set(["submitted", "under_review", "accepted"]);
const COMPLETED_PROJECT_STATUSES = new Set(["accepted", "closed"]);
const TERMINAL_PROJECT_STATUSES = new Set(["accepted", "closed", "failed"]);
const ACTIVE_TRACKING_STATUSES = new Set(["preparing", "executing", "paused"]);

function toTime(value: Date | string | null | undefined): number {
  if (!value) return NaN;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : NaN;
}

function utcDayStart(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function daysOverdueAt(due: Date | string | null | undefined, asOf: Date): number {
  const dueMs = toTime(due);
  const nowMs = asOf.getTime();
  if (Number.isNaN(dueMs) || Number.isNaN(nowMs)) return 0;
  // Khớp `deadlineFlags`: ngày hạn UTC được tính là quá hạn sau khi ngày đó kết thúc.
  if (dueMs + DAY_MS > nowMs) return 0;
  return Math.max(1, Math.floor((utcDayStart(nowMs) - utcDayStart(dueMs)) / DAY_MS));
}

function isApproachingAt(due: Date | string | null | undefined, asOf: Date): boolean {
  const dueMs = toTime(due);
  const nowMs = asOf.getTime();
  if (Number.isNaN(dueMs) || Number.isNaN(nowMs)) return false;
  if (dueMs + DAY_MS <= nowMs) return false;
  return dueMs - nowMs <= 14 * DAY_MS;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function computeProjectProgress(
  project: {
    status?: string;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    milestones?: Array<{ id?: string; dueDate?: Date | string | null; status: string }> | null;
    checkpoints?: Array<{ id?: string; dueDate?: Date | string | null; status: string }> | null;
    reports?: Array<{
      id?: string;
      checkpointId?: string | null;
      status: string;
      deadline?: Date | string | null;
      responseDeadline?: Date | string | null;
      supersedesReportId?: string | null;
    }> | null;
  },
  asOf = new Date()
): ProjectProgressSummary {
  const status = project.status ?? "";
  const milestones = project.milestones ?? [];
  const checkpoints = project.checkpoints ?? [];
  const reports = project.reports ?? [];
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((item) => item.status === "completed").length;

  if (COMPLETED_PROJECT_STATUSES.has(status)) {
    return {
      plannedPercent: 100,
      actualPercent: 100,
      spi: 1,
      health: "completed",
      totalMilestones,
      completedMilestones,
      overdueMilestones: 0,
      maxDaysOverdue: 0,
      lateReports: 0
    };
  }

  const reportedCheckpointIds = new Set(
    reports
      .filter((item) => REPORTED_CHECKPOINT_STATUSES.has(item.status))
      .map((item) => item.checkpointId)
      .filter((id): id is string => Boolean(id))
  );
  const completedCheckpoints = checkpoints.filter((item) => item.status === "completed" || (item.id ? reportedCheckpointIds.has(item.id) : false)).length;

  let actualPercent = 0;
  if (totalMilestones > 0) {
    actualPercent = round2((completedMilestones / totalMilestones) * 100);
  } else if (checkpoints.length > 0) {
    actualPercent = round2((completedCheckpoints / checkpoints.length) * 100);
  } else if (status === "pending_acceptance") {
    actualPercent = 90;
  }

  let plannedPercent = 0;
  const startMs = toTime(project.startDate);
  const endMs = toTime(project.endDate);
  if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs) {
    const ratio = Math.min(1, Math.max(0, (asOf.getTime() - startMs) / (endMs - startMs)));
    plannedPercent = round2(ratio * 100);
  } else if (totalMilestones > 0) {
    const dueByNow = milestones.filter((item) => {
      const dueMs = toTime(item.dueDate);
      return !Number.isNaN(dueMs) && dueMs + DAY_MS <= asOf.getTime();
    }).length;
    plannedPercent = round2((dueByNow / totalMilestones) * 100);
  }

  const spi = plannedPercent <= 0 ? 1 : round3(Math.min(2, actualPercent / plannedPercent));

  if (TERMINAL_PROJECT_STATUSES.has(status)) {
    return {
      plannedPercent,
      actualPercent,
      spi,
      health: "delayed",
      totalMilestones,
      completedMilestones,
      overdueMilestones: 0,
      maxDaysOverdue: 0,
      lateReports: 0
    };
  }

  if (!ACTIVE_TRACKING_STATUSES.has(status)) {
    return {
      plannedPercent,
      actualPercent,
      spi,
      health: "on_track",
      totalMilestones,
      completedMilestones,
      overdueMilestones: 0,
      maxDaysOverdue: 0,
      lateReports: 0
    };
  }

  let overdueMilestones = 0;
  let maxDaysOverdue = 0;
  let hasApproaching = false;
  const lateReportKeys = new Set<string>();

  for (const item of milestones) {
    if (item.status === "completed") continue;
    const late = daysOverdueAt(item.dueDate, asOf);
    if (late > 0) {
      overdueMilestones += 1;
      if (late > maxDaysOverdue) maxDaysOverdue = late;
    } else if (isApproachingAt(item.dueDate, asOf)) {
      hasApproaching = true;
    }
  }

  checkpoints.forEach((item, index) => {
    if (item.status === "completed" || (item.id && reportedCheckpointIds.has(item.id))) return;
    const late = daysOverdueAt(item.dueDate, asOf);
    if (late > 0) {
      if (late > maxDaysOverdue) maxDaysOverdue = late;
      lateReportKeys.add(`cp:${item.id ?? index}`);
    } else if (isApproachingAt(item.dueDate, asOf)) {
      hasApproaching = true;
    }
  });

  reports.forEach((report, index) => {
    if (["submitted", "under_review", "accepted", "superseded"].includes(report.status)) return;
    const source = report.status === "draft" && report.supersedesReportId
      ? reports.find((candidate) => candidate.id === report.supersedesReportId)
      : null;
    const due = source ? source.responseDeadline : (report.responseDeadline ?? report.deadline);
    const late = daysOverdueAt(due, asOf);
    if (late > 0) {
      if (late > maxDaysOverdue) maxDaysOverdue = late;
      lateReportKeys.add(report.checkpointId ? `cp:${report.checkpointId}` : `rp:${report.id ?? index}`);
    }
  });

  const endLate = daysOverdueAt(project.endDate, asOf);
  if (endLate > 0) {
    if (endLate > maxDaysOverdue) maxDaysOverdue = endLate;
  } else if (isApproachingAt(project.endDate, asOf)) {
    hasApproaching = true;
  }

  const lateReports = lateReportKeys.size;

  let health: ProjectHealth = "on_track";
  if (maxDaysOverdue > 0 || lateReports > 0 || (plannedPercent >= 20 && spi < 0.75)) {
    health = "delayed";
  } else if (status === "paused" || hasApproaching || (plannedPercent >= 10 && spi < 0.95)) {
    health = "at_risk";
  }

  return {
    plannedPercent,
    actualPercent,
    spi,
    health,
    totalMilestones,
    completedMilestones,
    overdueMilestones,
    maxDaysOverdue,
    lateReports
  };
}

export function summarizeProjectFunding(project: {
  fundingRecords?: Array<{ entryId: string; version: number; kind: string; amount: unknown }> | null;
  scopeSnapshot?: unknown;
  proposal?: { budgetMetadata?: unknown } | null;
}): ProjectFundingSummary {
  const scopeBudget = readApprovedBudget(
    (project.scopeSnapshot as Record<string, unknown> | null | undefined)?.budgetMetadata ?? project.proposal?.budgetMetadata
  );
  const rows = project.fundingRecords ?? [];
  if (!rows.length) {
    return { approvedBudget: scopeBudget, totalDisbursed: 0, totalSettled: 0 };
  }
  const totals = fundingTotals(latestFunding(rows));
  return {
    approvedBudget: totals.GRANT > 0 ? totals.GRANT : scopeBudget,
    totalDisbursed: totals.DISBURSEMENT,
    totalSettled: totals.SETTLEMENT
  };
}
