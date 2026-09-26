import { joinedTransaction, runProposalMutation } from "../../proposals-shared/proposal-mutation.js";
import { ApprovedProjectsService } from "../../approved-projects/approved-projects.service.js";
import { projectContextVersion } from "../../approved-projects/project-capability-v1.js";
import { ResearchProposalsService } from "../../research-proposals/research-proposals.service.js";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { Readable } from "node:stream";
import { AuditLogService } from "../../auth/audit-log.service.js";
import type { SafeUserContext } from "../../auth/auth.types.js";
import type { ObjectStorage } from "../../infrastructure/minio/minio-object-storage.service.js";
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js";
import { assertHasOrganizationScope, isInternalResearcherEligible } from "../../proposals-shared/proposal-access.js";
import { ProposalManagementOfficerService } from "../../proposals-shared/proposal-management-officer.service.js";
import { ProposalReviewAccessService } from "../../proposals-shared/proposal-review-access.service.js";
import { ProposalParticipationService } from "../../research-proposals/proposal-participation.service.js";
import { APPROVED_PROJECT_ENTITY_TYPE, RESEARCH_PROPOSAL_ENTITY_TYPE } from "./files.dto.js";

type FileRecord = {
  id: string;
  relatedEntityType: string;
  relatedEntityId: string;
  filePurpose: string;
  originalFileName: string;
  description: string | null;
  mimeType: string;
  sizeBytes: number;
  storageBucket: string;
  storageObjectKey: string;
  uploadedById: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  uploadedBy?: {
    displayName: string;
  } | null;
};

