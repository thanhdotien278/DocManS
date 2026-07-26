import { Module } from "@nestjs/common";
import { AuditLogService } from "../../auth/audit-log.service.js";
import { AuthModule } from "../../auth/auth.module.js";
import { MinioObjectStorageService } from "../../infrastructure/minio/minio-object-storage.service.js";
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js";
import { ProposalReviewAccessService } from "../../proposals-shared/proposal-review-access.service.js";
import { ProposalParticipationService } from "../../research-proposals/proposal-participation.service.js";
import { FilesController } from "./files.controller.js";
import { FilesService } from "./files.service.js";

@Module({
  imports: [AuthModule],
  controllers: [FilesController],
  providers: [
    PrismaService,
    AuditLogService,
    MinioObjectStorageService,
    ProposalParticipationService,
    ProposalReviewAccessService,
    {
      provide: FilesService,
      useFactory: (
        prisma: PrismaService,
        objectStorage: MinioObjectStorageService,
        auditLog: AuditLogService,
        participation: ProposalParticipationService,
        reviewAccess: ProposalReviewAccessService
      ) => new FilesService(prisma, objectStorage, auditLog, participation, reviewAccess),
      inject: [PrismaService, MinioObjectStorageService, AuditLogService, ProposalParticipationService, ProposalReviewAccessService]
    }
  ],
  exports: [FilesService]
})
export class FilesModule {}
