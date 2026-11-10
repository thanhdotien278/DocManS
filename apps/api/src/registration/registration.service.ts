import { ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { AuditLogService } from "../auth/audit-log.service.js";
import { AuthRateLimitService } from "../auth/auth-rate-limit.service.js";
import { REGISTRATION_APPROVER_ROLES, type SafeUserContext } from "../auth/auth.types.js";
import { PasswordService } from "../auth/password.service.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { MailService } from "../notifications/mail.service.js";
import { normalizeResearcherKey } from "../researcher-profiles/researcher-profiles.dto.js";
import type { AccountType, ApproveRegistrationDto, RegisterDto, RejectRegistrationDto } from "./registration.dto.js";

export const SELF_REGISTRATION_PARAMETER_KEY = "self_registration_enabled";
const VERIFICATION_TTL_MS = 48 * 60 * 60 * 1000;
const REGISTER_RATE_LIMIT_MESSAGE = "Đăng ký tạm thời bị giới hạn. Vui lòng thử lại sau.";
const REGISTER_ACCEPTED_MESSAGE = "Nếu thông tin hợp lệ, hệ thống đã gửi email xác minh. Vui lòng kiểm tra hộp thư trong 48 giờ.";
const ALREADY_HANDLED_MESSAGE = "Yêu cầu đăng ký đã được xử lý.";

type RequestContext = { ip?: string; userAgent?: string };

const systemRoleOf = (type: AccountType) => (type === "EXTERNAL" ? "EXTERNAL_RESEARCHER_USER" : "RESEARCHER_INTERNAL_USER");

/** Story 13.11 (D-044): tự đăng ký → xác minh email → QT/TB/CV duyệt. Hồ sơ nhà nghiên cứu tạo lúc duyệt vì đơn vị quản lý chỉ chọn lúc đó. */
@Injectable()
export class RegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly mailService: MailService,
    private readonly passwordService: PasswordService,
    private readonly rateLimit: AuthRateLimitService
  ) {}

  async isEnabled() {
    const row = await this.prisma.systemParameter.findUnique({ where: { key: SELF_REGISTRATION_PARAMETER_KEY } });
    return row?.value === "true";
  }

  async register(input: RegisterDto, context: RequestContext) {
    if (!(await this.isEnabled())) throw new NotFoundException();
    // Endpoint công khai gửi mail tới địa chỉ bất kỳ: giới hạn mọi lần thử theo cả IP lẫn email.
    const keys = [`register-ip:${context.ip ?? "unknown"}`, `register-email:${input.email}`];
    for (const key of keys) this.rateLimit.assertCanAttempt(key, Date.now(), REGISTER_RATE_LIMIT_MESSAGE);
    for (const key of keys) this.rateLimit.recordFailure(key);
    this.mailService.configuration();

    const result = await this.prisma.$transaction(async (tx) => {
      await this.releaseExpiredHolders(tx, input);
      if (await tx.user.findUnique({ where: { usernameKey: input.username } })) throw new ConflictException({ message: "Tên đăng nhập đã được sử dụng.", code: "USERNAME_TAKEN" });
      if (await tx.user.findUnique({ where: { credentialEmail: input.email } })) {
        await this.auditLog.record({ action: "self-register", result: "failure", targetEntity: "user", targetEntityId: "unknown", username: input.username, ip: context.ip, userAgent: context.userAgent, reason: "email_in_use" }, tx);
        return null;
      }
      const user = await tx.user.create({ data: {
        username: input.username, usernameKey: input.username, displayName: input.fullName, credentialEmail: input.email,
        passwordHash: await this.passwordService.hashPassword(randomBytes(32).toString("base64url")),
        mustChangePassword: false, status: "pending_email_verification", systemRole: systemRoleOf(input.accountType), unit: ""
      } });
      const activation = this.passwordService.createResetToken();
      const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
      await tx.accountActivationToken.create({ data: { userId: user.id, createdById: user.id, tokenHash: activation.tokenHash, expiresAt, credentialVersion: user.credentialVersion } });
      await this.auditLog.record({ action: "self-register", result: "success", actorId: user.id, targetEntity: "user", targetEntityId: user.id, username: input.username, ip: context.ip, userAgent: context.userAgent, afterFacts: { accountType: input.accountType, expiresAt: expiresAt.toISOString() } }, tx);
      return { user, token: activation.token, expiresAt };
    }).catch((error) => {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new ConflictException({ message: "Tên đăng nhập hoặc email vừa được đăng ký. Vui lòng thử lại.", code: "REGISTRATION_CONFLICT" });
      throw error;
    });

    if (result) {
      try {
        await this.mailService.sendAccountActivation({ to: input.email, displayName: input.fullName, activationUrl: this.mailService.activationUrl(result.token), expiresAt: result.expiresAt, templateKey: "self_registration_verification" });
      } catch {
        // Không gửi được link thì người dùng không thể xác minh: giải phóng email/username để đăng ký lại ngay.
        await this.prisma.$transaction(async (tx) => {
          await this.release(tx, result.user.id, "expired");
          await this.auditLog.record({ action: "deliver-registration-verification", result: "failure", actorId: result.user.id, targetEntity: "user", targetEntityId: result.user.id, reason: "MAIL_DELIVERY_FAILED" }, tx);
        });
        throw new ServiceUnavailableException({ message: "Không gửi được email xác minh. Vui lòng thử lại sau.", code: "MAIL_DELIVERY_FAILED" });
      }
    }
    return { message: REGISTER_ACCEPTED_MESSAGE };
  }

  async listRequests(actor: SafeUserContext) {
    this.assertApprover(actor);
    const [requests, organizationUnits] = await Promise.all([
      this.prisma.user.findMany({ where: { status: "pending_approval" }, select: { id: true, username: true, displayName: true, credentialEmail: true, systemRole: true, createdAt: true }, orderBy: { createdAt: "asc" } }),
      this.prisma.organizationUnit.findMany({ where: { status: "active" }, select: { id: true, code: true, name: true }, orderBy: { name: "asc" } })
    ]);
    return {
      requests: requests.map((user) => ({ id: user.id, username: user.username, fullName: user.displayName, email: user.credentialEmail, accountType: user.systemRole === "EXTERNAL_RESEARCHER_USER" ? "EXTERNAL" : "INTERNAL", createdAt: user.createdAt.toISOString() })),
      organizationUnits
    };
  }

  async approve(actor: SafeUserContext, userId: string, input: ApproveRegistrationDto) {
    this.assertApprover(actor);
    const { loginUrl } = this.mailService.configuration();
    const approved = await this.prisma.$transaction(async (tx) => {
      const user = await this.lockPending(tx, userId);
      const unit = await tx.organizationUnit.findFirst({ where: { id: input.organizationUnitId, status: "active" } });
      if (!unit) throw new ConflictException({ message: "Đơn vị quản lý không hợp lệ hoặc đã ngừng hoạt động." });
      const systemRole = systemRoleOf(input.accountType);
      await tx.user.update({ where: { id: user.id }, data: { status: "active", systemRole, unit: unit.name, organizationScopes: { create: { organizationUnitId: unit.id, isPrimary: true } } } });
      // profileType và systemRole đổi cùng nhau để giữ bất biến loại hồ sơ ↔ vai trò tài khoản.
      const profile = await tx.researcherProfile.create({ data: {
        managementOrganizationUnitId: unit.id, profileType: input.accountType, externalAffiliation: input.externalAffiliation,
        fullName: user.displayName, fullNameKey: normalizeResearcherKey(user.displayName),
        contactEmail: user.credentialEmail, contactEmailKey: user.credentialEmail, status: "ACTIVE",
        linkedUserId: user.id, createdById: actor.id, updatedById: actor.id
      } });
      await tx.researcherProfileAccountLink.create({ data: { researcherProfileId: profile.id, userId: user.id, effectiveFrom: new Date(), reason: "self-registration-approved", createdById: actor.id } });
      await tx.researcherProfileHistory.create({ data: { researcherProfileId: profile.id, actorId: actor.id, action: "CREATE", afterFacts: { source: "self-registration", linkedUserId: user.id, profileType: input.accountType, managementOrganizationUnitId: unit.id } } as never });
      await this.auditLog.record({ action: "approve-registration-request", result: "success", actorId: actor.id, targetEntity: "user", targetEntityId: user.id, username: actor.username, afterFacts: { systemRole, organizationUnitId: unit.id, researcherProfileId: profile.id } }, tx);
      return user;
    });
    await this.notifyByMail(actor, approved.id, approved.credentialEmail!, "Tài khoản DocManS đã được duyệt", `Xin chào ${approved.displayName},\n\nTài khoản ${approved.username} đã được duyệt. Bạn có thể đăng nhập bằng tên đăng nhập hoặc email: ${loginUrl}`);
    return { ok: true };
  }

  async reject(actor: SafeUserContext, userId: string, input: RejectRegistrationDto) {
    this.assertApprover(actor);
    this.mailService.configuration();
    const rejected = await this.prisma.$transaction(async (tx) => {
      const user = { ...(await this.lockPending(tx, userId)) };
      await this.release(tx, user.id, "rejected");
      await this.auditLog.record({ action: "reject-registration-request", result: "success", actorId: actor.id, targetEntity: "user", targetEntityId: user.id, username: actor.username, reason: input.reason, beforeFacts: { username: user.username, email: user.credentialEmail } }, tx);
      return user;
    });
    await this.notifyByMail(actor, rejected.id, rejected.credentialEmail!, "Yêu cầu đăng ký tài khoản DocManS bị từ chối", `Xin chào ${rejected.displayName},\n\nYêu cầu đăng ký tài khoản của bạn đã bị từ chối.\nLý do: ${input.reason}`);
    return { ok: true };
  }

  private assertApprover(actor: SafeUserContext) {
    if (!(REGISTRATION_APPROVER_ROLES as readonly string[]).includes(actor.systemRole)) throw new ForbiddenException({ message: "Bạn không có quyền duyệt yêu cầu đăng ký." });
  }

  private async lockPending(tx: Prisma.TransactionClient, userId: string) {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== "pending_approval") throw new ConflictException({ message: ALREADY_HANDLED_MESSAGE, code: "REGISTRATION_ALREADY_HANDLED" });
    return user;
  }

  /** Soft release: giữ dòng user cho audit/FK, chỉ trả email và username về cho lần đăng ký sau. */
  private async release(tx: Prisma.TransactionClient, userId: string, status: "rejected" | "expired") {
    await tx.user.update({ where: { id: userId }, data: { status, username: null, usernameKey: null, credentialEmail: null } });
    await tx.accountActivationToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
  }

  private async releaseExpiredHolders(tx: Prisma.TransactionClient, input: RegisterDto) {
    const holders = await tx.user.findMany({ where: { status: "pending_email_verification", OR: [{ usernameKey: input.username }, { credentialEmail: input.email }], activationTokens: { none: { usedAt: null, expiresAt: { gt: new Date() } } } }, select: { id: true, username: true, credentialEmail: true } });
    for (const holder of holders) {
      await this.release(tx, holder.id, "expired");
      await this.auditLog.record({ action: "expire-registration-request", result: "success", targetEntity: "user", targetEntityId: holder.id, beforeFacts: { username: holder.username, email: holder.credentialEmail } }, tx);
    }
  }

  private async notifyByMail(actor: SafeUserContext, userId: string, to: string, subject: string, text: string) {
    try { await this.mailService.sendText({ to, subject, text }); } catch {
      await this.auditLog.record({ action: "deliver-registration-decision", result: "failure", actorId: actor.id, targetEntity: "user", targetEntityId: userId, reason: "MAIL_DELIVERY_FAILED" });
    }
  }
}
