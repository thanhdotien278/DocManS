import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import { validateNewPassword } from "../auth/password-request.pipe.js";
import { PasswordService } from "../auth/password.service.js";
import { AuthService } from "../auth/auth.service.js";
import { SYSTEM_ROLES, type SafeUserContext, type SystemRole } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { findPosition, inferUnitType, isUnitType, positionDisplay, UNIT_POSITIONS, UNIT_TYPE_LABELS, UNIT_TYPES } from "../organization/unit-positions.js";
import { formatResearcherDisplayName } from "../researcher-profiles/researcher-display-name.js";
import { readCode, readText } from "./admin-access.js";

const MAX_POSITIONS_PER_USER = 10;
const POSITION_INCLUDE = { unitPositions: { include: { organizationUnit: { select: { id: true, name: true, unitType: true, status: true } } }, orderBy: { createdAt: "asc" as const } } };

type CreateUserInput = {
  username?: unknown;
  displayName?: unknown;
  password?: unknown;
  systemRole?: unknown;
  organizationUnitId?: unknown;
  credentialEmail?: unknown;
};

type UpdateUserInput = {
  displayName?: unknown;
  systemRole?: unknown;
  organizationUnitId?: unknown;
  status?: unknown;
  credentialEmail?: unknown;
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
  unitType?: unknown;
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
        organizationScopes: { include: { organizationUnit: true } },
        ...POSITION_INCLUDE
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

  async listOrganizationUnits(options: { includeInactive?: boolean } = {}) {
    const units = (await this.prisma.organizationUnit.findMany({
      where: options.includeInactive ? {} : { status: "active" },
      include: { unitPositions: { include: { user: { select: { id: true, displayName: true, status: true } } }, orderBy: { createdAt: "asc" } } },
      orderBy: [{ status: "asc" }, { name: "asc" }]
    } as never)) as unknown as Array<{ unitType?: string; name?: string; unitPositions?: Array<{ userId: string; positionCode: string; user: { displayName: string; status: string } }> } & Record<string, unknown>>;
    return units.map(({ unitPositions, ...unit }) => {
      const unitType = unit.unitType ?? inferUnitType(String(unit.name ?? ""));
      return {
        ...unit,
        unitType,
        unitTypeLabel: isUnitType(unitType) ? UNIT_TYPE_LABELS[unitType] : unitType,
        positions: (unitPositions ?? []).map((position) => ({
          userId: position.userId,
          displayName: position.user.displayName,
          userStatus: position.user.status,
          positionCode: position.positionCode,
          label: findPosition(unitType, position.positionCode)?.label ?? position.positionCode
        }))
      };
    });
  }

  /** Danh mục loại đơn vị và chức danh của từng loại (cho giao diện quản trị). */
  listPositionCatalog() {
    return UNIT_TYPES.map((type) => ({ code: type, label: UNIT_TYPE_LABELS[type], positions: UNIT_POSITIONS[type] }));
  }

  /**
   * Gán chức danh cho tài khoản (thay toàn bộ danh sách). Mỗi đơn vị một chức danh; được kiêm nhiệm nhiều đơn
   * vị; chức danh phải đúng loại đơn vị và còn chỗ (Viện: 1 Giám đốc, 5 Phó Giám đốc; Phòng/Khoa/Bộ môn: 1 trưởng,
   * 2 phó). Đơn vị được khoá trong giao dịch nên hai lần gán đồng thời không vượt số lượng.
   */
  async setUserPositions(actor: SafeUserContext, userId: string, input: { positions?: unknown }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ message: "Không tìm thấy người dùng." });
    if (!Array.isArray(input.positions) || input.positions.length > MAX_POSITIONS_PER_USER) {
      throw new BadRequestException({ message: `Danh sách chức danh không hợp lệ (tối đa ${MAX_POSITIONS_PER_USER}).` });
    }
    const requested = new Map<string, string>();
    for (const raw of input.positions as unknown[]) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new BadRequestException({ message: "Chức danh không hợp lệ." });
      const item = raw as Record<string, unknown>;
      const organizationUnitId = readText(item.organizationUnitId, "organizationUnitId", 80);
      const positionCode = readText(item.positionCode, "positionCode", 40);
      if (requested.has(organizationUnitId)) throw new BadRequestException({ message: "Mỗi đơn vị chỉ giữ một chức danh." });
      requested.set(organizationUnitId, positionCode);
    }

    const before = await this.prisma.unitPosition.findMany({ where: { userId }, select: { organizationUnitId: true, positionCode: true } });
    await this.prisma.$transaction(async (tx) => {
      for (const [organizationUnitId, positionCode] of requested) {
        await tx.$queryRaw`SELECT id FROM organization_units WHERE id = ${organizationUnitId} FOR UPDATE`;
        const unit = await tx.organizationUnit.findUnique({ where: { id: organizationUnitId } });
        if (!unit || unit.status !== "active") throw new BadRequestException({ message: "Đơn vị không hợp lệ hoặc đã ngừng hoạt động." });
        const position = findPosition(unit.unitType, positionCode);
        if (!position) {
          throw new BadRequestException({ message: `Chức danh không áp dụng cho ${isUnitType(unit.unitType) ? UNIT_TYPE_LABELS[unit.unitType] : "đơn vị"} "${unit.name}".` });
        }
        const holders = await tx.unitPosition.count({ where: { organizationUnitId, positionCode, userId: { not: userId } } });
        if (holders >= position.max) {
          throw new ConflictException({ code: "POSITION_FULL", message: `${unit.name} đã đủ ${position.max} ${position.label}.` });
        }
      }
      await tx.unitPosition.deleteMany({ where: { userId } });
      for (const [organizationUnitId, positionCode] of requested) {
        await tx.unitPosition.create({ data: { organizationUnitId, userId, positionCode, assignedById: actor.id } });
      }
    });

    await this.auditLog.record({
      action: "set-user-unit-positions",
      result: "success",
      actorId: actor.id,
      targetEntity: "user",
      targetEntityId: userId,
      username: actor.username,
      reason: safeAuditContext({ before, after: [...requested].map(([organizationUnitId, positionCode]) => ({ organizationUnitId, positionCode })) })
    });

    const updated = await this.prisma.user.findUnique({ where: { id: userId }, include: { organizationScopes: { include: { organizationUnit: true } }, ...POSITION_INCLUDE } });
    return this.toUserResponse(updated!);
  }

  async createOrganizationUnit(actor: SafeUserContext, input: OrganizationUnitInput) {
    const name = readText(input.name, "name");
    const unit = await this.prisma.organizationUnit.create({
      data: {
        code: readCode(input.code, "code"),
        name,
        parentId: input.parentId === undefined ? undefined : readOptionalDescription(input.parentId, 80),
        status: input.status === undefined ? "active" : this.readActiveStatus(input.status),
        unitType: input.unitType === undefined ? inferUnitType(name) : this.readUnitType(input.unitType)
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
      unitType?: string;
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
    if (input.unitType !== undefined) {
      data.unitType = this.readUnitType(input.unitType);
      // Đổi loại đơn vị không được làm chức danh đang có mất nghĩa (ví dụ Viện → Khoa khi đang có Giám đốc).
      const held = this.prisma.unitPosition
        ? await this.prisma.unitPosition.findMany({ where: { organizationUnitId: unitId }, select: { positionCode: true } })
        : [];
      if (held.some((position) => !findPosition(data.unitType!, position.positionCode))) {
        throw new BadRequestException({ message: "Đơn vị đang có người giữ chức danh không thuộc loại mới. Gỡ các chức danh đó trước khi đổi loại đơn vị." });
      }
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
    const password = validateNewPassword(input.password);
    const systemRole = this.readSystemRole(input.systemRole);
    this.assertNotStudentRole(systemRole);
    const organizationUnitId = readText(input.organizationUnitId, "organizationUnitId");

    const existing = await this.prisma.user.findUnique({ where: { usernameKey: username } });
    if (existing) {
      throw new BadRequestException({ message: "Tên đăng nhập đã tồn tại." });
    }
    const credentialEmail = input.credentialEmail === undefined ? null : await this.readCredentialEmail(input.credentialEmail);

    const organizationUnit = await this.findActiveOrganizationUnit(organizationUnitId);
    if (systemRole === "RESEARCH_BOARD_HEAD") await this.assertNoOtherActiveBoardHead();
    const passwordHash = await this.passwordService.hashPassword(password);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username,
          usernameKey: username,
          displayName,
          passwordHash,
          // The administrator knows this password, so the owner must replace it at first login.
          mustChangePassword: true,
          status: "active",
          systemRole,
          credentialEmail,
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
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        researcherProfile: {
          select: {
            fullName: true,
            militaryRank: true,
            academicRankCatalogItem: { select: { code: true, name: true } },
            academicDegreeCatalogItem: { select: { code: true, name: true } }
          }
        }
      }
    });
    if (!existing) {
      throw new NotFoundException({ message: "Không tìm thấy người dùng." });
    }

    const data: {
      displayName?: string;
      status?: string;
      systemRole?: string;
      unit?: string;
      credentialEmail?: string | null;
    } = {};

    if (input.displayName !== undefined) {
      data.displayName = readText(input.displayName, "displayName");
      // Tài khoản đã liên kết lý lịch khoa học: tên hiển thị luôn lấy theo lý lịch khoa học.
      if (existing.researcherProfile) {
        const expectedName = formatResearcherDisplayName(existing.researcherProfile);
        if (data.displayName !== expectedName && data.displayName !== existing.displayName) {
          throw new BadRequestException({ message: "Tên hiển thị lấy theo họ tên trong lý lịch khoa học; hãy sửa họ tên trong lý lịch." });
        }
        if (data.displayName === existing.displayName) {
          data.displayName = expectedName;
        }
      }
    }

    const auditEvents: Array<{ action: string; before: unknown; after: unknown }> = [];
    let newRole: SystemRole | undefined;

    if (input.status !== undefined) {
      // Tài khoản tự đăng ký chỉ được kích hoạt hoặc từ chối qua luồng duyệt đăng ký (tạo hồ sơ, gán đơn vị).
      if (existing.status === "pending_approval" || existing.status === "pending_email_verification") {
        throw new ConflictException({ message: "Tài khoản đang chờ duyệt đăng ký; hãy xử lý tại mục Yêu cầu đăng ký." });
      }
      const status = this.readUserStatus(input.status);
      data.status = status;
      auditEvents.push({
        action: status === "active" ? "AUD-ST-1.3-06" : "AUD-ST-1.3-05",
        before: { status: existing.status },
        after: { status }
      });
    }

    if (input.systemRole !== undefined) {
      newRole = this.readSystemRole(input.systemRole);
      if (newRole !== existing.systemRole) {
        this.assertNotStudentRole(newRole);
        this.assertNotStudentRole(existing.systemRole);
      }
      data.systemRole = newRole;
    }

    const organizationUnit =
      input.organizationUnitId === undefined
        ? undefined
        : await this.findActiveOrganizationUnit(readText(input.organizationUnitId, "organizationUnitId"));

    if (newRole) {
      auditEvents.push({
        action: "AUD-ST-1.3-03",
        before: { systemRole: existing.systemRole },
        after: { systemRole: newRole, ...(organizationUnit ? { organizationUnitId: organizationUnit.id } : {}) }
      });
    }

    const resultingRole = newRole ?? existing.systemRole;
    const resultingStatus = data.status ?? existing.status;
    if (resultingRole === "RESEARCH_BOARD_HEAD" && resultingStatus === "active") {
      await this.assertNoOtherActiveBoardHead(userId);
    }
    if (existing.systemRole === "SYSTEM_ADMIN" && existing.status === "active" && (resultingRole !== "SYSTEM_ADMIN" || resultingStatus !== "active")) {
      const otherAdmin = await this.prisma.user.findFirst({ where: { systemRole: "SYSTEM_ADMIN", status: "active", id: { not: userId } }, select: { id: true } });
      if (!otherAdmin) throw new ConflictException({ message: "Không thể hạ quyền hoặc vô hiệu quản trị viên hệ thống đang hoạt động cuối cùng." });
    }

    if (input.credentialEmail !== undefined) {
      const credentialEmail = await this.readCredentialEmail(input.credentialEmail, userId);
      if (credentialEmail !== existing.credentialEmail) {
        data.credentialEmail = credentialEmail;
        // Thư công vụ nhận mã xác thực hai lớp và đăng nhập được bằng thư: đổi thư luôn ghi nhật ký.
        auditEvents.push({ action: "admin-user-email-change", before: { credentialEmail: existing.credentialEmail }, after: { credentialEmail } });
      }
    }

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
        data,
        include: {
          organizationScopes: { include: { organizationUnit: true } },
          ...POSITION_INCLUDE
        }
      });

      // QT đã phân loại vai trò: bỏ tài khoản khỏi báo cáo migration 7 → 10 vai trò.
      if (newRole) await tx.systemRoleMigrationIssue.deleteMany({ where: { userId } });

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

  // TB chỉ có một người giữ; unique index users_single_active_board_head là chốt cuối khi tranh chấp đồng thời.
  private async assertNoOtherActiveBoardHead(exceptUserId?: string) {
    const other = await this.prisma.user.findFirst({
      where: { systemRole: "RESEARCH_BOARD_HEAD", status: "active", ...(exceptUserId ? { id: { not: exceptUserId } } : {}) },
      select: { id: true }
    });
    if (other) {
      throw new ConflictException({ message: "Đã có tài khoản active giữ vai trò Trưởng ban; chỉ một người được giữ vai trò này." });
    }
  }

  private readSystemRole(value: unknown): SystemRole {
    const systemRole = readText(value, "systemRole", 80);
    if (!SYSTEM_ROLES.includes(systemRole as SystemRole)) {
      throw new BadRequestException({ message: "Vai trò hệ thống không hợp lệ." });
    }

    return systemRole as SystemRole;
  }

  /** Tài khoản Sinh viên chỉ sinh ra từ tự đăng ký (kèm hồ sơ sinh viên); không đổi vai trò qua lại. */
  private assertNotStudentRole(systemRole: string | null) {
    if (systemRole === "STUDENT_USER") throw new BadRequestException({ message: "Tài khoản Sinh viên do sinh viên tự đăng ký; không tạo hoặc đổi vai trò tại đây." });
  }

  private toRoleLabel(systemRole: SystemRole) {
    return systemRole === "STUDENT_USER"
      ? "Sinh viên"
      : systemRole === "SYSTEM_ADMIN"
      ? "Quản trị hệ thống"
      : systemRole === "RESEARCH_MANAGEMENT_STAFF"
        ? "Chuyên viên quản lý khoa học"
        : systemRole === "RESEARCH_MANAGEMENT_HEAD"
          ? "Trưởng phòng quản lý khoa học"
        : systemRole === "RESEARCH_MANAGEMENT_DEPUTY_HEAD"
          ? "Phó phòng KHQS"
        : systemRole === "RESEARCH_BOARD_HEAD"
          ? "Trưởng ban QLKH"
        : systemRole === "SCIENCE_DEPUTY_DIRECTOR"
          ? "Phó Giám đốc phụ trách Khoa học"
        : systemRole === "LEADERSHIP_APPROVAL_AUTHORITY"
          ? "Lãnh đạo phê duyệt"
          : systemRole === "RESEARCH_OVERSIGHT_AUTHORITY"
            ? "Lãnh đạo giám sát nghiên cứu"
          : systemRole === "RESEARCHER_INTERNAL_USER"
            ? "Người dùng nghiên cứu nội bộ"
            : "Nhà nghiên cứu bên ngoài";
  }

  private async findActiveOrganizationUnit(id: string) {
    const organizationUnit = await this.prisma.organizationUnit.findUnique({ where: { id } });
    if (!organizationUnit || organizationUnit.status !== "active") {
      throw new BadRequestException({ message: "Đơn vị không hợp lệ." });
    }

    return organizationUnit;
  }

  private readUnitType(value: unknown) {
    if (!isUnitType(value)) throw new BadRequestException({ message: "Loại đơn vị không hợp lệ." });
    return value;
  }

  private readActiveStatus(value: unknown) {
    const status = readText(value, "status", 40);
    if (status !== "active" && status !== "inactive") {
      throw new BadRequestException({ message: "Trạng thái không hợp lệ." });
    }

    return status;
  }

  /** Thư công vụ: đăng nhập được bằng thư và nhận mã xác thực hai lớp, nên không được trùng tài khoản khác. */
  private async readCredentialEmail(value: unknown, userId?: string) {
    const email = readText(value, "credentialEmail", 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException({ message: "Thư công vụ không hợp lệ." });
    const owner = await this.prisma.user.findUnique({ where: { credentialEmail: email }, select: { id: true } });
    if (owner && owner.id !== userId) throw new BadRequestException({ message: "Thư công vụ đã được dùng cho tài khoản khác." });
    return email;
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
    username: string | null;
    displayName: string;
    status: string;
    systemRole: string | null;
    unit: string;
    credentialEmail?: string | null;
    organizationScopes?: Array<{
      isPrimary: boolean;
      organizationUnit: {
        id: string;
        name: string;
      };
    }>;
    unitPositions?: Array<{ organizationUnitId: string; positionCode: string; organizationUnit: { name: string; unitType: string } }>;
  }) {
    const organizationScope = user.organizationScopes?.find((scope) => scope.isPrimary) ?? user.organizationScopes?.[0];

    return {
      id: user.id,
      username: user.username ?? "",
      displayName: user.displayName,
      status: user.status,
      systemRole: user.systemRole,
      unit: user.unit,
      credentialEmail: user.credentialEmail ?? null,
      organizationUnitId: organizationScope?.organizationUnit.id,
      positions: (user.unitPositions ?? []).map((position) => ({
        organizationUnitId: position.organizationUnitId,
        unitName: position.organizationUnit.name,
        positionCode: position.positionCode,
        label: positionDisplay(position.organizationUnit.unitType, position.positionCode, position.organizationUnit.name)
      }))
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
