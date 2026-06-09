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

  async listUsers() {
    const users = await this.prisma.user.findMany({
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
      action: "create-user",
      result: "success",
      actorId: actor.id,
      targetEntity: "user",
      targetEntityId: user.id,
      username: actor.username
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

    if (input.status !== undefined) {
      const status = readText(input.status, "status", 40);
      if (status !== "active" && status !== "disabled" && status !== "locked") {
        throw new BadRequestException({ message: "Trạng thái người dùng không hợp lệ." });
      }
      data.status = status;
    }

    if (input.roleCode !== undefined) {
      const role = await this.findActiveRole(readCode(input.roleCode, "roleCode"));
      data.role = role.code;
      data.roleLabel = role.label;
      await this.prisma.userRoleAssignment.deleteMany({ where: { userId } });
      await this.prisma.userRoleAssignment.create({ data: { userId, roleId: role.id, isPrimary: true } });
    }

    if (input.organizationUnitId !== undefined) {
      const organizationUnit = await this.findActiveOrganizationUnit(readText(input.organizationUnitId, "organizationUnitId"));
      data.unit = organizationUnit.name;
      await this.prisma.userOrganizationScope.deleteMany({ where: { userId } });
      await this.prisma.userOrganizationScope.create({
        data: { userId, organizationUnitId: organizationUnit.id, isPrimary: true }
      });
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data
    });

    await this.auditLog.record({
      action: "update-user",
      result: "success",
      actorId: actor.id,
      targetEntity: "user",
      targetEntityId: user.id,
      username: actor.username
    });

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

  private toUserResponse(user: {
    id: string;
    username: string;
    displayName: string;
    status: string;
    role: string;
    roleLabel: string;
    unit: string;
  }) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      status: user.status,
      role: user.role,
      roleLabel: user.roleLabel,
      unit: user.unit
    };
  }
}

function readOptionalDescription(value: unknown, maxLength = 500) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return readText(value, "description", maxLength);
}
