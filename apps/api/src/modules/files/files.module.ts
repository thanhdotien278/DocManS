import { Module } from "@nestjs/common";
import { AuditLogService } from "../../auth/audit-log.service.js";
import { AuthModule } from "../../auth/auth.module.js";
import { MinioObjectStorageService } from "../../infrastructure/minio/minio-object-storage.service.js";
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js";
import { FilesController } from "./files.controller.js";
import { FilesService } from "./files.service.js";

@Module({
  imports: [AuthModule],
  controllers: [FilesController],
  providers: [
    PrismaService,
    AuditLogService,
    MinioObjectStorageService,
    {
      provide: FilesService,
      useFactory: (prisma: PrismaService, objectStorage: MinioObjectStorageService, auditLog: AuditLogService) =>
        new FilesService(prisma, objectStorage, auditLog),
      inject: [PrismaService, MinioObjectStorageService, AuditLogService]
    }
  ],
  exports: [FilesService]
})
export class FilesModule {}
