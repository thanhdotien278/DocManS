import { Module } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { AuthRateLimitService } from "../auth/auth-rate-limit.service.js";
import { PasswordService } from "../auth/password.service.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { MailService } from "../notifications/mail.service.js";
import { RegistrationController } from "./registration.controller.js";
import { RegistrationService } from "./registration.service.js";

@Module({
  imports: [AuthModule],
  controllers: [RegistrationController],
  providers: [RegistrationService, AuditLogService, AuthRateLimitService, PasswordService, PrismaService, MailService]
})
export class RegistrationModule {}
