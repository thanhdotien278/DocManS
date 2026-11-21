import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { buildContentDisposition } from "../modules/files/files.controller.js";
import type { RequestWithCurrentUser } from "../proposals-shared/proposal-types.js";
import { DashboardAnalyticsService } from "./dashboard-analytics.service.js";
import { DashboardExportService } from "./dashboard-export.service.js";
import { parseDashboardQuery } from "./dashboard-query.js";
import { DashboardService } from "./dashboard.service.js";

type DashboardRequest = RequestWithCurrentUser & {
  query?: Record<string, unknown>;
  originalUrl?: string;
  url?: string;
};

type DownloadResponse = {
  setHeader(name: string, value: string): void;
  send(content: Buffer): void;
};

@Controller("api/v1/dashboard")
@UseGuards(SessionAuthGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly analyticsService: DashboardAnalyticsService,
    private readonly exportService: DashboardExportService
  ) {}

  @Get("stats")
  async getStats(@Req() request: DashboardRequest) {
    const query = parseDashboardQuery("stats", request.query, request.originalUrl ?? request.url);
    return await this.dashboardService.getStats(request.currentUser!, query);
  }

  @Get("distribution")
  async getDistribution(@Req() request: DashboardRequest) {
    const query = parseDashboardQuery("distribution", request.query, request.originalUrl ?? request.url);
    return await this.analyticsService.getDistribution(request.currentUser!, query);
  }

  @Get("trends")
  async getTrends(@Req() request: DashboardRequest) {
    const query = parseDashboardQuery("trends", request.query, request.originalUrl ?? request.url);
    return await this.analyticsService.getTrends(request.currentUser!, query);
  }

  @Get("products")
  async getProducts(@Req() request: DashboardRequest) {
    const query = parseDashboardQuery("products", request.query, request.originalUrl ?? request.url);
    return await this.dashboardService.getProducts(request.currentUser!, query);
  }

  @Get("drill-down")
  async getDrillDown(@Req() request: DashboardRequest) {
    const query = parseDashboardQuery("drill-down", request.query, request.originalUrl ?? request.url);
    return await this.analyticsService.getDrillDown(request.currentUser!, query);
  }

  @Get("drill-down/export")
  async exportDrillDown(@Req() request: DashboardRequest, @Res() response: DownloadResponse) {
    const query = parseDashboardQuery("drill-down-export", request.query, request.originalUrl ?? request.url);
    const file = await this.exportService.exportDrillDown(request.currentUser!, query);
    response.setHeader("Content-Type", file.mimeType);
    response.setHeader("Content-Length", String(file.buffer.length));
    response.setHeader("Content-Disposition", buildContentDisposition(file.fileName));
    response.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    response.send(file.buffer);
  }

  @Get("export-proposals")
  async exportProposals(@Req() request: DashboardRequest, @Res() response: DownloadResponse) {
    const query = parseDashboardQuery("export-proposals", request.query, request.originalUrl ?? request.url);
    const file = await this.exportService.exportProposals(request.currentUser!, query);
    response.setHeader("Content-Type", file.mimeType);
    response.setHeader("Content-Length", String(file.buffer.length));
    response.setHeader("Content-Disposition", buildContentDisposition(file.fileName));
    response.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    response.send(file.buffer);
  }
}
