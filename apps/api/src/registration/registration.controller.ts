import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import type { RequestWithCurrentUser } from "../proposals-shared/proposal-types.js";
import { approveRegistrationPipe, registerPipe, rejectRegistrationPipe, type ApproveRegistrationDto, type RegisterDto, type RejectRegistrationDto } from "./registration.dto.js";
import { RegistrationService } from "./registration.service.js";

@Controller("api/v1/registration")
export class RegistrationController {
  constructor(private readonly registration: RegistrationService) {}

  @Get("status")
  async status() {
    return { enabled: await this.registration.isEnabled() };
  }

  @Post()
  async register(@Body(registerPipe) body: RegisterDto, @Req() request: { ip?: string; socket?: { remoteAddress?: string }; headers?: Record<string, string | undefined> }) {
    return this.registration.register(body, { ip: request.ip ?? request.socket?.remoteAddress, userAgent: request.headers?.["user-agent"] });
  }

  @Get("requests")
  @UseGuards(SessionAuthGuard)
  async list(@Req() request: RequestWithCurrentUser) {
    return this.registration.listRequests(request.currentUser!);
  }

  @Post("requests/:id/approve")
  @UseGuards(SessionAuthGuard)
  async approve(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(approveRegistrationPipe) body: ApproveRegistrationDto) {
    return this.registration.approve(request.currentUser!, id, body);
  }

  @Post("requests/:id/reject")
  @UseGuards(SessionAuthGuard)
  async reject(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(rejectRegistrationPipe) body: RejectRegistrationDto) {
    return this.registration.reject(request.currentUser!, id, body);
  }
}
