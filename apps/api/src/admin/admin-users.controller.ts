import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { assertSystemAdmin, type RequestWithCurrentUser } from "./admin-access.js";
import { adminRequestPipe } from "./admin-request.pipe.js";
import { AdminUsersService } from "./admin-users.service.js";

const createUserPipe = adminRequestPipe({
  username: { maxLength: 80 },
  displayName: { maxLength: 160 },
  password: { maxLength: 256 },
  roleCode: { maxLength: 80 },
  organizationUnitId: { maxLength: 80 }
});
const updateUserPipe = adminRequestPipe({
  displayName: { maxLength: 160, optional: true },
  roleCode: { maxLength: 80, optional: true },
  organizationUnitId: { maxLength: 80, optional: true },
  status: { maxLength: 40, optional: true }
});
const updateUserStatusPipe = adminRequestPipe({ status: { maxLength: 40 } });
const createRolePipe = adminRequestPipe({
  code: { maxLength: 80 },
  label: { maxLength: 160 },
  description: { maxLength: 240, optional: true },
  status: { maxLength: 40, optional: true }
});
const updateRolePipe = adminRequestPipe({
  code: { maxLength: 80, optional: true },
  label: { maxLength: 160, optional: true },
  description: { maxLength: 240, optional: true },
  status: { maxLength: 40, optional: true }
});
const createOrganizationUnitPipe = adminRequestPipe({
  code: { maxLength: 80 },
  name: { maxLength: 160 },
  parentId: { maxLength: 80, optional: true },
  status: { maxLength: 40, optional: true }
});
const updateOrganizationUnitPipe = adminRequestPipe({
  code: { maxLength: 80, optional: true },
  name: { maxLength: 160, optional: true },
  parentId: { maxLength: 80, optional: true },
  status: { maxLength: 40, optional: true }
});

@Controller("api/v1/users")
@UseGuards(SessionAuthGuard)
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  async listUsers(@Req() request: RequestWithCurrentUser) {
    assertSystemAdmin(request.currentUser);
    return { users: await this.usersService.listUsers() };
  }

  @Post()
  async createUser(@Req() request: RequestWithCurrentUser, @Body(createUserPipe) body: Record<string, unknown>) {
    const actor = assertSystemAdmin(request.currentUser);
    return { user: await this.usersService.createUser(actor, body as Record<string, unknown>) };
  }

  @Patch(":id")
  async updateUser(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(updateUserPipe) body: Record<string, unknown>) {
    const actor = assertSystemAdmin(request.currentUser);
    return { user: await this.usersService.updateUser(actor, id, body as Record<string, unknown>) };
  }

  @Patch(":id/status")
  async updateUserStatus(
    @Req() request: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body(updateUserStatusPipe) body: Record<string, unknown>
  ) {
    const actor = assertSystemAdmin(request.currentUser);
    return { user: await this.usersService.setUserStatus(actor, id, body?.status) };
  }
}

@Controller("api/v1/roles")
@UseGuards(SessionAuthGuard)
export class AdminRolesController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  async listRoles(@Req() request: RequestWithCurrentUser) {
    assertSystemAdmin(request.currentUser);
    return { roles: await this.usersService.listRoles() };
  }

  @Post()
  async createRole(@Req() request: RequestWithCurrentUser, @Body(createRolePipe) body: Record<string, unknown>) {
    const actor = assertSystemAdmin(request.currentUser);
    return { role: await this.usersService.createRole(actor, body as Record<string, unknown>) };
  }

  @Patch(":id")
  async updateRole(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(updateRolePipe) body: Record<string, unknown>) {
    const actor = assertSystemAdmin(request.currentUser);
    return { role: await this.usersService.updateRole(actor, id, body as Record<string, unknown>) };
  }
}

@Controller("api/v1/organization-units")
@UseGuards(SessionAuthGuard)
export class AdminOrganizationUnitsController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  async listOrganizationUnits(@Req() request: RequestWithCurrentUser) {
    assertSystemAdmin(request.currentUser);
    return { organizationUnits: await this.usersService.listOrganizationUnits() };
  }

  @Post()
  async createOrganizationUnit(@Req() request: RequestWithCurrentUser, @Body(createOrganizationUnitPipe) body: Record<string, unknown>) {
    const actor = assertSystemAdmin(request.currentUser);
    return { organizationUnit: await this.usersService.createOrganizationUnit(actor, body as Record<string, unknown>) };
  }

  @Patch(":id")
  async updateOrganizationUnit(
    @Req() request: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body(updateOrganizationUnitPipe) body: Record<string, unknown>
  ) {
    const actor = assertSystemAdmin(request.currentUser);
    return { organizationUnit: await this.usersService.updateOrganizationUnit(actor, id, body as Record<string, unknown>) };
  }
}
