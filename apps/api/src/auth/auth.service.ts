import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuditLogService } from "./audit-log.service.js";
import { AuthStore } from "./auth.store.js";
import { PasswordService } from "./password.service.js";
import { AUTH_FAILURE_MESSAGE, type LoginRequest } from "./auth.types.js";

type RequestContext = {
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly auditLog: AuditLogService,
    private readonly authStore: AuthStore,
    private readonly passwordService: PasswordService
  ) {}

	  async login(input: LoginRequest, context: RequestContext) {
	    const username = input.username?.trim() ?? "";
	    const password = input.password ?? "";
	    const user = username ? await this.authStore.findUserByUsername(username) : null;
	    const passwordIsValid = user ? await this.passwordService.verifyPassword(password, user.passwordHash) : false;

	    if (!user || !passwordIsValid || user.status !== "active") {
	      await this.auditLog.record({
	        action: "login",
        result: "failure",
        username: username || undefined,
        ip: context.ip,
        userAgent: context.userAgent,
        reason: "invalid_credentials"
      });

      throw new UnauthorizedException({ message: AUTH_FAILURE_MESSAGE });
    }

	    const session = await this.authStore.createSession(user.id);
	    const safeUser = this.authStore.toSafeUser(user);

	    await this.auditLog.record({
      action: "login",
      result: "success",
      actorId: user.id,
      username: user.username,
      ip: context.ip,
      userAgent: context.userAgent
    });

    return { session, user: safeUser };
  }

	  async logout(sessionId: string | null, context: RequestContext) {
	    const session = sessionId ? await this.authStore.revokeSession(sessionId) : null;
	    const user = session ? await this.authStore.findUserById(session.userId) : null;

	    await this.auditLog.record({
      action: "logout",
      result: session ? "success" : "failure",
      actorId: user?.id,
      username: user?.username,
      ip: context.ip,
      userAgent: context.userAgent,
      reason: session ? undefined : "missing_or_invalid_session"
    });

    return { success: true };
  }

	  async getUserForSession(sessionId: string | null) {
	    if (!sessionId) {
	      return null;
	    }

	    const session = await this.authStore.getActiveSession(sessionId);
	    const user = session ? await this.authStore.findUserById(session.userId) : null;

	    return user ? this.authStore.toSafeUser(user) : null;
	  }

	  async listAuditLogs() {
	    return this.auditLog.list();
	  }
}
