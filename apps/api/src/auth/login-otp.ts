import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { ForbiddenException, HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { MailService } from "../notifications/mail.service.js";
import { AuthRateLimitService } from "./auth-rate-limit.service.js";
import type { InternalUser, SystemRole } from "./auth.types.js";

/**
 * Xác thực hai lớp khi đăng nhập: sau khi mật khẩu đúng, hệ thống gửi mã 6 chữ số tới thư công vụ của tài khoản;
 * chỉ khi nhập đúng mã mới cấp phiên.
 *
 * - Bắt buộc cho Ban giám đốc, Phòng KHQS và quản trị (vai trò duyệt, ký, quản lý kinh phí, quản trị).
 *   Các vai trò khác tự bật được (users.login_otp_enabled).
 * - Mã chỉ lưu dạng băm, hết hạn sau 10 phút, sai tối đa 5 lần mỗi lượt, gửi lại sau 60 giây, tối đa 5 lần gửi.
 * - Mỗi tài khoản sai tối đa 10 lần trong 15 phút, cộng dồn qua mọi lượt: người đã biết mật khẩu không thể đăng nhập
 *   lại liên tục để có thêm lượt đoán mã.
 * - LOGIN_OTP_MODE: required-roles (mặc định ở production) | off (mặc định ngoài production; hoặc tắt tạm khi máy chủ thư chưa cấu hình).
 */

export const LOGIN_OTP_REQUIRED_ROLES: readonly SystemRole[] = [
  "SYSTEM_ADMIN",
  "LEADERSHIP_APPROVAL_AUTHORITY",
  "SCIENCE_DEPUTY_DIRECTOR",
  "RESEARCH_OVERSIGHT_AUTHORITY",
  "RESEARCH_MANAGEMENT_HEAD",
  "RESEARCH_MANAGEMENT_DEPUTY_HEAD",
  "RESEARCH_BOARD_HEAD",
  "RESEARCH_MANAGEMENT_STAFF"
];

export const LOGIN_OTP_TTL_MS = 10 * 60 * 1000;
export const LOGIN_OTP_MAX_ATTEMPTS = 5;
export const LOGIN_OTP_RESEND_AFTER_MS = 60 * 1000;
export const LOGIN_OTP_MAX_SENDS = 5;
export const LOGIN_OTP_MAX_FAILURES_PER_USER = 10;
const OTP_LOCKED_MESSAGE = "Nhập sai mã xác thực quá nhiều lần. Vui lòng thử lại sau 15 phút.";

export function loginOtpMode(value = process.env.LOGIN_OTP_MODE) {
  const mode = value?.trim().toLowerCase();
  if (mode === "off" || mode === "required-roles") return mode;
  return process.env.NODE_ENV === "production" ? "required-roles" : "off";
}

export function isLoginOtpRequiredRole(role: SystemRole | string) {
  return (LOGIN_OTP_REQUIRED_ROLES as readonly string[]).includes(role);
}

/** Tài khoản này có phải nhập mã qua thư khi đăng nhập không (theo vai trò hoặc tự bật, khi chế độ không tắt). */
export function loginOtpApplies(user: Pick<InternalUser, "systemRole" | "loginOtpEnabled">, mode = loginOtpMode()) {
  return mode !== "off" && (isLoginOtpRequiredRole(user.systemRole) || user.loginOtpEnabled === true);
}

export function hashLoginOtp(challengeId: string, code: string) {
  return createHash("sha256").update(`login-otp:${challengeId}:${code}`).digest("hex");
}

/** "nguyenvan.a@vmmu.edu.vn" → "ng•••••••@vmmu.edu.vn": đủ để người dùng nhận ra hộp thư, không lộ địa chỉ. */
export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  return `${local.slice(0, Math.min(2, local.length))}${"•".repeat(Math.max(3, local.length - 2))}@${domain}`;
}

function generateCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

const failureKey = (userId: string) => `login-otp-user:${userId}`;

export type LoginChallengeResult = { challengeId: string; emailHint: string; expiresAt: string; resendAfterSeconds: number };

@Injectable()
export class LoginOtpService {
  private readonly logger = new Logger(LoginOtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly rateLimit: AuthRateLimitService
  ) {}

  /** Mở lượt đăng nhập chờ mã và gửi mã. Tài khoản bắt buộc mà chưa có thư công vụ thì không đăng nhập được. */
  async start(user: InternalUser, context: { ip?: string; userAgent?: string }): Promise<LoginChallengeResult> {
    this.rateLimit.assertCanAttempt(failureKey(user.id), Date.now(), OTP_LOCKED_MESSAGE, LOGIN_OTP_MAX_FAILURES_PER_USER);
    if (!user.credentialEmail) {
      throw new ForbiddenException({
        code: "LOGIN_OTP_EMAIL_MISSING",
        message: "Tài khoản cần xác thực hai lớp nhưng chưa có thư công vụ. Liên hệ quản trị hệ thống để bổ sung địa chỉ thư."
      });
    }
    const code = generateCode();
    const now = new Date();
    const challenge = await this.prisma.loginChallenge.create({
      data: {
        userId: user.id,
        credentialVersion: user.credentialVersion,
        codeHash: "pending",
        expiresAt: new Date(now.getTime() + LOGIN_OTP_TTL_MS),
        lastSentAt: now,
        ip: context.ip,
        userAgent: context.userAgent?.slice(0, 500)
      }
    });
    await this.prisma.loginChallenge.update({ where: { id: challenge.id }, data: { codeHash: hashLoginOtp(challenge.id, code) } });
    try {
      await this.send(user, code);
    } catch (error) {
      await this.prisma.loginChallenge.delete({ where: { id: challenge.id } }).catch(() => {});
      throw error;
    }
    return this.describe(challenge.id, user.credentialEmail, challenge.expiresAt);
  }

