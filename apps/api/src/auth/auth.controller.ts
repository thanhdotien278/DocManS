import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { AUTH_FAILURE_MESSAGE, type LoginRequest } from "./auth.types.js";
import { SessionAuthGuard } from "./session-auth.guard.js";
import {
  createExpiredSessionCookie,
  createSessionCookie,
  readSessionCookie
} from "./session-cookie.js";

function requestContext(request: any) {
  return {
    ip: request.ip ?? request.socket?.remoteAddress,
    userAgent: request.headers?.["user-agent"]
  };
}

@Controller("api/v1/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(@Body() body: LoginRequest, @Req() request: any, @Res({ passthrough: true }) response: any) {
    const result = await this.authService.login(body, requestContext(request));
    response.setHeader("Set-Cookie", createSessionCookie(result.session.id, process.env.NODE_ENV === "production"));

    return { user: result.user };
  }

  @Post("logout")
  async logout(@Req() request: any, @Res({ passthrough: true }) response: any) {
    const sessionId = readSessionCookie(request.headers.cookie);
    const result = await this.authService.logout(sessionId, requestContext(request));
    response.setHeader("Set-Cookie", createExpiredSessionCookie(process.env.NODE_ENV === "production"));

    return result;
  }

  @Get("me")
  @UseGuards(SessionAuthGuard)
  me(@Req() request: any) {
    return { user: request.currentUser };
  }

  @Get("protected")
  @UseGuards(SessionAuthGuard)
  protectedEndpoint(@Req() request: any) {
    return {
      ok: true,
      user: request.currentUser
    };
  }

  @Get("audit-logs")
  @UseGuards(SessionAuthGuard)
  async auditLogs(@Req() request: any) {
    if (request.currentUser?.role !== "system-admin") {
      return { message: AUTH_FAILURE_MESSAGE, records: [] };
    }

    return { records: await this.authService.listAuditLogs() };
  }
}
