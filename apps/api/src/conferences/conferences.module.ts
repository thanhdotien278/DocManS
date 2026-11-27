import { Module } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { PasswordService } from "../auth/password.service.js";
import { MinioObjectStorageService } from "../infrastructure/minio/minio-object-storage.service.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { ConferenceInvitationsService } from "./conference-invitations.service.js";
import { ConferencePapersService } from "./conference-papers.service.js";
import { ConferencePapersController, ConferenceProgramController, ConferencesController, MyConferencesController, PublicConferenceInvitationsController } from "./conferences.controller.js";
import { ConferenceProgramService } from "./conference-program.service.js";
import { ConferencesService } from "./conferences.service.js";

// AuthModule cung cấp SessionAuthGuard; PrismaService, AuditLogService và kho tệp khai báo như StudentResearchModule.
@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [ConferencesController, ConferenceProgramController, MyConferencesController, ConferencePapersController, PublicConferenceInvitationsController],
  providers: [
    PrismaService,
    AuditLogService,
    PasswordService,
    MinioObjectStorageService,
    ConferencesService,
    ConferenceInvitationsService,
    {
      provide: ConferencePapersService,
      useFactory: (prisma: PrismaService, auditLog: AuditLogService, storage: MinioObjectStorageService, notifications: NotificationsService) => new ConferencePapersService(prisma, auditLog, storage, notifications),
      inject: [PrismaService, AuditLogService, MinioObjectStorageService, NotificationsService]
    },
    {
      provide: ConferenceProgramService,
      useFactory: (prisma: PrismaService, auditLog: AuditLogService, storage: MinioObjectStorageService) => new ConferenceProgramService(prisma, auditLog, storage),
      inject: [PrismaService, AuditLogService, MinioObjectStorageService]
    }
  ]
})
export class ConferencesModule {}
