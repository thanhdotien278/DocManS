import { Module } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { MinioObjectStorageService } from "../infrastructure/minio/minio-object-storage.service.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { MailService } from "../notifications/mail.service.js";
import { StudentResearchController } from "./student-research.controller.js";
import { StudentResearchService } from "./student-research.service.js";

@Module({
  imports: [AuthModule],
  controllers: [StudentResearchController],
  providers: [MinioObjectStorageService, StudentResearchService, AuditLogService, PrismaService, MailService]
})
export class StudentResearchModule {}
