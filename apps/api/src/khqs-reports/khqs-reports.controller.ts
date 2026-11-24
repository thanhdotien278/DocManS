import { Body, Controller, Get, Param, Put, Req, Res, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { buildContentDisposition } from "../modules/files/files.controller.js";
import type { RequestWithCurrentUser } from "../proposals-shared/proposal-types.js";
import { KhqsReportsService } from "./khqs-reports.service.js";

type DownloadResponse = {
  setHeader(name: string, value: string): void;
  send(content: Buffer): void;
};

/** Báo cáo kết quả công tác KHQS theo kỳ: /api/v1/khqs-reports/:year/:period (period = H1 | FY). */
@Controller("api/v1/khqs-reports")
@UseGuards(SessionAuthGuard)
export class KhqsReportsController {
  constructor(private readonly service: KhqsReportsService) {}

  @Get(":year/:period")
  async get(@Req() request: RequestWithCurrentUser, @Param("year") year: string, @Param("period") period: string) {
    return this.service.get(request.currentUser, year, period);
  }

  /** Lưu văn bản báo cáo, các biểu nhập tay và phần sửa kết quả / ghi chú của KQ-1, KQ-2. */
  @Put(":year/:period")
  async save(@Req() request: RequestWithCurrentUser, @Param("year") year: string, @Param("period") period: string, @Body() body: unknown) {
    return this.service.save(request.currentUser, year, period, body);
  }

  @Get(":year/:period/export.xlsx")
  async exportExcel(
    @Req() request: RequestWithCurrentUser,
    @Param("year") year: string,
    @Param("period") period: string,
    @Res() res: DownloadResponse
  ) {
    const { buffer, fileName } = await this.service.exportExcel(request.currentUser, year, period);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Length", String(buffer.length));
    res.setHeader("Content-Disposition", buildContentDisposition(fileName));
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.send(buffer);
  }
}
