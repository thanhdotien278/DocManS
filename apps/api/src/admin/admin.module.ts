import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { AuditLogService } from "../auth/audit-log.service.js";
import { PasswordService } from "../auth/password.service.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { AdminCatalogsController } from "./admin-catalogs.controller.js";
import { AdminCatalogsService } from "./admin-catalogs.service.js";
import { AdminConfigController, UiThemeController } from "./admin-config.controller.js";
import { AdminConfigService } from "./admin-config.service.js";
import { AdminDashboardService } from "./admin-dashboard.service.js";
import { AdminDashboardController, AdminOrganizationUnitsController, AdminRolesController, AdminUsersController } from "./admin-users.controller.js";
import { AdminUsersService } from "./admin-users.service.js";

@Module({
  imports: [AuthModule],
  controllers: [AdminUsersController, AdminRolesController, AdminOrganizationUnitsController, AdminCatalogsController, AdminConfigController, UiThemeController, AdminDashboardController],
  providers: [AdminUsersService, AdminDashboardService, AdminCatalogsService, AdminConfigService, AuditLogService, PasswordService, PrismaService]
})
export class AdminModule {}
