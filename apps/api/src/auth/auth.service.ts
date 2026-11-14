import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { MailService } from "../notifications/mail.service.js";
import { AuditLogService } from "./audit-log.service.js";
import { AuthRateLimitService } from "./auth-rate-limit.service.js";
import { AuthStore, type ProfileDisplayRow } from "./auth.store.js";
import { PasswordService } from "./password.service.js";
import { AUTH_FAILURE_MESSAGE, AUTH_PENDING_APPROVAL_MESSAGE, type LoginRequest, type SafeUserContext } from "./auth.types.js";
import { validateNewPassword } from "./password-request.pipe.js";

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const PASSWORD_RESET_REQUEST_MESSAGE = "Nếu tài khoản tồn tại và có email, hệ thống đã gửi liên kết đặt lại mật khẩu. Liên kết có hiệu lực trong 30 phút.";
const CHANGE_PASSWORD_RATE_LIMIT_MESSAGE = "Bạn đã nhập sai mật khẩu hiện tại quá nhiều lần. Vui lòng thử lại sau.";
const PASSWORD_RESET_RATE_LIMIT_MESSAGE = "Yêu cầu đặt lại mật khẩu tạm thời bị giới hạn. Vui lòng thử lại sau.";

const DUMMY_PASSWORD_HASH =
  "scrypt:rtms-dummy-user:96634051871e68281b278b3fd4750c99b588a7de2d52473164898e8c8bef8317235443d642c5ecb4b92a434ad6fad6909a16e0642697c58222e82b92e3437589";

const TITLE_ABBREVIATIONS: Record<string, string> = {
  professor: "GS.",
  "associate-professor": "PGS.",
  doctor: "TS.",
  master: "ThS.",
  bscki: "BSCKI.",
  bsckii: "BSCKII."
};
const KNOWN_TITLE_PARTS = new Set(Object.values(TITLE_ABBREVIATIONS).map((title) => title.slice(0, -1)));
// Covers "TS.", "TS" and the common joined form "PGS.TS.".
const isTitleToken = (token: string) => token.split(".").filter(Boolean).every((part) => KNOWN_TITLE_PARTS.has(part));

/** Display-only: "GS. TS. <name>" (rank before degree) and the CV unit, falling back to the scope unit. */
function composeProfileDisplay(row: ProfileDisplayRow, scopeUnit: string) {
  const prefixes = [row.rankCode, row.degreeCode].map((code) => (code ? TITLE_ABBREVIATIONS[code] : undefined)).filter(Boolean);
  const displayFullName = prefixes.length
    ? [...prefixes, ...row.fullName.split(/\s+/).filter((token) => token && !isTitleToken(token))].join(" ")
    : row.fullName;
  return { displayFullName, displayUnit: row.organization?.trim() || scopeUnit };
}

type RequestContext = {
  ip?: string;
  userAgent?: string;
};

const MAX_FAILED_LOGINS_PER_ACCOUNT = 20;

@Injectable()
export class AuthService {
  constructor(
    private readonly auditLog: AuditLogService,
    private readonly rateLimit: AuthRateLimitService,
    private readonly authStore: AuthStore,
    private readonly passwordService: PasswordService,
    private readonly mailService: MailService
  ) {}

