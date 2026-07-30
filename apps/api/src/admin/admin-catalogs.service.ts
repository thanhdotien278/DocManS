import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { readCode, readOptionalText, readText } from "./admin-access.js";

const CATALOG_TYPES = ["research-field", "proposal-type", "priority", "report-type", "scoring-criterion"] as const;

type CatalogInput = {
  type?: unknown;
  code?: unknown;
  name?: unknown;
  description?: unknown;
  status?: unknown;
};

@Injectable()
export class AdminCatalogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService
  ) {}

  async listCatalogItems(type?: unknown) {
    const normalizedType = type === undefined ? undefined : this.readCatalogType(type);

    return this.prisma.catalogItem.findMany({
      where: {
        deletedAt: null,
        ...(normalizedType ? { type: normalizedType } : {})
      },
      orderBy: [{ type: "asc" }, { name: "asc" }]
    });
  }

  async createCatalogItem(actor: SafeUserContext, input: CatalogInput) {
    const data = this.readCatalogInput(input);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const item = await tx.catalogItem.create({ data });

        await this.auditLog.record(
          {
            action: "create-catalog",
            result: "success",
            actorId: actor.id,
            targetEntity: "catalog",
            targetEntityId: item.id,
            username: actor.username
          },
          tx
        );

        return item;
      });
    } catch (error) {
      this.throwCatalogConflict(error);
      throw error;
    }
  }

  async updateCatalogItem(actor: SafeUserContext, itemId: string, input: CatalogInput) {
    if (input.type !== undefined || input.code !== undefined) {
      throw new BadRequestException({ message: "Không được thay đổi loại hoặc mã catalog sau khi tạo." });
    }

    const data: {
      name?: string;
      description?: string;
      status?: string;
    } = {};

    if (input.name !== undefined) {
      data.name = readText(input.name, "name");
    }
    if (input.description !== undefined) {
      data.description = readOptionalText(input.description, "description");
    }
    if (input.status !== undefined) {
      data.status = this.readStatus(input.status);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException({ message: "Cần ít nhất một trường cập nhật." });
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.catalogItem.updateMany({
          where: { id: itemId, deletedAt: null },
          data
        });
        if (updated.count === 0) {
          throw new NotFoundException({ message: "Không tìm thấy catalog." });
        }

        const item = await tx.catalogItem.findUnique({ where: { id: itemId } });
        if (!item) {
          throw new NotFoundException({ message: "Không tìm thấy catalog." });
        }

        await this.auditLog.record(
          {
            action: "update-catalog",
            result: "success",
            actorId: actor.id,
            targetEntity: "catalog",
            targetEntityId: item.id,
            username: actor.username
          },
          tx
        );

        return item;
      });
    } catch (error) {
      this.throwCatalogConflict(error);
      throw error;
    }
  }

  async softDeleteCatalogItem(actor: SafeUserContext, itemId: string) {
    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.catalogItem.updateMany({
        where: { id: itemId, deletedAt: null },
        data: {
          deletedAt: new Date(),
          status: "archived"
        }
      });
      if (deleted.count === 0) {
        throw new NotFoundException({ message: "Không tìm thấy catalog." });
      }

      const item = await tx.catalogItem.findUnique({ where: { id: itemId } });
      if (!item) {
        throw new NotFoundException({ message: "Không tìm thấy catalog." });
      }

      await this.auditLog.record(
        {
          action: "soft-delete-catalog",
          result: "success",
          actorId: actor.id,
          targetEntity: "catalog",
          targetEntityId: item.id,
          username: actor.username
        },
        tx
      );

      return item;
    });
  }

  private readCatalogInput(input: CatalogInput) {
    return {
      type: this.readCatalogType(input.type),
      code: readCode(input.code, "code"),
      name: readText(input.name, "name"),
      description: readOptionalText(input.description, "description"),
      status: input.status === undefined ? "active" : this.readStatus(input.status)
    };
  }

  private readCatalogType(value: unknown) {
    const type = readCode(value, "type");
    if (!CATALOG_TYPES.includes(type as (typeof CATALOG_TYPES)[number])) {
      throw new BadRequestException({ message: "Loại catalog không hợp lệ." });
    }

    return type;
  }

  private readStatus(value: unknown) {
    const status = readText(value, "status", 40);
    if (status !== "active" && status !== "inactive" && status !== "archived") {
      throw new BadRequestException({ message: "Trạng thái catalog không hợp lệ." });
    }

    return status;
  }

  private throwCatalogConflict(error: unknown): never | void {
    if ((error as { code?: string })?.code === "P2002") {
      throw new BadRequestException({ message: "Mã catalog đã tồn tại trong loại catalog này." });
    }
  }
}
