import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import { PasswordService } from "../auth/password.service.js";
import { AuthService } from "../auth/auth.service.js";
import { SYSTEM_ROLES, type SafeUserContext, type SystemRole } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { readCode, readText } from "./admin-access.js";

type CreateUserInput = {
  username?: unknown;
  displayName?: unknown;
  password?: unknown;
  systemRole?: unknown;
  organizationUnitId?: unknown;
};

type UpdateUserInput = {
  displayName?: unknown;
  systemRole?: unknown;
  organizationUnitId?: unknown;
  status?: unknown;
};

type ListUsersInput = {
  keyword?: unknown;
  search?: unknown;
  systemRole?: unknown;
  organizationId?: unknown;
  organization?: unknown;
  status?: unknown;
};

type OrganizationUnitInput = {
  code?: unknown;
  name?: unknown;
  parentId?: unknown;
  status?: unknown;
};

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly passwordService: PasswordService,
    private readonly authService?: AuthService
  ) {}

  async listUsers(input: ListUsersInput = {}) {
    const keyword = readOptionalDescription(input.keyword ?? input.search, 120);
    const systemRole = input.systemRole === undefined ? undefined : this.readSystemRole(input.systemRole);
    const organizationId = readOptionalDescription(input.organizationId, 80);
    const organization = readOptionalDescription(input.organization, 160);
    const status = readOptionalDescription(input.status, 40);
    const where: {
      OR?: Array<{ username: { contains: string; mode: "insensitive" } } | { displayName: { contains: string; mode: "insensitive" } }>;
      systemRole?: SystemRole;
      unit?: string;
      organizationScopes?: { some: { organizationUnitId: string } };
      status?: string;
    } = {};

    if (keyword) {
      where.OR = [
        { username: { contains: keyword, mode: "insensitive" } },
        { displayName: { contains: keyword, mode: "insensitive" } }
      ];
    }
    if (systemRole) {
      where.systemRole = systemRole;
    }
    if (organization) {
      where.unit = organization;
    }
    if (organizationId) {
      where.organizationScopes = { some: { organizationUnitId: organizationId } };
    }
    if (status) {
      where.status = this.readUserStatus(status);
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        organizationScopes: { include: { organizationUnit: true } }
      },
      orderBy: { displayName: "asc" }
    });

    return users.map((user) => this.toUserResponse(user));
  }

  async listRoles() {
    return SYSTEM_ROLES.map((systemRole) => ({
      id: systemRole,
      code: systemRole,
      label: this.toRoleLabel(systemRole),
      status: "active"
    }));
  }

  async listOrganizationUnits() {
    return this.prisma.organizationUnit.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" }
    });
  }

  async createOrganizationUnit(actor: SafeUserContext, input: OrganizationUnitInput) {
    const unit = await this.prisma.organizationUnit.create({
      data: {
        code: readCode(input.code, "code"),
        name: readText(input.name, "name"),
        parentId: input.parentId === undefined ? undefined : readOptionalDescription(input.parentId, 80),
        status: input.status === undefined ? "active" : this.readActiveStatus(input.status)
      }
    });

    await this.auditLog.record({
      action: "create-organization-unit",
      result: "success",
      actorId: actor.id,
      targetEntity: "organization-unit",
      targetEntityId: unit.id,
      username: actor.username
    });

    return unit;
  }

  async updateOrganizationUnit(actor: SafeUserContext, unitId: string, input: OrganizationUnitInput) {
    const data: {
      code?: string;
      name?: string;
      parentId?: string | null;
      status?: string;
    } = {};

    if (input.code !== undefined) {
      data.code = readCode(input.code, "code");
    }
    if (input.name !== undefined) {
      data.name = readText(input.name, "name");
    }
    if (input.parentId !== undefined) {
      data.parentId = readOptionalDescription(input.parentId, 80) ?? null;
    }
    if (input.status !== undefined) {
      data.status = this.readActiveStatus(input.status);
    }

    const unit = await this.prisma.organizationUnit.update({
      where: { id: unitId },
      data
    });

    await this.auditLog.record({
      action: "update-organization-unit",
      result: "success",
      actorId: actor.id,
      targetEntity: "organization-unit",
      targetEntityId: unit.id,
      username: actor.username
    });

    return unit;
  }

  async createUser(actor: SafeUserContext, input: CreateUserInput) {
    const username = readCode(input.username, "username").toLowerCase();
    const displayName = readText(input.displayName, "displayName");
    const password = readText(input.password, "password", 256);
    const systemRole = this.readSystemRole(input.systemRole);
    const organizationUnitId = readText(input.organizationUnitId, "organizationUnitId");

    const existing = await this.prisma.user.findUnique({ where: { usernameKey: username } });
    if (existing) {
      throw new BadRequestException({ message: "Tên đăng nhập đã tồn tại." });
    }

    const organizationUnit = await this.findActiveOrganizationUnit(organizationUnitId);
    const passwordHash = await this.passwordService.hashPassword(password);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username,
          usernameKey: username,
          displayName,
          passwordHash,
          status: "active",
          systemRole,
          unit: organizationUnit.name
        }
      });

      await tx.userOrganizationScope.create({
        data: {
          userId: created.id,
          organizationUnitId: organizationUnit.id,
          isPrimary: true
        }
      });

      return created;
    });

    await this.auditLog.record({
      action: "AUD-ST-1.3-01",
      result: "success",
      actorId: actor.id,
      targetEntity: "user",
      targetEntityId: user.id,
      username: actor.username,
      reason: safeAuditContext({
        username: user.username,
        systemRole,
        organizationUnitId: organizationUnit.id,
        organizationUnitName: organizationUnit.name
      })
    });

    return this.toUserResponse(user);
  }

  async updateUser(actor: SafeUserContext, userId: string, input: UpdateUserInput) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new NotFoundException({ message: "Không tìm thấy người dùng." });
    }

    const data: {
      displayName?: string;
      status?: string;
      systemRole?: string;
      unit?: string;
    } = {};

    if (input.displayName !== undefined) {
      data.displayName = readText(input.displayName, "displayName");
    }

    const auditEvents: Array<{ action: string; before: unknown; after: unknown }> = [];

    if (input.status !== undefined) {
      const status = this.readUserStatus(input.status);
      data.status = status;
      auditEvents.push({
        action: status === "active" ? "AUD-ST-1.3-06" : "AUD-ST-1.3-05",
        before: { status: existing.status },
        after: { status }
      });
    }

    if (input.systemRole !== undefined) {
      const systemRole = this.readSystemRole(input.systemRole);
      data.systemRole = systemRole;
      auditEvents.push({
        action: "AUD-ST-1.3-03",
        before: { systemRole: existing.systemRole },
        after: { systemRole }
      });
    }

    const organizationUnit =
      input.organizationUnitId === undefined
        ? undefined
        : await this.findActiveOrganizationUnit(readText(input.organizationUnitId, "organizationUnitId"));

    if (organizationUnit) {
      data.unit = organizationUnit.name;
      auditEvents.push({
        action: "AUD-ST-1.3-04",
        before: { unit: existing.unit },
        after: { organizationUnitId: organizationUnit.id, unit: organizationUnit.name }
      });
    }

    if (input.displayName !== undefined) {
      auditEvents.unshift({
        action: "AUD-ST-1.3-02",
        before: { displayName: existing.displayName },
        after: { displayName: data.displayName }
      });
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data
      });

      if (organizationUnit) {
        await tx.userOrganizationScope.updateMany({
          where: { userId, isPrimary: true },
          data: { isPrimary: false }
        });
        await tx.userOrganizationScope.upsert({
          where: { userId_organizationUnitId: { userId, organizationUnitId: organizationUnit.id } },
          update: { isPrimary: true },
          create: { userId, organizationUnitId: organizationUnit.id, isPrimary: true }
        });
      }

      return updated;
    });

    for (const event of auditEvents) {
      await this.auditLog.record({
        action: event.action,
        result: "success",
        actorId: actor.id,
        targetEntity: "user",
        targetEntityId: user.id,
        username: actor.username,
        reason: safeAuditContext({ before: event.before, after: event.after })
      });
    }

    return this.toUserResponse(user);
  }

  async setUserStatus(actor: SafeUserContext, userId: string, statusInput: unknown) {
    return this.updateUser(actor, userId, { status: statusInput });
  }

  async initiatePasswordReset(actor: SafeUserContext, userId: string, context: { ip?: string; userAgent?: string }) {
    if (!this.authService) {
      throw new BadRequestException({ message: "Dịch vụ đặt lại mật khẩu chưa sẵn sàng." });
    }
    return this.authService.initiatePasswordReset(actor, userId, context);
  }

  private readSystemRole(value: unknown): SystemRole {
    const systemRole = readText(value, "systemRole", 80);
    if (!SYSTEM_ROLES.includes(systemRole as SystemRole)) {
      throw new BadRequestException({ message: "Vai trò hệ thống không hợp lệ." });
    }

    return systemRole as SystemRole;
  }

  private toRoleLabel(systemRole: SystemRole) {
    return systemRole === "SYSTEM_ADMIN"
      ? "Quản trị hệ thống"
      : systemRole === "SCIENTIFIC_MANAGEMENT_STAFF"
        ? "Chuyên viên quản lý khoa học"
        : systemRole === "LEADERSHIP_APPROVAL_AUTHORITY"
          ? "Lãnh đạo phê duyệt"
          : "Người dùng nghiên cứu nội bộ";
  }

  private async findActiveOrganizationUnit(id: string) {
    const organizationUnit = await this.prisma.organizationUnit.findUnique({ where: { id } });
    if (!organizationUnit || organizationUnit.status !== "active") {
      throw new BadRequestException({ message: "Đơn vị không hợp lệ." });
    }

    return organizationUnit;
  }

  private readActiveStatus(value: unknown) {
    const status = readText(value, "status", 40);
    if (status !== "active" && status !== "inactive") {
      throw new BadRequestException({ message: "Trạng thái không hợp lệ." });
    }

    return status;
  }

  private readUserStatus(value: unknown) {
    const status = readText(value, "status", 40);
    if (status !== "active" && status !== "disabled" && status !== "locked") {
      throw new BadRequestException({ message: "Trạng thái người dùng không hợp lệ." });
    }

    return status;
  }

  private toUserResponse(user: {
    id: string;
    username: string;
    displayName: string;
    status: string;
    systemRole: string | null;
    unit: string;
    organizationScopes?: Array<{
      isPrimary: boolean;
      organizationUnit: {
        id: string;
        name: string;
      };
    }>;
  }) {
    const organizationScope = user.organizationScopes?.find((scope) => scope.isPrimary) ?? user.organizationScopes?.[0];

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      status: user.status,
      systemRole: user.systemRole,
      unit: user.unit,
      organizationUnitId: organizationScope?.organizationUnit.id
    };
  }
}

function readOptionalDescription(value: unknown, maxLength = 500) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return readText(value, "description", maxLength);
}

function safeAuditContext(value: unknown) {
  return JSON.stringify(value);
}
