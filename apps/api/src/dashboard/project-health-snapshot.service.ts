import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { computeProjectProgress, summarizeProjectFunding } from "../approved-projects/project-progress.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";

const DAY_MS = 86_400_000;
const VN_OFFSET_MS = 7 * 3_600_000;
const CHECK_INTERVAL_MS = 60_000;

export function vietnamDateParts(now = new Date()) {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  const dateStr = vn.toISOString().slice(0, 10);
  const snapshotDate = new Date(`${dateStr}T00:00:00.000Z`);
  return {
    dateStr,
    snapshotDate,
    dayOfWeek: vn.getUTCDay(),
    hour: vn.getUTCHours(),
    minute: vn.getUTCMinutes()
  };
}

@Injectable()
export class ProjectHealthSnapshotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProjectHealthSnapshotService.name);
  private timer: NodeJS.Timeout | null = null;
  private inFlight = false;

  constructor(private readonly prisma: PrismaService) {}

  isEnabled(): boolean {
    return (process.env.HEALTH_SNAPSHOTS_ENABLED ?? "true").trim().toLowerCase() !== "false";
  }

  onModuleInit() {
    if (!this.isEnabled()) return;
    this.timer = setInterval(() => {
      void this.runScheduledCheck();
    }, CHECK_INTERVAL_MS);
    this.timer.unref?.();
    void this.runScheduledCheck();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async shouldCapture(now = new Date()): Promise<boolean> {
    if (!this.isEnabled()) return false;
    const vn = vietnamDateParts(now);
    const latest = await this.prisma.projectHealthSnapshot.findFirst({
      orderBy: { snapshotDate: "desc" },
      select: { snapshotDate: true }
    });
    if (latest && latest.snapshotDate.getTime() >= vn.snapshotDate.getTime()) {
      return false;
    }
    const isSundayWindow = vn.dayOfWeek === 0 && vn.hour === 23 && vn.minute >= 55;
    if (isSundayWindow) return true;
    if (!latest) return false;
    const diffDays = Math.floor((vn.snapshotDate.getTime() - latest.snapshotDate.getTime()) / DAY_MS);
    return diffDays >= 7;
  }

  async runScheduledCheck(now = new Date()) {
    if (this.inFlight) {
      return { snapshotDate: vietnamDateParts(now).dateStr, inserted: 0, skipped: true };
    }
    this.inFlight = true;
    try {
      if (!(await this.shouldCapture(now))) {
        return { snapshotDate: vietnamDateParts(now).dateStr, inserted: 0, skipped: true };
      }
      return await this.captureSnapshots(now);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Lỗi kiểm tra lịch chụp sức khoẻ đề tài: ${message}`);
      return { snapshotDate: vietnamDateParts(now).dateStr, inserted: 0, skipped: true, error: message };
    } finally {
      this.inFlight = false;
    }
  }

  async captureSnapshots(now = new Date()) {
    const vn = vietnamDateParts(now);
    if (!this.isEnabled()) {
      return { snapshotDate: vn.dateStr, inserted: 0, disabled: true };
    }

    try {
      const projects = await this.prisma.approvedProject.findMany({
        include: {
          proposal: { select: { budgetMetadata: true } },
          milestones: { select: { id: true, dueDate: true, status: true } },
          checkpoints: { select: { id: true, dueDate: true, status: true } },
          reports: {
            select: {
              id: true,
              checkpointId: true,
              status: true,
              deadline: true,
              responseDeadline: true,
              supersedesReportId: true
            }
          },
          fundingRecords: { select: { entryId: true, version: true, kind: true, amount: true } }
        }
      });

      if (!projects.length) {
        return { snapshotDate: vn.dateStr, inserted: 0, disabled: false };
      }

      const data = projects.map((project) => {
        const progress = computeProjectProgress(project, now);
        const funding = summarizeProjectFunding(project);
        return {
          projectId: project.id,
          snapshotDate: vn.snapshotDate,
          projectStatus: project.status,
          health: progress.health,
          plannedPercent: progress.plannedPercent,
          actualPercent: progress.actualPercent,
          spi: progress.spi,
          totalMilestones: progress.totalMilestones,
          completedMilestones: progress.completedMilestones,
          overdueMilestones: progress.overdueMilestones,
          maxDaysOverdue: progress.maxDaysOverdue,
          lateReports: progress.lateReports,
          approvedBudget: funding.approvedBudget,
          disbursedAmount: funding.totalDisbursed
        };
      });

      const created = await this.prisma.projectHealthSnapshot.createMany({
        data,
        skipDuplicates: true
      });

      return { snapshotDate: vn.dateStr, inserted: created.count, disabled: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Lỗi chụp ảnh sức khoẻ đề tài (${vn.dateStr}): ${message}`);
      return { snapshotDate: vn.dateStr, inserted: 0, disabled: false, error: message };
    }
  }
}
