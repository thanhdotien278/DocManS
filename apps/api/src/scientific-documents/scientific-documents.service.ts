import { randomUUID } from "node:crypto";
import path from "node:path";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import type { ObjectStorage } from "../infrastructure/minio/minio-object-storage.service.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { assertValidUpload, defaultFileConfig, readMaxUploadBytes, type FileModuleConfig } from "../modules/files/file-validation.js";
import type {
  CreateScientificDocumentDto,
  QueryScientificDocumentsDto,
  UpdateScientificDocumentDto,
  UploadedDocumentFile
} from "./scientific-documents.dto.js";

const MANAGER_ROLES: string[] = ["RESEARCH_MANAGEMENT_STAFF", "RESEARCH_BOARD_HEAD", "RESEARCH_MANAGEMENT_HEAD", "SYSTEM_ADMIN"];

/** Ngày từ DTO đã kiểm tra: chuỗi rỗng = xoá ngày. */
function toDate(value: string | undefined) {
  return value ? new Date(value) : null;
}

@Injectable()
export class ScientificDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly storage: ObjectStorage,
    private readonly fileConfig: FileModuleConfig = defaultFileConfig()
  ) {}

  private canManage(actor: SafeUserContext) {
    return MANAGER_ROLES.includes(actor.systemRole);
  }

  assertCanManage(actor: SafeUserContext) {
    if (!this.canManage(actor)) {
      throw new ForbiddenException({
        message: "Chỉ nhà quản lý khoa học hoặc quản trị hệ thống mới có quyền quản lý văn bản, biểu mẫu."
      });
    }
  }

  async listDocuments(actor: SafeUserContext, query: QueryScientificDocumentsDto) {
    const where: Record<string, unknown> = {
      deletedAt: null
    };

    if (query.category && query.category !== "ALL") {
      where.category = query.category;
    }

    // Văn bản hết hiệu lực chỉ hiện cho người quản lý; người dùng khác luôn chỉ thấy văn bản đang hiệu lực.
    where.status = query.status && this.canManage(actor) ? query.status : "ACTIVE";

    if (query.search?.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { documentNumber: { contains: searchTerm, mode: "insensitive" } },
        { issuingAuthority: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } }
      ];
    }

    const documents = await this.prisma.scientificDocument.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
            username: true,
            unit: true
          }
        }
      },
      orderBy: [
        { issuedDate: "desc" },
        { createdAt: "desc" }
      ]
    });

    return documents;
  }

  async getDocument(actor: SafeUserContext, id: string) {
    const doc = await this.prisma.scientificDocument.findFirst({
      where: { id, deletedAt: null },
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
            username: true,
            unit: true
          }
        }
      }
    });

    if (!doc) {
      throw new NotFoundException({ message: "Không tìm thấy văn bản hoặc biểu mẫu." });
    }

    return doc;
  }

  async createDocument(
    actor: SafeUserContext,
    dto: CreateScientificDocumentDto,
    file?: UploadedDocumentFile
  ) {
    this.assertCanManage(actor);

    if (!dto.title?.trim()) {
      throw new BadRequestException({ message: "Tiêu đề văn bản không được để trống." });
    }
    if (!dto.documentNumber?.trim()) {
      throw new BadRequestException({ message: "Số hiệu văn bản không được để trống." });
    }
    if (!dto.category?.trim()) {
      throw new BadRequestException({ message: "Phân loại văn bản không được để trống." });
    }
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException({ message: "Vui lòng đính kèm tệp văn bản / biểu mẫu." });
    }

    const docId = randomUUID();
    const stored = await this.storeFile(docId, file);
    const { fileName: safeOriginalName, objectKey } = stored;

    const issuedDate = toDate(dto.issuedDate);
    const effectiveDate = toDate(dto.effectiveDate);

    const created = await this.withObjectCleanup(objectKey, () => this.prisma.scientificDocument.create({
      data: {
        id: docId,
        documentNumber: dto.documentNumber.trim(),
        title: dto.title.trim(),
        category: dto.category.trim(),
        issuingAuthority: dto.issuingAuthority?.trim() || null,
        issuedDate,
        effectiveDate,
        description: dto.description?.trim() || null,
        status: "ACTIVE",
        fileName: safeOriginalName,
        fileSize: file.size,
        mimeType: file.mimetype,
        storageObjectKey: objectKey,
        createdById: actor.id
      },
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
            username: true,
            unit: true
          }
        }
      }
    }));

    await this.auditLog.record({
      action: "create-scientific-document",
      result: "success",
      actorId: actor.id,
      targetEntity: "scientific-document",
      targetEntityId: created.id,
      username: actor.username,
      reason: `Uploaded ${created.category}: ${created.documentNumber}`
    });

    return created;
  }

  async updateDocument(
    actor: SafeUserContext,
    id: string,
    dto: UpdateScientificDocumentDto,
    file?: UploadedDocumentFile
  ) {
    this.assertCanManage(actor);

    const existing = await this.prisma.scientificDocument.findFirst({
      where: { id, deletedAt: null }
    });
    if (!existing) {
      throw new NotFoundException({ message: "Không tìm thấy văn bản để cập nhật." });
    }

    const data: Record<string, unknown> = {};
    if (dto.documentNumber !== undefined) data.documentNumber = dto.documentNumber.trim();
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.category !== undefined) data.category = dto.category.trim();
    if (dto.issuingAuthority !== undefined) data.issuingAuthority = dto.issuingAuthority.trim() || null;
    if (dto.description !== undefined) data.description = dto.description.trim() || null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.issuedDate !== undefined) data.issuedDate = toDate(dto.issuedDate);
    if (dto.effectiveDate !== undefined) data.effectiveDate = toDate(dto.effectiveDate);

    // Tệp mới luôn có khoá riêng: tệp cũ (kể cả cùng tên) vẫn nằm nguyên trên MinIO, không bị ghi đè.
    let newObjectKey: string | null = null;
    if (file && file.buffer && file.buffer.length > 0) {
      const stored = await this.storeFile(existing.id, file);
      newObjectKey = stored.objectKey;
      data.fileName = stored.fileName;
      data.fileSize = file.size;
      data.mimeType = file.mimetype;
      data.storageObjectKey = stored.objectKey;
    }

    const updated = await this.withObjectCleanup(newObjectKey, () => this.prisma.scientificDocument.update({
      where: { id },
      data: data,
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
            username: true,
            unit: true
          }
        }
      }
    }));

    await this.auditLog.record({
      action: "update-scientific-document",
      result: "success",
      actorId: actor.id,
      targetEntity: "scientific-document",
      targetEntityId: updated.id,
      username: actor.username,
      reason: `Updated ${updated.category}: ${updated.documentNumber}${newObjectKey ? ` (thay tệp, bản trước: ${existing.storageObjectKey})` : ""}`
    });

    return updated;
  }

  async deleteDocument(actor: SafeUserContext, id: string) {
    this.assertCanManage(actor);

    const existing = await this.prisma.scientificDocument.findFirst({
      where: { id, deletedAt: null }
    });
    if (!existing) {
      throw new NotFoundException({ message: "Không tìm thấy văn bản để xóa." });
    }

    const deleted = await this.prisma.scientificDocument.update({
      where: { id },
      data: {
        status: "DELETED",
        deletedAt: new Date()
      }
    });

    await this.auditLog.record({
      action: "delete-scientific-document",
      result: "success",
      actorId: actor.id,
      targetEntity: "scientific-document",
      targetEntityId: deleted.id,
      username: actor.username,
      reason: `Deleted ${deleted.category}: ${deleted.documentNumber}`
    });

    return { success: true, id: deleted.id };
  }

  async downloadDocument(actor: SafeUserContext, id: string) {
    const doc = await this.prisma.scientificDocument.findFirst({
      where: { id, deletedAt: null }
    });

    if (!doc) {
      throw new NotFoundException({ message: "Không tìm thấy tệp văn bản." });
    }

    const content = await this.storage.getObject(doc.storageObjectKey);

    await this.auditLog.record({
      action: "download-scientific-document",
      result: "success",
      actorId: actor.id,
      targetEntity: "scientific-document",
      targetEntityId: doc.id,
      username: actor.username,
      reason: `Downloaded ${doc.fileName}`
    });

    return {
      stream: content,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      size: doc.fileSize
    };
  }

  /** Kiểm tra tệp theo quy tắc chung rồi lưu dưới khoá UUID (tên gốc chỉ giữ trong CSDL). */
  private async storeFile(documentId: string, file: UploadedDocumentFile) {
    const fileName = typeof file.originalname === "string" ? file.originalname.trim().normalize("NFC") : "";
    if (!fileName || fileName.length > 255) throw new BadRequestException({ message: "Tên tệp không hợp lệ." });
    // Giới hạn dung lượng QT đặt trong tham số hệ thống, không vượt trần triển khai (cùng quy tắc với FilesService).
    const maxFileSizeBytes = await readMaxUploadBytes(this.prisma, this.fileConfig.maxFileSizeBytes);
    assertValidUpload({ fileName, mimeType: file.mimetype, sizeBytes: file.size, content: file.buffer }, { ...this.fileConfig, maxFileSizeBytes });
    const objectKey = `scientific-documents/${documentId}/${randomUUID()}${path.extname(fileName).toLowerCase()}`;
    await this.storage.putObject({ objectKey, content: file.buffer, mimeType: file.mimetype, sizeBytes: file.size });
    return { fileName, objectKey };
  }

  /** Ghi CSDL lỗi thì xoá object vừa tải lên để không để lại tệp mồ côi. */
  private async withObjectCleanup<T>(objectKey: string | null, write: () => Promise<T>) {
    try {
      return await write();
    } catch (error) {
      if (objectKey) await this.storage.deleteObject?.(objectKey).catch(() => undefined);
      throw error;
    }
  }
}
