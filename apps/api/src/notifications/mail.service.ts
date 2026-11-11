import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import nodemailer from "nodemailer";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { ACTIVATION_DEFAULT_PURPOSE, ACTIVATION_SENDER_NAME, ACTIVATION_SUBJECT, formatExpiry, renderActivationHtml, renderActivationText } from "./activation-email.js";

type ActivationLinkInput = { to: string; displayName: string; activationUrl: string; expiresAt: Date; templateKey: string };
type ActivationTemplateInput = Omit<ActivationLinkInput, "expiresAt"> & { expiresAt: string };

@Injectable()
export class MailService {
  constructor(private readonly prisma: PrismaService) {}

  configuration() {
    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT ?? "587");
    const from = process.env.SMTP_FROM?.trim();
    const loginUrl = process.env.ACCOUNT_LOGIN_URL?.trim();
    const localHost = /^(localhost|127\.0\.0\.1|::1)$/i.test(host ?? "");
    let validUrl = false;
    try { const url = new URL(loginUrl ?? ""); validUrl = url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname)); } catch {}
    if (!host || !from || /[\r\n]/.test(from) || !Number.isInteger(port) || port < 1 || port > 65535 || !validUrl) {
      throw new ServiceUnavailableException({ message: "Chưa cấu hình email cấp tài khoản. Liên hệ quản trị hệ thống.", code: "MAIL_NOT_CONFIGURED" });
    }
    return { host, port, from, loginUrl: loginUrl!, localHost };
  }

  async sendAccountActivation(input: ActivationLinkInput) {
    this.configuration();
    const template = await this.prisma.notificationTemplate.findUnique({ where: { key: input.templateKey } });
    const values = { ...input, expiresAt: formatExpiry(input.expiresAt) };
    const active = template?.status === "active" ? template : null;
    const subject = active ? renderActivation(active.subject, values) : ACTIVATION_SUBJECT;
    const purpose = active ? renderActivation(active.body, values) : ACTIVATION_DEFAULT_PURPOSE;
    const content = { displayName: input.displayName, activationUrl: input.activationUrl, expiresAt: values.expiresAt, purpose };
    await this.sendText({ to: input.to, subject, text: renderActivationText(content), html: renderActivationHtml(content) });
  }

  async sendPasswordReset(input: { to: string; displayName: string; resetUrl: string; expiresAt: Date }) {
    const content = {
      displayName: input.displayName, activationUrl: input.resetUrl, expiresAt: formatExpiry(input.expiresAt),
      purpose: "Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn trên Hệ thống quản lý nghiên cứu khoa học (DocManS).",
      actionLabel: "Đặt lại mật khẩu", ignoreNote: "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này; mật khẩu hiện tại vẫn giữ nguyên."
    };
    await this.sendText({ to: input.to, subject: `${ACTIVATION_SENDER_NAME}: Đặt lại mật khẩu`, text: renderActivationText(content), html: renderActivationHtml(content) });
  }

  async sendText(input: { to: string; subject: string; text: string; html?: string }) {
    const { host, port, from, localHost } = this.configuration();
    const transporter = nodemailer.createTransport({ host, port, secure: process.env.SMTP_SECURE === "true" || port === 465, requireTLS: !localHost,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? "" } : undefined,
      connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000, disableFileAccess: true, disableUrlAccess: true });
    try {
      const result = await transporter.sendMail({ from, to: input.to, subject: input.subject, text: input.text, html: input.html });
      if (!result.accepted.length) throw new Error("MAIL_NOT_ACCEPTED");
    } finally { transporter.close(); }
  }

  passwordResetUrl(token: string) {
    const url = new URL("/password-reset", this.configuration().loginUrl);
    url.searchParams.set("token", token);
    return url.toString();
  }

  activationUrl(token: string) {
    const url = new URL("/password-reset", this.configuration().loginUrl);
    url.searchParams.set("mode", "activation");
    url.searchParams.set("token", token);
    return url.toString();
  }
}

function renderActivation(template: string, input: ActivationTemplateInput) {
  return template.replace(/\{\{\s*(displayName|activationUrl|expiresAt)\s*\}\}/g, (_match, key: "displayName" | "activationUrl" | "expiresAt") => input[key]);
}
