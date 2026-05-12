import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
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
    return true;
  }
}
