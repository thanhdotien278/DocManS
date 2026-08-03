import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { AuditLogService } from "../auth/audit-log.service.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { DelegationsController } from "./delegations.controller.js";
import { DelegationsService } from "./delegations.service.js";

@Module({ imports: [AuthModule], controllers: [DelegationsController], providers: [DelegationsService, AuditLogService, PrismaService] })
export class DelegationsModule {}
