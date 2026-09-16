import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import nodemailer from "nodemailer";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";

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
    const { host, port, from, localHost } = this.configuration();
    const template = await this.prisma.notificationTemplate.findUnique({ where: { key: input.templateKey } });
    const values = { ...input, expiresAt: input.expiresAt.toISOString() };
    const subject = renderActivation(template?.status === "active" ? template.subject : "Kích hoạt tài khoản DocManS của {{displayName}}", values);
    const introduction = template?.status === "active" ? renderActivation(template.body, values) : `Xin chào ${input.displayName},`;
    const text = `${introduction}\n\nThiết lập mật khẩu: ${input.activationUrl}\nLiên kết hết hạn: ${values.expiresAt}\n\nKhông chia sẻ liên kết này.`;
    const transporter = nodemailer.createTransport({ host, port, secure: process.env.SMTP_SECURE === "true" || port === 465, requireTLS: !localHost,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? "" } : undefined,
      connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000, disableFileAccess: true, disableUrlAccess: true });
    try {
      const result = await transporter.sendMail({ from, to: input.to, subject, text });
      if (!result.accepted.length) throw new Error("MAIL_NOT_ACCEPTED");
    } finally { transporter.close(); }
  }
}

function renderActivation(template: string, input: ActivationTemplateInput) {
  return template.replace(/\{\{\s*(displayName|activationUrl|expiresAt)\s*\}\}/g, (_match, key: "displayName" | "activationUrl" | "expiresAt") => input[key]);
}