  async login(input: LoginRequest, context: RequestContext) {
    const username = input.username?.trim() ?? "";
    const password = input.password ?? "";
    const rateLimitKey = this.createRateLimitKey(username, context.ip);
    // Per-account cap, independent of the address: rotating addresses must not give unlimited guesses on one account.
    const accountRateLimitKey = `login-account:${username.toLowerCase()}`;
    this.rateLimit.assertCanAttempt(rateLimitKey);
    // An address this account has already logged in from keeps only its own 5-attempt limit, so guesses
    // from elsewhere cannot lock the real user out of their usual machine.
    if (!this.rateLimit.isTrusted(rateLimitKey)) this.rateLimit.assertCanAttempt(accountRateLimitKey, Date.now(), undefined, MAX_FAILED_LOGINS_PER_ACCOUNT);

    const user = username ? await this.authStore.findUserByUsername(username) : null;
    const pendingHash = username && !user ? await this.authStore.findPendingApprovalPasswordHash(username) : null;
    const passwordHash = user?.passwordHash ?? pendingHash ?? DUMMY_PASSWORD_HASH;
    const passwordIsValid = await this.passwordService.verifyPassword(password, passwordHash);

    if (pendingHash && passwordIsValid) {
      this.rateLimit.recordFailure(rateLimitKey);
      this.rateLimit.recordFailure(accountRateLimitKey);
      await this.auditLog.record({ action: "login", result: "failure", targetEntity: "auth-session", targetEntityId: username, username, ip: context.ip, userAgent: context.userAgent, reason: "pending_approval" });
      throw new UnauthorizedException({ message: AUTH_PENDING_APPROVAL_MESSAGE, code: "ACCOUNT_PENDING_APPROVAL" });
    }

    if (!user || !passwordIsValid || user.status !== "active") {
      this.rateLimit.recordFailure(rateLimitKey);
      this.rateLimit.recordFailure(accountRateLimitKey);
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
    this.rateLimit.markTrusted(rateLimitKey);
    const session = await this.authStore.createSession(user.id, user.credentialVersion);
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
    // Không có phiên hợp lệ thì không ghi nhật ký: endpoint này không cần đăng nhập nên ai cũng có thể gọi liên tục.
    if (!session) return { success: true };
    const user = await this.authStore.findUserById(session.userId);

    await this.auditLog.record({
      action: "logout",
      result: "success",
      actorId: user?.id,
      targetEntity: "auth-session",
      targetEntityId: session.id,
      username: user?.username,
      ip: context.ip,
      userAgent: context.userAgent
    });

    return { success: true };
  }

  async getUserForSession(sessionId: string | null) {
    if (!sessionId) {
      return null;
    }

    const session = await this.authStore.getActiveSession(sessionId);
    const user = session ? await this.authStore.findUserById(session.userId) : null;

    return user?.status === "active" && session?.credentialVersion === user.credentialVersion ? this.authStore.toSafeUser(user) : null;
  }

  /** `/auth/me` response only; never feeds `request.currentUser`, audit facts, or authorization. */
  async getCurrentUserView(user: SafeUserContext) {
    const profile = await this.authStore.findProfileDisplay(user.id);
    return profile ? { ...user, ...composeProfileDisplay(profile, user.unit) } : user;
  }

  async listAuditLogs(offset?: number) {
    return this.auditLog.list(offset);
  }

  async changePassword(userId: string, input: { currentPassword: string; newPassword: string }, context: RequestContext) {
    // Phiên bị chiếm không được đoán mật khẩu hiện tại vô hạn lần.
    const rateLimitKey = `change-password:${userId}`;
    this.rateLimit.assertCanAttempt(rateLimitKey, Date.now(), CHANGE_PASSWORD_RATE_LIMIT_MESSAGE);
    const user = await this.authStore.findUserById(userId);
    if (!user || user.status !== "active" || !(await this.passwordService.verifyPassword(input.currentPassword, user.passwordHash))) {
      this.rateLimit.recordFailure(rateLimitKey);
      await this.auditLog.record({ action: "change-password", result: "failure", actorId: userId, targetEntity: "user", targetEntityId: userId, ip: context.ip, userAgent: context.userAgent, reason: "current_password_invalid" });
      throw new BadRequestException({ message: "Mật khẩu hiện tại không chính xác." });
    }
    try {
      validateNewPassword(input.newPassword);
    } catch (error) {
      await this.recordPasswordChangeFailure(user.id, context, "new_password_policy_invalid");
      throw error;
    }
    if (await this.passwordService.verifyPassword(input.newPassword, user.passwordHash)) throw new BadRequestException({ message: "Mật khẩu mới phải khác mật khẩu hiện tại." });
    const changed = await this.authStore.changePassword(user.id, await this.passwordService.hashPassword(input.newPassword), user.credentialVersion, { action: user.mustChangePassword ? "first-password-change" : "change-password", username: user.username, ip: context.ip, userAgent: context.userAgent });
    if (!changed) {
      await this.recordPasswordChangeFailure(user.id, context, "credential_version_mismatch");
      throw new ConflictException({ message: "Thông tin xác thực đã thay đổi. Vui lòng đăng nhập lại." });
    }
    this.rateLimit.reset(rateLimitKey);
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

  /** Quên mật khẩu tự phục vụ: luôn trả cùng một thông điệp để không lộ tài khoản nào tồn tại. */
  async requestPasswordReset(input: { identifier: string }, context: RequestContext) {
    const keys = [`password-reset-request-ip:${context.ip ?? "unknown"}`, `password-reset-request:${input.identifier}`];
    for (const key of keys) this.rateLimit.assertCanAttempt(key, Date.now(), PASSWORD_RESET_RATE_LIMIT_MESSAGE);
    for (const key of keys) this.rateLimit.recordFailure(key);
    this.mailService.configuration();

    const user = await this.authStore.findPasswordResetTarget(input.identifier);
    if (!user?.credentialEmail) {
      await this.auditLog.record({ action: "request-password-reset", result: "failure", targetEntity: "password-reset", targetEntityId: "unknown", username: input.identifier, ip: context.ip, userAgent: context.userAgent, reason: "target_not_found_or_unavailable" });
      return { message: PASSWORD_RESET_REQUEST_MESSAGE };
    }
    const reset = this.passwordService.createResetToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    // Giữ các liên kết cũ: nếu không, ai biết tên đăng nhập cũng có thể liên tục hủy liên kết của chủ tài khoản.
    await this.authStore.createPasswordResetToken(user.id, user.id, reset.tokenHash, expiresAt, false);
    // Gửi nền để thời gian phản hồi như nhau dù tài khoản có tồn tại hay không (chống dò tài khoản qua timing).
    void this.mailService.sendPasswordReset({ to: user.credentialEmail, displayName: user.displayName, resetUrl: this.mailService.passwordResetUrl(reset.token), expiresAt })
      .then(() => this.auditLog.record({ action: "request-password-reset", result: "success", actorId: user.id, targetEntity: "user", targetEntityId: user.id, ip: context.ip, userAgent: context.userAgent, afterFacts: { expiresAt: expiresAt.toISOString() } }),
        () => this.auditLog.record({ action: "request-password-reset", result: "failure", actorId: user.id, targetEntity: "user", targetEntityId: user.id, ip: context.ip, userAgent: context.userAgent, reason: "MAIL_DELIVERY_FAILED" }))
      .catch(() => undefined);
    return { message: PASSWORD_RESET_REQUEST_MESSAGE };
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
    // Tra token trước: request rác không được tốn một lần scrypt.
    const tokenHash = this.passwordService.hashResetToken(input.token);
    const userId = (await this.authStore.isPasswordResetTokenLive(tokenHash))
      ? await this.authStore.completePasswordReset(tokenHash, await this.passwordService.hashPassword(input.newPassword))
      : null;
    if (!userId) {
      this.rateLimit.recordFailure(rateLimitKey);
      await this.recordPasswordResetFailure(context, "invalid_or_expired");
      throw new BadRequestException({ message: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." });
    }
    this.rateLimit.reset(rateLimitKey);
    await this.auditLog.record({ action: "complete-password-reset", result: "success", actorId: userId, targetEntity: "user", targetEntityId: userId, ip: context.ip, userAgent: context.userAgent });
  }

  async completeAccountActivation(input: { token: string; password: string }, context: RequestContext) {
    const rateLimitKey = `account-activation:${context.ip ?? "unknown"}`;
    this.rateLimit.assertCanAttempt(rateLimitKey);
    try {
      validateNewPassword(input.password);
    } catch (error) {
      await this.recordAccountActivationFailure(context, "new_password_policy_invalid");
      throw error;
    }
    const tokenHash = this.passwordService.hashResetToken(input.token);
    const activated = (await this.authStore.isAccountActivationTokenLive(tokenHash))
      ? await this.authStore.completeAccountActivation(tokenHash, await this.passwordService.hashPassword(input.password))
      : null;
    if (!activated) {
      this.rateLimit.recordFailure(rateLimitKey);
      await this.recordAccountActivationFailure(context, "invalid_or_expired");
      throw new BadRequestException({ message: "Liên kết kích hoạt không hợp lệ hoặc đã hết hạn." });
    }
    this.rateLimit.reset(rateLimitKey);
    const { userId, status } = activated;
    await this.auditLog.record({ action: "complete-account-activation", result: "success", actorId: userId, targetEntity: "user", targetEntityId: userId, ip: context.ip, userAgent: context.userAgent, afterFacts: { status } });
    return { status };
  }

  async recordPasswordChangeFailure(userId: string, context: RequestContext, reason: string) {
    await this.auditLog.record({ action: "change-password", result: "failure", actorId: userId, targetEntity: "user", targetEntityId: userId, ip: context.ip, userAgent: context.userAgent, reason });
  }

  async recordPasswordResetFailure(context: RequestContext, reason: string) {
    await this.auditLog.record({ action: "complete-password-reset", result: "failure", targetEntity: "password-reset", targetEntityId: "unknown", ip: context.ip, userAgent: context.userAgent, reason });
  }

  async recordAccountActivationFailure(context: RequestContext, reason: string) {
    await this.auditLog.record({ action: "complete-account-activation", result: "failure", targetEntity: "account-activation", targetEntityId: "unknown", ip: context.ip, userAgent: context.userAgent, reason });
  }

  private createRateLimitKey(username: string, ip?: string) {
    return `${ip ?? "unknown"}:${username.trim().toLowerCase()}`;
  }
}
