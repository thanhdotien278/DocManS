import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuditLogService } from "./audit-log.service.js";
import { AuthRateLimitService } from "./auth-rate-limit.service.js";
import { AuthStore } from "./auth.store.js";
import { PasswordService } from "./password.service.js";
import { AUTH_FAILURE_MESSAGE, type LoginRequest } from "./auth.types.js";
import { validateNewPassword } from "./password-request.pipe.js";

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

  async changePassword(userId: string, input: { currentPassword: string; newPassword: string }, context: RequestContext) {
    const user = await this.authStore.findUserById(userId);
    if (!user || !(await this.passwordService.verifyPassword(input.currentPassword, user.passwordHash))) {
      await this.auditLog.record({ action: "change-password", result: "failure", actorId: userId, targetEntity: "user", targetEntityId: userId, ip: context.ip, userAgent: context.userAgent, reason: "current_password_invalid" });
      throw new BadRequestException({ message: "Mật khẩu hiện tại không chính xác." });
    }
    try {
      validateNewPassword(input.newPassword);
    } catch (error) {
      await this.recordPasswordChangeFailure(user.id, context, "new_password_policy_invalid");
      throw error;
    }
    await this.authStore.changePassword(user.id, await this.passwordService.hashPassword(input.newPassword));
    await this.auditLog.record({ action: "change-password", result: "success", actorId: user.id, targetEntity: "user", targetEntityId: user.id, username: user.username, ip: context.ip, userAgent: context.userAgent });
  }

  async initiatePasswordReset(actor: { id: string; username: string }, userId: string, context: RequestContext) {
    const user = await this.authStore.findUserById(userId);
    if (!user) {
      await this.auditLog.record({ action: "initiate-password-reset", result: "failure", actorId: actor.id, targetEntity: "user", targetEntityId: userId, username: actor.username, ip: context.ip, userAgent: context.userAgent, reason: "target_not_found_or_unavailable" });
      throw new BadRequestException({ message: "Không tìm thấy người dùng cần đặt lại mật khẩu." });
    }
    const reset = this.passwordService.createResetToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await this.authStore.createPasswordResetToken(user.id, actor.id, reset.tokenHash, expiresAt);
    await this.auditLog.record({ action: "initiate-password-reset", result: "success", actorId: actor.id, targetEntity: "user", targetEntityId: user.id, username: actor.username, ip: context.ip, userAgent: context.userAgent });
    return { token: reset.token, expiresAt: expiresAt.toISOString() };
  }

  async completePasswordReset(input: { token: string; newPassword: string }, context: RequestContext) {
    const rateLimitKey = `password-reset:${context.ip ?? "unknown"}`;
    this.rateLimit.assertCanAttempt(rateLimitKey);
    try {
      validateNewPassword(input.newPassword);
    } catch (error) {
      await this.recordPasswordResetFailure(context, "new_password_policy_invalid");
      throw error;
    }
    const userId = await this.authStore.completePasswordReset(
      this.passwordService.hashResetToken(input.token),
      await this.passwordService.hashPassword(input.newPassword)
    );
    if (!userId) {
      this.rateLimit.recordFailure(rateLimitKey);
      await this.recordPasswordResetFailure(context, "invalid_or_expired");
      throw new BadRequestException({ message: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." });
    }
    this.rateLimit.reset(rateLimitKey);
    await this.auditLog.record({ action: "complete-password-reset", result: "success", actorId: userId, targetEntity: "user", targetEntityId: userId, ip: context.ip, userAgent: context.userAgent });
  }

  async recordPasswordChangeFailure(userId: string, context: RequestContext, reason: string) {
    await this.auditLog.record({ action: "change-password", result: "failure", actorId: userId, targetEntity: "user", targetEntityId: userId, ip: context.ip, userAgent: context.userAgent, reason });
  }

  async recordPasswordResetFailure(context: RequestContext, reason: string) {
    await this.auditLog.record({ action: "complete-password-reset", result: "failure", targetEntity: "password-reset", targetEntityId: "unknown", ip: context.ip, userAgent: context.userAgent, reason });
  }

  private createRateLimitKey(username: string, ip?: string) {
    return `${ip ?? "unknown"}:${username.trim().toLowerCase()}`;
  }
}
