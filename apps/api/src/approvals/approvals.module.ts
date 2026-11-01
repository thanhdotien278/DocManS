import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { ApprovalRoutingController } from "./approval-routing.controller.js";
import { ApprovalRoutingService } from "./approval-routing.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ApprovalRoutingController],
  providers: [PrismaService, ApprovalRoutingService]
})
export class ApprovalsModule {}