type ProposalRecord = {
  id: string;
  ownerId: string;
  createdAt: Date;
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
  contextVersion?: unknown;
  relatedEntityType: string;
  relatedEntityId: string;
  filePurpose: string;
  fileName: string;
  originalFileName?: string;
  description?: string | null;
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
    private readonly participation: ProposalParticipationService,
    private readonly reviewAccess: ProposalReviewAccessService,
    private readonly config: FileModuleConfig = defaultFileConfig(),
    private readonly managementOfficers: ProposalManagementOfficerService = new ProposalManagementOfficerService(prisma)
  ) {}

  private transactional = false;
  private uploadedObjectKey?: string;

  private async mutate<T>(actor: SafeUserContext, proposalId: string, expected: unknown, work: (service: FilesService, actor: SafeUserContext) => Promise<T>): Promise<T> {
    let uploadedKey: string | undefined;
    try {
      return await runProposalMutation(this.prisma, actor, proposalId, expected, async (tx, currentActor) => {
        const service = new FilesService(tx, this.objectStorage, new AuditLogService(tx), new ProposalParticipationService(tx), new ProposalReviewAccessService(tx), this.config, new ProposalManagementOfficerService(tx));
        service.transactional = true;
        try { return await work(service, currentActor); } finally { uploadedKey = service.uploadedObjectKey; }
      });
    } catch (error) {
      if (uploadedKey) await this.objectStorage.deleteObject?.(uploadedKey);
      throw error;
    }
  }

  private async mutateProject<T>(actor: SafeUserContext, projectId: string, expected: unknown, work: (service: FilesService, actor: SafeUserContext) => Promise<T>): Promise<T> {
    let uploadedKey: string | undefined;
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${actor.id} FOR SHARE`;
        await tx.$queryRaw`SELECT id FROM approved_projects WHERE id = ${projectId} FOR UPDATE`;
        const user = await tx.user.findUnique({ where: { id: actor.id }, include: { organizationScopes: { include: { organizationUnit: true } } } });
        const project = await tx.approvedProject.findUnique({ where: { id: projectId } });
        if (!user || user.status !== "active") throw new ForbiddenException({ code: "ACCOUNT_INACTIVE" });
        if (!project) throw new NotFoundException({ message: "Không tìm thấy đề tài." });
        const current = projectContextVersion(project);
        if (!expected || typeof expected !== "object" || Object.entries(current).some(([key, value]) => (expected as Record<string, unknown>)[key] !== value)) throw new ConflictException({ code: "CONTEXT_VERSION_MISMATCH" });
        const currentActor: SafeUserContext = { id: user.id, username: user.username ?? "", displayName: user.displayName, systemRole: user.systemRole as SafeUserContext["systemRole"], unit: user.unit, organizationScopes: user.organizationScopes.filter((scope) => scope.organizationUnit.status === "active").map((scope) => ({ id: scope.organizationUnit.id, code: scope.organizationUnit.code, name: scope.organizationUnit.name })) };
        const scoped = new FilesService(joinedTransaction(tx), this.objectStorage, new AuditLogService(joinedTransaction(tx)), new ProposalParticipationService(joinedTransaction(tx)), new ProposalReviewAccessService(joinedTransaction(tx)), this.config, new ProposalManagementOfficerService(joinedTransaction(tx)));
        scoped.transactional = true;
        try { return await work(scoped, currentActor); } finally { uploadedKey = scoped.uploadedObjectKey; }
      }, { isolationLevel: "Serializable", timeout: 15000 });
    } catch (error) {
      if (uploadedKey) await this.objectStorage.deleteObject?.(uploadedKey);
      throw error;
    }
  }

  async uploadFile(actor: SafeUserContext, input: FileUploadInput): Promise<any> {
    if (!this.transactional && input.relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE) return this.mutateProject(actor, input.relatedEntityId, input.contextVersion, (s, a) => s.uploadFile(a, input));
    if (!this.transactional) return this.mutate(actor, input.relatedEntityId, input.contextVersion, (s, a) => s.uploadFile(a, input));
    this.assertSupportedEntity(input.relatedEntityType);
    const originalFileName = this.readFileName(input.originalFileName ?? input.fileName);
    const description = this.readDescription(input.description);
    this.assertUploadInput({ ...input, fileName: originalFileName });
    await this.assertCanUpload(actor, input.relatedEntityType, input.relatedEntityId);
    if (input.relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE) {
      const project = await new ApprovedProjectsService(this.prisma, this.auditLog).getProject(actor, input.relatedEntityId);
      const isPi = project.viewerAuthorization.viewerRelationships.some((relationship: { type: string }) => relationship.type === "TOPIC_PI");
      if (!isPi && input.filePurpose !== "PROJECT_CONTRIBUTION") throw new ForbiddenException({ code: "ACTION_NOT_GRANTED" });
    }

    const fileId = randomUUID();
    const objectKey = this.createObjectKey({ ...input, fileName: originalFileName }, fileId);
    await this.objectStorage.putObject({
      objectKey,
      content: input.content,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes
    });

    this.uploadedObjectKey = objectKey;
    let record: FileRecord;
    try {
      record = (await this.prisma.$transaction(async (tx) => {
        // Object storage has no transaction with Postgres. Rechecking here ensures a lifecycle
        // change between the initial authorization and metadata write rolls back the usable file.
        await this.assertCanUpload(actor, input.relatedEntityType, input.relatedEntityId);
        return tx.fileRecord.create({
          data: {
            id: fileId,
            relatedEntityType: input.relatedEntityType,
            relatedEntityId: input.relatedEntityId,
            filePurpose: input.filePurpose,
            originalFileName,
            description,
            mimeType: input.mimeType,
            sizeBytes: input.sizeBytes,
            storageBucket: this.config.bucketName ?? "rtms-files",
            storageObjectKey: objectKey,
            uploadedById: actor.id,
            status: "active"
          } as never,
          include: {
            uploadedBy: {
              select: { displayName: true }
            }
          }
        });
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
    if (record.relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE) await this.prisma.projectHistory.create({ data: { projectId: record.relatedEntityId, actorId: actor.id, action: record.filePurpose === "PROJECT_CONTRIBUTION" ? "project.evidence.contribute" : "project.evidence.upload", reason: record.originalFileName, afterFacts: { fileRecordId: record.id, purpose: record.filePurpose } } });

    return this.toFileResponse(record, { canMutate: true });
  }

  async listFiles(actor: SafeUserContext, input: { relatedEntityType: string; relatedEntityId: string }) {
    this.assertSupportedEntity(input.relatedEntityType);
    if (input.relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE) {
      await this.assertCanRead(actor, input.relatedEntityType, input.relatedEntityId);
      const records = await this.prisma.fileRecord.findMany({ where: { relatedEntityType: input.relatedEntityType, relatedEntityId: input.relatedEntityId, status: "active", deletedAt: null }, include: { uploadedBy: { select: { displayName: true } } }, orderBy: { createdAt: "desc" } });
      const project = await new ApprovedProjectsService(this.prisma, this.auditLog).getProject(actor, input.relatedEntityId);
      const fullAccess = project.viewerAuthorization.viewerRelationships.some((relationship: { type: string }) => relationship.type === "TOPIC_PI") || ["SCIENTIFIC_MANAGEMENT_STAFF", "SCIENTIFIC_MANAGEMENT_HEAD"].includes(actor.systemRole);
      return Promise.all(records.filter((record) => fullAccess || record.uploadedById === actor.id).map(async (record) => this.toFileResponse(record, { canMutate: await this.canMutateFile(actor, record) })));
    }
    const proposal = await new ResearchProposalsService(this.prisma, this.auditLog, this.participation, this.reviewAccess, this.managementOfficers).getProposal(actor, input.relatedEntityId);
    return proposal.attachments;
  }

  async downloadFile(actor: SafeUserContext, fileId: string) {
    const record = await this.findActiveFile(fileId);
    await this.assertCanRead(actor, record.relatedEntityType, record.relatedEntityId);
    await this.assertProjectFileOwnership(actor, record, false);
    const canMutate = await this.canMutateFile(actor, record);
    let content: Awaited<ReturnType<ObjectStorage["getObject"]>>;
    try {
      content = await this.objectStorage.getObject(record.storageObjectKey);
    } catch {
      throw new NotFoundException({ message: "Không tìm thấy nội dung tệp." });
    }

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
      ...this.toFileResponse(record, { canMutate }),
      content
    };
  }

  private async assertUnsubmittedFile(record: FileRecord) {
    if (record.relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE) {
      const [report, request] = await Promise.all([
        this.prisma.projectReportEvidence.findFirst({ where: { fileRecordId: record.id } }),
        this.prisma.projectRequestEvidence.findFirst({ where: { fileRecordId: record.id } })
      ]);
      if (report || request) throw new BadRequestException({ code: "EVIDENCE_PINNED", message: "Tệp minh chứng đã nộp được giữ nguyên. Hãy tải lên phiên bản mới." });
      return;
    }
    const events = await this.prisma.proposalSubmissionEvent.findMany({ where: { proposalId: record.relatedEntityId }, select: { snapshot: true } });
    if (events.some((event) => {
      const files = (event.snapshot as { attachments?: Array<{ id: string }> } | null)?.attachments;
      return files?.some((file) => file.id === record.id);
    })) throw new BadRequestException({ message: "Tệp thuộc phiên bản đã nộp được giữ nguyên. Hãy tải lên phiên bản mới." });
  }

  async updateFile(actor: SafeUserContext, fileId: string, input: { description: string | null; contextVersion?: unknown }): Promise<any> {
    if (!this.transactional) { const file = await this.findActiveFile(fileId); return file.relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE ? this.mutateProject(actor, file.relatedEntityId, input.contextVersion, (s, a) => s.updateFile(a, fileId, input)) : this.mutate(actor, file.relatedEntityId, input.contextVersion, (s, a) => s.updateFile(a, fileId, input)); }
    const record = await this.findActiveFile(fileId);
    await this.assertCanUpload(actor, record.relatedEntityType, record.relatedEntityId);
    await this.assertProjectFileOwnership(actor, record, true);
    await this.assertUnsubmittedFile(record);
    const updated = (await this.prisma.fileRecord.update({
      where: { id: fileId },
      data: {
        description: this.readDescription(input.description)
      } as never,
      include: {
        uploadedBy: {
          select: { displayName: true }
        }
      }
    })) as FileRecord;

    await this.auditLog.record({
      action: "update-file-description",
      result: "success",
      actorId: actor.id,
      targetEntity: "file-record",
      targetEntityId: updated.id,
      username: actor.username,
      reason: `${updated.relatedEntityType}:${updated.relatedEntityId}`
    });
    if (updated.relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE) await this.prisma.projectHistory.create({ data: { projectId: updated.relatedEntityId, actorId: actor.id, action: "project.evidence.metadata", afterFacts: { fileRecordId: updated.id, description: updated.description } } });

    return this.toFileResponse(updated, { canMutate: true });
  }

  async deleteFile(actor: SafeUserContext, fileId: string, contextVersion?: unknown): Promise<any> {
    if (!this.transactional) { const file = await this.findActiveFile(fileId); return file.relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE ? this.mutateProject(actor, file.relatedEntityId, contextVersion, (s, a) => s.deleteFile(a, fileId, contextVersion)) : this.mutate(actor, file.relatedEntityId, contextVersion, (s, a) => s.deleteFile(a, fileId, contextVersion)); }
    const record = await this.findActiveFile(fileId);
    await this.assertCanUpload(actor, record.relatedEntityType, record.relatedEntityId);
    await this.assertProjectFileOwnership(actor, record, true);
    await this.assertUnsubmittedFile(record);
    const deleted = (await this.prisma.fileRecord.update({
      where: { id: fileId },
      data: {
        status: "deleted",
        deletedAt: new Date()
      } as never,
      include: {
        uploadedBy: {
          select: { displayName: true }
        }
      }
    })) as FileRecord;

    await this.auditLog.record({
      action: "delete-file",
      result: "success",
      actorId: actor.id,
      targetEntity: "file-record",
      targetEntityId: deleted.id,
      username: actor.username,
      reason: `${deleted.relatedEntityType}:${deleted.relatedEntityId}`
    });
    if (deleted.relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE) await this.prisma.projectHistory.create({ data: { projectId: deleted.relatedEntityId, actorId: actor.id, action: "project.evidence.delete", afterFacts: { fileRecordId: deleted.id } } });

    return this.toFileResponse(deleted, { canMutate: false });
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
    if (![RESEARCH_PROPOSAL_ENTITY_TYPE, APPROVED_PROJECT_ENTITY_TYPE].includes(relatedEntityType)) {
      throw new BadRequestException({ message: "Loại thực thể liên kết chưa được hỗ trợ." });
    }
  }

  private readFileName(value: string) {
    if (typeof value !== "string") {
      throw new BadRequestException({ message: "Tên tệp không hợp lệ." });
    }
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 255) {
      throw new BadRequestException({ message: "Tên tệp không hợp lệ." });
    }
    return trimmed.normalize("NFC");
  }

  private readDescription(value: string | null | undefined) {
    if (value === undefined || value === null) {
      return null;
    }
    if (typeof value !== "string") {
      throw new BadRequestException({ message: "Mô tả tệp không hợp lệ." });
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.length > 500) {
      throw new BadRequestException({ message: "Mô tả tệp không được vượt quá 500 ký tự." });
    }
    return trimmed;
  }

  private async assertCanUpload(actor: SafeUserContext, relatedEntityType: string, relatedEntityId: string) {
    if (relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE) {
      const project = await new ApprovedProjectsService(this.prisma, this.auditLog).getProject(actor, relatedEntityId);
      if (!project.viewerAuthorization.allowedActions.includes("project.evidence.contribute")) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED" });
      return;
    }
    if (relatedEntityType === RESEARCH_PROPOSAL_ENTITY_TYPE && !isInternalResearcherEligible(actor)) {
      throw new ForbiddenException({ message: "Chỉ PI hoặc thư ký nội bộ được tải tệp cho hồ sơ đề xuất." });
    }
    const proposal = await this.findRelatedProposal(relatedEntityType, relatedEntityId);
    assertHasOrganizationScope(actor, proposal.hostOrganizationUnitId);
    if (proposal.status !== "draft" && proposal.status !== "supplement_requested") {
      throw new ForbiddenException({ message: "Hồ sơ không còn cho phép tải tệp." });
    }
    if (proposal.ownerId === actor.id) return;
    const participation = await this.participation.resolveForProposal(actor.id, proposal);
    if (!participation.roles.includes("TOPIC_SECRETARY")) {
      throw new ForbiddenException({ message: "Không có quyền tải tệp cho hồ sơ đề xuất này." });
    }
  }

  private async assertCanRead(actor: SafeUserContext, relatedEntityType: string, relatedEntityId: string) {
    this.assertSupportedEntity(relatedEntityType);
    if (relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE) {
      if (["LEADERSHIP_APPROVAL_AUTHORITY", "RESEARCH_OVERSIGHT_AUTHORITY"].includes(actor.systemRole)) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED" });
      await new ApprovedProjectsService(this.prisma, this.auditLog).getProject(actor, relatedEntityId);
      return;
    }
    await new ResearchProposalsService(this.prisma, this.auditLog, this.participation, this.reviewAccess, this.managementOfficers).getProposal(actor, relatedEntityId);
  }

  private async canMutateEntity(actor: SafeUserContext, relatedEntityType: string, relatedEntityId: string) {
    try {
      await this.assertCanUpload(actor, relatedEntityType, relatedEntityId);
      return true;
    } catch {
      return false;
    }
  }

  private async canMutateFile(actor: SafeUserContext, record: FileRecord) {
    if (!await this.canMutateEntity(actor, record.relatedEntityType, record.relatedEntityId)) return false;
    try { await this.assertProjectFileOwnership(actor, record, true); await this.assertUnsubmittedFile(record); return true; } catch { return false; }
  }

  private async assertProjectFileOwnership(actor: SafeUserContext, record: FileRecord, mutate: boolean) {
    if (record.relatedEntityType !== APPROVED_PROJECT_ENTITY_TYPE) return;
    const project = await new ApprovedProjectsService(this.prisma, this.auditLog).getProject(actor, record.relatedEntityId);
    const isPi = project.viewerAuthorization.viewerRelationships.some((relationship: { type: string }) => relationship.type === "TOPIC_PI");
    const manager = ["SCIENTIFIC_MANAGEMENT_STAFF", "SCIENTIFIC_MANAGEMENT_HEAD"].includes(actor.systemRole);
    if (!isPi && (!manager || mutate) && record.uploadedById !== actor.id) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED" });
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
      where: { id: fileId },
      include: {
        uploadedBy: {
          select: { displayName: true }
        }
      }
    })) as FileRecord | null;
    if (!record || record.status !== "active" || record.deletedAt) {
      throw new NotFoundException({ message: "Không tìm thấy tệp." });
    }
    return record;
  }

  private createObjectKey(input: FileUploadInput, fileId: string) {
    const extension = path.extname(input.fileName).toLowerCase();
    const entityPath = input.relatedEntityType === RESEARCH_PROPOSAL_ENTITY_TYPE ? "research-proposals" : input.relatedEntityType;
    return `${entityPath}/${input.relatedEntityId}/${fileId}/${randomUUID()}${extension}`;
  }

  private toFileResponse(record: FileRecord, options: { canMutate: boolean }) {
    return {
      id: record.id,
      relatedEntityType: record.relatedEntityType,
      relatedEntityId: record.relatedEntityId,
      proposalId: record.relatedEntityType === RESEARCH_PROPOSAL_ENTITY_TYPE ? record.relatedEntityId : "",
      filePurpose: record.filePurpose,
      requirementCode: record.filePurpose,
      fileName: record.originalFileName,
      description: record.description ?? null,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      uploadedById: record.uploadedById,
      uploaderDisplayName: record.uploadedBy?.displayName ?? "",
      status: record.status,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      canEdit: options.canMutate,
      canDelete: options.canMutate
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
