import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import { PasswordService } from "../auth/password.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { readCode, readText } from "./admin-access.js";

type CreateUserInput = {
  username?: unknown;
  displayName?: unknown;
  password?: unknown;
  roleCode?: unknown;
  organizationUnitId?: unknown;
};

type UpdateUserInput = {
  displayName?: unknown;
  roleCode?: unknown;
  organizationUnitId?: unknown;
  status?: unknown;
};

type ListUsersInput = {
  keyword?: unknown;
  search?: unknown;
  roleId?: unknown;
  roleCode?: unknown;
  role?: unknown;
  organizationId?: unknown;
  organization?: unknown;
  status?: unknown;
};

type RoleInput = {
  code?: unknown;
  label?: unknown;
  description?: unknown;
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
    private readonly passwordService: PasswordService
  ) {}

  async listUsers(input: ListUsersInput = {}) {
    const keyword = readOptionalDescription(input.keyword ?? input.search, 120);
    const roleCode = readOptionalDescription(input.roleCode ?? input.role, 80);
    const roleId = readOptionalDescription(input.roleId, 80);
    const organizationId = readOptionalDescription(input.organizationId, 80);
    const organization = readOptionalDescription(input.organization, 160);
    const status = readOptionalDescription(input.status, 40);
    const where: {
      OR?: Array<{ username: { contains: string; mode: "insensitive" } } | { displayName: { contains: string; mode: "insensitive" } }>;
      role?: string;
      roleAssignments?: { some: { roleId: string } };
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
    if (roleCode) {
      where.role = roleCode;
    }
    if (roleId) {
      where.roleAssignments = { some: { roleId } };
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
        roleAssignments: { include: { role: true } },
        organizationScopes: { include: { organizationUnit: true } }
      },
      orderBy: { displayName: "asc" }
    });

    return users.map((user) => this.toUserResponse(user));
  }

  async listRoles() {
    return this.prisma.role.findMany({
      where: { status: "active" },
      orderBy: { label: "asc" }
    });
  }

  async createRole(actor: SafeUserContext, input: RoleInput) {
    const role = await this.prisma.role.create({
      data: {
        code: readCode(input.code, "code"),
        label: readText(input.label, "label"),
        description: readOptionalDescription(input.description),
        status: input.status === undefined ? "active" : this.readActiveStatus(input.status)
      }
    });

    await this.auditLog.record({
      action: "create-role",
      result: "success",
      actorId: actor.id,
      targetEntity: "role",
      targetEntityId: role.id,
      username: actor.username
    });

    return role;
  }

  async updateRole(actor: SafeUserContext, roleId: string, input: RoleInput) {
    const data: {
      code?: string;
      label?: string;
      description?: string;
      status?: string;
    } = {};

    if (input.code !== undefined) {
      data.code = readCode(input.code, "code");
    }
    if (input.label !== undefined) {
      data.label = readText(input.label, "label");
    }
    if (input.description !== undefined) {
      data.description = readOptionalDescription(input.description);
    }
    if (input.status !== undefined) {
      data.status = this.readActiveStatus(input.status);
    }

    const role = await this.prisma.role.update({
      where: { id: roleId },
      data
    });

    await this.auditLog.record({
      action: "update-role",
      result: "success",
      actorId: actor.id,
      targetEntity: "role",
      targetEntityId: role.id,
      username: actor.username
    });

    return role;
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
    const roleCode = readCode(input.roleCode, "roleCode");
    const organizationUnitId = readText(input.organizationUnitId, "organizationUnitId");

    const existing = await this.prisma.user.findUnique({ where: { usernameKey: username } });
    if (existing) {
      throw new BadRequestException({ message: "Tên đăng nhập đã tồn tại." });
    }

    const role = await this.findActiveRole(roleCode);
    const organizationUnit = await this.findActiveOrganizationUnit(organizationUnitId);
    const passwordHash = await this.passwordService.hashPassword(password);

    const user = await this.prisma.user.create({
      data: {
        username,
        usernameKey: username,
        displayName,
        passwordHash,
        status: "active",
        role: role.code,
        roleLabel: role.label,
        unit: organizationUnit.name
      }
    });

    await this.prisma.userRoleAssignment.create({
      data: {
        userId: user.id,
        roleId: role.id,
        isPrimary: true
      }
    });
    await this.prisma.userOrganizationScope.create({
      data: {
        userId: user.id,
        organizationUnitId: organizationUnit.id,
        isPrimary: true
      }
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
        roleCode: role.code,
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
      role?: string;
      roleLabel?: string;
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

    if (input.roleCode !== undefined) {
      const role = await this.findActiveRole(readCode(input.roleCode, "roleCode"));
      data.role = role.code;
      data.roleLabel = role.label;
      await this.prisma.userRoleAssignment.deleteMany({ where: { userId } });
      await this.prisma.userRoleAssignment.create({ data: { userId, roleId: role.id, isPrimary: true } });
      auditEvents.push({
        action: "AUD-ST-1.3-03",
        before: { role: existing.role, roleLabel: existing.roleLabel },
        after: { role: role.code, roleLabel: role.label }
      });
    }

    if (input.organizationUnitId !== undefined) {
      const organizationUnit = await this.findActiveOrganizationUnit(readText(input.organizationUnitId, "organizationUnitId"));
      data.unit = organizationUnit.name;
      await this.prisma.userOrganizationScope.deleteMany({ where: { userId } });
      await this.prisma.userOrganizationScope.create({
        data: { userId, organizationUnitId: organizationUnit.id, isPrimary: true }
      });
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

    const user = await this.prisma.user.update({
      where: { id: userId },
      data
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

  private async findActiveRole(code: string) {
    const role = await this.prisma.role.findUnique({ where: { code } });
    if (!role || role.status !== "active") {
      throw new BadRequestException({ message: "Vai trò không hợp lệ." });
    }

    return role;
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
    role: string;
    roleLabel: string;
    unit: string;
    roleAssignments?: Array<{
      isPrimary: boolean;
      role: {
        id: string;
        code: string;
        label: string;
      };
    }>;
    organizationScopes?: Array<{
      isPrimary: boolean;
      organizationUnit: {
        id: string;
        name: string;
      };
    }>;
  }) {
    const roleAssignment = user.roleAssignments?.find((assignment) => assignment.isPrimary) ?? user.roleAssignments?.[0];
    const organizationScope = user.organizationScopes?.find((scope) => scope.isPrimary) ?? user.organizationScopes?.[0];

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      status: user.status,
      role: user.role,
      roleLabel: user.roleLabel,
      roleCode: roleAssignment?.role.code ?? user.role,
      roleId: roleAssignment?.role.id,
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