  /** Gửi lại mã mới cho lượt đang chờ (mã cũ hết hiệu lực). */
  async resend(challengeId: string, loadUser: (userId: string) => Promise<InternalUser | null>): Promise<LoginChallengeResult> {
    const challenge = await this.openChallenge(challengeId);
    const user = await loadUser(challenge.userId);
    if (!user?.credentialEmail || user.status !== "active") {
      throw new UnauthorizedException({ code: "LOGIN_OTP_INVALID", message: "Lượt đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại." });
    }
    const waitMs = challenge.lastSentAt.getTime() + LOGIN_OTP_RESEND_AFTER_MS - Date.now();
    if (waitMs > 0) {
      throw new HttpException({ code: "LOGIN_OTP_RESEND_TOO_SOON", message: `Vui lòng chờ ${Math.ceil(waitMs / 1000)} giây rồi gửi lại mã.` }, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (challenge.sendCount >= LOGIN_OTP_MAX_SENDS) {
      throw new HttpException({ code: "LOGIN_OTP_RESEND_LIMIT", message: "Đã gửi mã quá số lần cho phép. Vui lòng đăng nhập lại." }, HttpStatus.TOO_MANY_REQUESTS);
    }
    const code = generateCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LOGIN_OTP_TTL_MS);
    await this.send(user, code);
    await this.prisma.loginChallenge.update({
      where: { id: challenge.id },
      data: { codeHash: hashLoginOtp(challenge.id, code), attempts: 0, sendCount: { increment: 1 }, lastSentAt: now, expiresAt }
    });
    return this.describe(challenge.id, user.credentialEmail, expiresAt);
  }

  /**
   * Kiểm tra mã. Đúng thì đánh dấu lượt đã dùng (chỉ dùng được một lần) và trả userId + credentialVersion để cấp phiên;
   * sai thì tăng số lần sai của lượt và của tài khoản, quá giới hạn thì lượt hết hiệu lực.
   */
  async verify(challengeId: string, code: string) {
    const challenge = await this.openChallenge(challengeId);
    this.rateLimit.assertCanAttempt(failureKey(challenge.userId), Date.now(), OTP_LOCKED_MESSAGE, LOGIN_OTP_MAX_FAILURES_PER_USER);
    if (challenge.attempts >= LOGIN_OTP_MAX_ATTEMPTS) throw this.invalid();
    const expected = Buffer.from(challenge.codeHash);
    const actual = Buffer.from(hashLoginOtp(challenge.id, /^\d{6}$/.test(code) ? code : "x"));
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      this.rateLimit.recordFailure(failureKey(challenge.userId));
      const updated = await this.prisma.loginChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      const left = LOGIN_OTP_MAX_ATTEMPTS - updated.attempts;
      throw new UnauthorizedException(
        left > 0
          ? { code: "LOGIN_OTP_WRONG", message: `Mã xác thực không đúng. Còn ${left} lần thử.`, attemptsLeft: left }
          : { code: "LOGIN_OTP_INVALID", message: "Nhập sai mã quá số lần cho phép. Vui lòng đăng nhập lại.", attemptsLeft: 0 }
      );
    }
    // Đánh dấu đã dùng có điều kiện: hai yêu cầu cùng lúc với cùng một mã chỉ một yêu cầu thành công.
    const consumed = await this.prisma.loginChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date() } });
    if (consumed.count !== 1) throw this.invalid();
    this.rateLimit.reset(failureKey(challenge.userId));
    return { userId: challenge.userId, credentialVersion: challenge.credentialVersion };
  }

  private async openChallenge(challengeId: string) {
    const challenge =
      typeof challengeId === "string" && challengeId && challengeId.length <= 64
        ? await this.prisma.loginChallenge.findUnique({ where: { id: challengeId } })
        : null;
    if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() <= Date.now()) throw this.invalid();
    return challenge;
  }

  private invalid() {
    return new UnauthorizedException({ code: "LOGIN_OTP_INVALID", message: "Mã xác thực đã hết hạn hoặc không còn hiệu lực. Vui lòng đăng nhập lại." });
  }

  private describe(challengeId: string, email: string, expiresAt: Date): LoginChallengeResult {
    return { challengeId, emailHint: maskEmail(email), expiresAt: expiresAt.toISOString(), resendAfterSeconds: LOGIN_OTP_RESEND_AFTER_MS / 1000 };
  }

  private async send(user: InternalUser, code: string) {
    const intro = "Mã xác thực đăng nhập Hệ thống quản lý nghiên cứu khoa học (DocManS):";
    const note = "Mã có hiệu lực trong 10 phút và chỉ dùng được một lần. Nếu đồng chí không đăng nhập, hãy bỏ qua thư này và đổi mật khẩu ngay: mật khẩu của đồng chí có thể đã bị lộ.";
    try {
      await this.mail.sendText({
        to: user.credentialEmail!,
        subject: `Mã đăng nhập DocManS: ${code}`,
        text: `Kính gửi ${user.displayName},\n\n${intro}\n\n${code}\n\n${note}`,
        html: `<p>Kính gửi ${escapeHtml(user.displayName)},</p><p>${intro}</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>${note}</p>`
      });
    } catch {
      if (process.env.NODE_ENV !== "production") {
        // Môi trường phát triển chưa cấu hình SMTP: ghi mã ra log để đăng nhập thử được.
        this.logger.warn(`Chưa gửi được thư; mã đăng nhập của ${user.username}: ${code}`);
        return;
      }
      throw new ServiceUnavailableException({ code: "LOGIN_OTP_MAIL_FAILED", message: "Không gửi được mã xác thực qua thư. Vui lòng thử lại sau hoặc liên hệ quản trị hệ thống." });
    }
  }
}
