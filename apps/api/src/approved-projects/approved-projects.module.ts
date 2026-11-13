import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { AuditLogService } from "../auth/audit-log.service.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { ApprovedProjectsController } from "./approved-projects.controller.js";
import { ApprovedProjectsService } from "./approved-projects.service.js";
import { AcceptanceCouncilService } from "./acceptance-council.service.js";
import { AcceptanceDossiersService } from "./acceptance-dossiers.service.js";
import { EthicsDossiersService } from "./ethics-dossiers.service.js";

@Module({ imports: [AuthModule], controllers: [ApprovedProjectsController], providers: [ApprovedProjectsService, EthicsDossiersService, AcceptanceDossiersService, AcceptanceCouncilService, AuditLogService, PrismaService], exports: [ApprovedProjectsService, EthicsDossiersService, AcceptanceDossiersService, AcceptanceCouncilService] })
export class ApprovedProjectsModule {}
