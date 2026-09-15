import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { readSessionCookie } from "./session-cookie.js";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const sessionId = readSessionCookie(request.headers.cookie);
    const user = await this.authService.getUserForSession(sessionId);

    if (!user) {
      throw new UnauthorizedException({ message: "Yêu cầu đăng nhập để tiếp tục." });
    }

    request.currentUser = user;
    if (user.mustChangePassword && !isCredentialRoute(request)) {
      throw new ForbiddenException({ message: "Bạn phải đổi mật khẩu tạm thời trước khi sử dụng hệ thống.", code: "PASSWORD_CHANGE_REQUIRED" });
    }
    return true;
  }
}

function isCredentialRoute(request: { path?: string; url?: string }) {
  const path = request.path ?? request.url ?? "";
  return path === "/api/v1/auth/me" || path === "/auth/me" || path === "/api/v1/auth/change-password" || path === "/auth/change-password";
}
