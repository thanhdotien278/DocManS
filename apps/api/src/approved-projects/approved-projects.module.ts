import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { AuditLogService } from "../auth/audit-log.service.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { ApprovedProjectsController } from "./approved-projects.controller.js";
import { ApprovedProjectsService } from "./approved-projects.service.js";

@Module({ imports: [AuthModule], controllers: [ApprovedProjectsController], providers: [ApprovedProjectsService, AuditLogService, PrismaService], exports: [ApprovedProjectsService] })
export class ApprovedProjectsModule {}
