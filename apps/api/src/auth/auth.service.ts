import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuditLogService } from "./audit-log.service.js";
import { AuthRateLimitService } from "./auth-rate-limit.service.js";
import { AuthStore } from "./auth.store.js";
import { PasswordService } from "./password.service.js";
import { AUTH_FAILURE_MESSAGE, type LoginRequest } from "./auth.types.js";

const DUMMY_PASSWORD_HASH =
  "scrypt:rtms-dummy-user:96634051871e68281b278b3fd4750c99b588a7de2d52473164898e8c8bef8317235443d642c5ecb4b92a434ad6fad6909a16e0642697c58222e82b92e3437589";

type RequestContext = {
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly auditLog: AuditLogService,
    private readonly rateLimit: AuthRateLimitService,
    private readonly authStore: AuthStore,
    private readonly passwordService: PasswordService
  ) {}

  async login(input: LoginRequest, context: RequestContext) {
    const username = input.username?.trim() ?? "";
    const password = input.password ?? "";
    const rateLimitKey = this.createRateLimitKey(username, context.ip);
    this.rateLimit.assertCanAttempt(rateLimitKey);

    const user = username ? await this.authStore.findUserByUsername(username) : null;
    const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const passwordIsValid = await this.passwordService.verifyPassword(password, passwordHash);

    if (!user || !passwordIsValid || user.status !== "active") {
      this.rateLimit.recordFailure(rateLimitKey);
      await this.auditLog.record({
        action: "login",
        result: "failure",
        targetEntity: "auth-session",
        targetEntityId: username || "unknown",
        username: username || undefined,
        ip: context.ip,
        userAgent: context.userAgent,
        reason: "invalid_credentials"
      });

      throw new UnauthorizedException({ message: AUTH_FAILURE_MESSAGE });
    }

    this.rateLimit.reset(rateLimitKey);
    const session = await this.authStore.createSession(user.id);
    const safeUser = this.authStore.toSafeUser(user);

    await this.auditLog.record({
      action: "login",
      result: "success",
      actorId: user.id,
      targetEntity: "auth-session",
      targetEntityId: session.id,
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
      targetEntity: "auth-session",
      targetEntityId: sessionId ?? "unknown",
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

    return user?.status === "active" ? this.authStore.toSafeUser(user) : null;
  }

  async listAuditLogs() {
    return this.auditLog.list();
  }

  private createRateLimitKey(username: string, ip?: string) {
    return `${ip ?? "unknown"}:${username.trim().toLowerCase()}`;
  }
}
