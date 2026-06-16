import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { Readable } from "node:stream";
import { AuditLogService } from "../../auth/audit-log.service.js";
import type { SafeUserContext } from "../../auth/auth.types.js";
import type { ObjectStorage } from "../../infrastructure/minio/minio-object-storage.service.js";
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js";
import { assertCanEditProposalDraft, assertCanReadProposal, assertHasOrganizationScope } from "../../proposals-shared/proposal-access.js";
import { RESEARCH_PROPOSAL_ENTITY_TYPE } from "./files.dto.js";

type FileRecord = {
  id: string;
  relatedEntityType: string;
  relatedEntityId: string;
  filePurpose: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  storageBucket: string;
  storageObjectKey: string;
  uploadedById: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type ProposalRecord = {
  id: string;
  ownerId: string;
  hostOrganizationUnitId: string;
  status: string;
};

const MIME_TYPES_BY_EXTENSION: Record<string, string[]> = {
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".pdf": ["application/pdf"],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
};

export type FileModuleConfig = {
  allowedExtensions: string[];
  maxFileSizeBytes: number;
  bucketName?: string;
};

export type FileUploadInput = {
  relatedEntityType: string;
  relatedEntityId: string;
  filePurpose: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  content: Buffer;
};

function defaultFileConfig(): FileModuleConfig {
  const allowedExtensions = (process.env.FILE_ALLOWED_EXTENSIONS ?? ".doc,.docx,.pdf,.xls,.xlsx")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const maxFileSizeBytes = Number(process.env.FILE_MAX_UPLOAD_BYTES ?? 10 * 1024 * 1024);
  return {
    allowedExtensions,
    maxFileSizeBytes: Number.isFinite(maxFileSizeBytes) && maxFileSizeBytes > 0 ? maxFileSizeBytes : 10 * 1024 * 1024,
    bucketName: process.env.MINIO_BUCKET_NAME
  };
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorage: ObjectStorage,
    private readonly auditLog: AuditLogService,
    private readonly config: FileModuleConfig = defaultFileConfig()
  ) {}

  async uploadFile(actor: SafeUserContext, input: FileUploadInput) {
    this.assertSupportedEntity(input.relatedEntityType);
    this.assertUploadInput(input);
    await this.assertCanUpload(actor, input.relatedEntityType, input.relatedEntityId);

    const objectKey = this.createObjectKey(input);
    await this.objectStorage.putObject({
      objectKey,
      content: input.content,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes
    });

    let record: FileRecord;
    try {
      record = (await this.prisma.fileRecord.create({
        data: {
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          filePurpose: input.filePurpose,
          originalFileName: input.fileName,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          storageBucket: this.config.bucketName ?? "rtms-files",
          storageObjectKey: objectKey,
          uploadedById: actor.id,
          status: "active"
        } as never
      })) as FileRecord;
    } catch (error) {
      await this.objectStorage.deleteObject?.(objectKey);
      throw error;
    }

    await this.auditLog.record({
      action: "upload-file",
      result: "success",
      actorId: actor.id,
      targetEntity: "file-record",
      targetEntityId: record.id,
      username: actor.username,
      reason: `${record.relatedEntityType}:${record.relatedEntityId}`
    });

    return this.toFileResponse(record);
  }

  async listFiles(actor: SafeUserContext, input: { relatedEntityType: string; relatedEntityId: string }) {
    this.assertSupportedEntity(input.relatedEntityType);
    await this.assertCanRead(actor, input.relatedEntityType, input.relatedEntityId);
    const records = (await this.prisma.fileRecord.findMany({
      where: {
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        status: "active",
        deletedAt: null
      },
      orderBy: { createdAt: "asc" }
    })) as FileRecord[];
    return records.map((record) => this.toFileResponse(record));
  }

  async downloadFile(actor: SafeUserContext, fileId: string) {
    const record = await this.findActiveFile(fileId);
    await this.assertCanRead(actor, record.relatedEntityType, record.relatedEntityId);
    const content = await this.objectStorage.getObject(record.storageObjectKey);

    await this.auditLog.record({
      action: "download-file",
      result: "success",
      actorId: actor.id,
      targetEntity: "file-record",
      targetEntityId: record.id,
      username: actor.username,
      reason: `${record.relatedEntityType}:${record.relatedEntityId}`
    });

    return {
      ...this.toFileResponse(record),
      content
    };
  }

  private assertUploadInput(input: FileUploadInput) {
    const extension = path.extname(input.fileName).toLowerCase();
    if (!this.config.allowedExtensions.includes(extension)) {
      throw new BadRequestException({ message: "Định dạng tệp không được hỗ trợ." });
    }
    const allowedMimeTypes = MIME_TYPES_BY_EXTENSION[extension];
    if (allowedMimeTypes && !allowedMimeTypes.includes(input.mimeType)) {
      throw new BadRequestException({ message: "MIME type của tệp không khớp định dạng cho phép." });
    }
    if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > this.config.maxFileSizeBytes) {
      throw new BadRequestException({ message: "Dung lượng tệp vượt quá giới hạn cho phép." });
    }
    if (input.content.length !== input.sizeBytes) {
      throw new BadRequestException({ message: "Dung lượng tệp không khớp nội dung tải lên." });
    }
  }

  private assertSupportedEntity(relatedEntityType: string) {
    if (relatedEntityType !== RESEARCH_PROPOSAL_ENTITY_TYPE) {
      throw new BadRequestException({ message: "Loại thực thể liên kết chưa được hỗ trợ." });
    }
  }

  private async assertCanUpload(actor: SafeUserContext, relatedEntityType: string, relatedEntityId: string) {
    const proposal = await this.findRelatedProposal(relatedEntityType, relatedEntityId);
    assertCanEditProposalDraft(actor, proposal);
    assertHasOrganizationScope(actor, proposal.hostOrganizationUnitId);
    if (proposal.status !== "draft") {
      throw new ForbiddenException({ message: "Hồ sơ không còn cho phép tải tệp." });
    }
  }

  private async assertCanRead(actor: SafeUserContext, relatedEntityType: string, relatedEntityId: string) {
    const proposal = await this.findRelatedProposal(relatedEntityType, relatedEntityId);
    assertCanReadProposal(actor, proposal);
  }

  private async findRelatedProposal(relatedEntityType: string, relatedEntityId: string) {
    if (relatedEntityType !== RESEARCH_PROPOSAL_ENTITY_TYPE) {
      throw new BadRequestException({ message: "Loại thực thể liên kết chưa được hỗ trợ." });
    }
    const proposal = (await this.prisma.researchProposal.findUnique({
      where: { id: relatedEntityId }
    })) as ProposalRecord | null;
    if (!proposal) {
      throw new NotFoundException({ message: "Không tìm thấy thực thể liên kết." });
    }
    return proposal;
  }

  private async findActiveFile(fileId: string) {
    const record = (await this.prisma.fileRecord.findUnique({
      where: { id: fileId }
    })) as FileRecord | null;
    if (!record || record.status !== "active" || record.deletedAt) {
      throw new NotFoundException({ message: "Không tìm thấy tệp." });
    }
    return record;
  }

  private createObjectKey(input: FileUploadInput) {
    const sanitizedName = input.fileName.replace(/[^a-z0-9._-]/gi, "-");
    return `${input.relatedEntityType}/${input.relatedEntityId}/${randomUUID()}-${sanitizedName}`;
  }

  private toFileResponse(record: FileRecord) {
    return {
      id: record.id,
      relatedEntityType: record.relatedEntityType,
      relatedEntityId: record.relatedEntityId,
      proposalId: record.relatedEntityType === RESEARCH_PROPOSAL_ENTITY_TYPE ? record.relatedEntityId : "",
      filePurpose: record.filePurpose,
      requirementCode: record.filePurpose,
      fileName: record.originalFileName,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      uploadedById: record.uploadedById,
      status: record.status,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString()
    };
  }
}

export function streamToBuffer(stream: Readable | Buffer) {
  if (Buffer.isBuffer(stream)) {
    return Promise.resolve(stream);
  }

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}
