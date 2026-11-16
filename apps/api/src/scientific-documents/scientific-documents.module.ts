import { Module } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { MinioObjectStorageService } from "../infrastructure/minio/minio-object-storage.service.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { ScientificDocumentsController } from "./scientific-documents.controller.js";
import { ScientificDocumentsService } from "./scientific-documents.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ScientificDocumentsController],
  providers: [
    PrismaService,
    AuditLogService,
    MinioObjectStorageService,
    {
      provide: ScientificDocumentsService,
      useFactory: (prisma: PrismaService, auditLog: AuditLogService, storage: MinioObjectStorageService) => new ScientificDocumentsService(prisma, auditLog, storage),
      inject: [PrismaService, AuditLogService, MinioObjectStorageService]
    }
  ]
})
export class ScientificDocumentsModule {}
