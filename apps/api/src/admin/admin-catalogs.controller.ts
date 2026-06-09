import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { assertSystemAdmin, type RequestWithCurrentUser } from "./admin-access.js";
import { adminRequestPipe } from "./admin-request.pipe.js";
import { AdminCatalogsService } from "./admin-catalogs.service.js";

const createCatalogPipe = adminRequestPipe({
  type: { maxLength: 80 },
  code: { maxLength: 80 },
  name: { maxLength: 160 },
  description: { maxLength: 240, optional: true },
  status: { maxLength: 40, optional: true }
});
const updateCatalogPipe = adminRequestPipe({
  type: { maxLength: 80, optional: true },
  code: { maxLength: 80, optional: true },
  name: { maxLength: 160, optional: true },
  description: { maxLength: 240, optional: true },
  status: { maxLength: 40, optional: true }
});

@Controller("api/v1/catalogs")
@UseGuards(SessionAuthGuard)
export class AdminCatalogsController {
  constructor(private readonly catalogsService: AdminCatalogsService) {}

  @Get()
  async listCatalogItems(@Req() request: RequestWithCurrentUser, @Query("type") type?: string) {
    assertSystemAdmin(request.currentUser);
    return { items: await this.catalogsService.listCatalogItems(type) };
  }

  @Post()
  async createCatalogItem(@Req() request: RequestWithCurrentUser, @Body(createCatalogPipe) body: Record<string, unknown>) {
    const actor = assertSystemAdmin(request.currentUser);
    return { item: await this.catalogsService.createCatalogItem(actor, body as Record<string, unknown>) };
  }

  @Patch(":id")
  async updateCatalogItem(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(updateCatalogPipe) body: Record<string, unknown>) {
    const actor = assertSystemAdmin(request.currentUser);
    return { item: await this.catalogsService.updateCatalogItem(actor, id, body as Record<string, unknown>) };
  }

  @Delete(":id")
  async softDeleteCatalogItem(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    const actor = assertSystemAdmin(request.currentUser);
    return { item: await this.catalogsService.softDeleteCatalogItem(actor, id) };
  }
}
