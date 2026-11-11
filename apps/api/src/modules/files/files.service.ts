import { isSerializationFailure, joinedTransaction, runProposalMutation } from "../../proposals-shared/proposal-mutation.js";
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
import { isInternalResearcherEligible } from "../../proposals-shared/proposal-access.js";
import { ProposalManagementOfficerService } from "../../proposals-shared/proposal-management-officer.service.js";
import { ProposalReviewAccessService } from "../../proposals-shared/proposal-review-access.service.js";
import { ProposalParticipationService } from "../../research-proposals/proposal-participation.service.js";
import { ACCEPTANCE_DOSSIER_ENTITY_TYPE, APPROVED_PROJECT_ENTITY_TYPE, ETHICS_DOSSIER_ENTITY_TYPE, EVALUATION_FILE_PURPOSES, FUNDING_VOUCHER_PURPOSE, RESEARCH_PROPOSAL_ENTITY_TYPE } from "./files.dto.js";
import { ACCEPTANCE_CONTRIBUTION, ACCEPTANCE_DOSSIER_DRAFT, ACCEPTANCE_FILE_PURPOSES } from "../../approved-projects/acceptance-dossiers.service.js";
import { bumpEthicsProjectContext, ETHICS_DOSSIER_DRAFT, ETHICS_FILE_PURPOSES, ethicsCapabilityError, isOfficerViewer, isPiViewer, resetEthicsCommitment } from "../../approved-projects/ethics-dossiers.service.js";

type FileRecord = {
  id: string;
  relatedEntityType: string;
  relatedEntityId: string;
  filePurpose: string;
  documentType: string;
  version: number;
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
    researcherProfile?: { fullName: string } | null;
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
      if (isSerializationFailure(error)) throw new ConflictException({ code: "CONTEXT_VERSION_MISMATCH", message: "Đề tài đã thay đổi. Vui lòng tải lại và thực hiện lại thao tác." });
      throw error;
    }
  }

  async uploadFile(actor: SafeUserContext, input: FileUploadInput): Promise<any> {
    if (!this.transactional && input.relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE) return this.mutateProject(actor, input.relatedEntityId, input.contextVersion, (s, a) => s.uploadFile(a, input));
    if (!this.transactional && input.relatedEntityType === ETHICS_DOSSIER_ENTITY_TYPE) return this.mutateProject(actor, (await this.findEthicsDossier(input.relatedEntityId)).projectId, input.contextVersion, (s, a) => s.uploadFile(a, input));
    if (!this.transactional && input.relatedEntityType === ACCEPTANCE_DOSSIER_ENTITY_TYPE) return this.mutateProject(actor, (await this.findAcceptanceDossier(input.relatedEntityId)).projectId, input.contextVersion, (s, a) => s.uploadFile(a, input));
    if (!this.transactional) return this.mutate(actor, input.relatedEntityId, input.contextVersion, (s, a) => s.uploadFile(a, input));
    this.assertSupportedEntity(input.relatedEntityType);
    const originalFileName = this.readFileName(input.originalFileName ?? input.fileName);
    const description = this.readDescription(input.description);
    this.assertUploadInput({ ...input, fileName: originalFileName });
    await this.assertCanUpload(actor, input.relatedEntityType, input.relatedEntityId, input.filePurpose);
    if (input.relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE) {
      const project = await new ApprovedProjectsService(this.prisma, this.auditLog).getProject(actor, input.relatedEntityId);
      const isPi = project.viewerAuthorization.viewerRelationships.some((relationship: { type: string }) => relationship.type === "TOPIC_PI");
      if (!isPi && input.filePurpose !== "PROJECT_CONTRIBUTION" && input.filePurpose !== FUNDING_VOUCHER_PURPOSE) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED" });
    }
    if (input.relatedEntityType === ETHICS_DOSSIER_ENTITY_TYPE && !ETHICS_FILE_PURPOSES.includes(input.filePurpose)) throw new BadRequestException({ code: "FILE_PURPOSE_INVALID", message: "Loại tệp hồ sơ đạo đức không hợp lệ." });
    if (input.relatedEntityType === ACCEPTANCE_DOSSIER_ENTITY_TYPE) {
      if (!ACCEPTANCE_FILE_PURPOSES.includes(input.filePurpose)) throw new BadRequestException({ code: "FILE_PURPOSE_INVALID", message: "Loại tệp hồ sơ nghiệm thu không hợp lệ." });
      // Người không phải PI chỉ đóng góp tệp ACCEPTANCE_CONTRIBUTION.
      if (input.filePurpose !== ACCEPTANCE_CONTRIBUTION && !isPiViewer((await this.acceptanceCapability(actor, input.relatedEntityId)).capability)) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED" });
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
    let relationship: string | undefined;
    try {
      record = (await this.prisma.$transaction(async (tx) => {
        // Object storage has no transaction with Postgres. Rechecking here ensures a lifecycle
        // change between the initial authorization and metadata write rolls back the usable file.
        relationship = await this.assertCanUpload(actor, input.relatedEntityType, input.relatedEntityId, input.filePurpose);
        // Gồm cả bản đã xóa để số version không bị dùng lại.
        const latest = await tx.fileRecord.aggregate({ _max: { version: true }, where: { relatedEntityType: input.relatedEntityType, relatedEntityId: input.relatedEntityId, documentType: input.filePurpose } });
        const version = (latest._max.version ?? 0) + 1;
        return tx.fileRecord.create({
          data: {
            id: fileId,
            relatedEntityType: input.relatedEntityType,
            relatedEntityId: input.relatedEntityId,
            filePurpose: input.filePurpose,
            documentType: input.filePurpose,
            version,
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
              select: { displayName: true, researcherProfile: { select: { fullName: true } } }
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
      reason: `${record.relatedEntityType}:${record.relatedEntityId} purpose=${record.filePurpose} relationship=${relationship ?? "none"}`
    });
    if (record.relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE) await this.prisma.projectHistory.create({ data: { projectId: record.relatedEntityId, actorId: actor.id, action: record.filePurpose === "PROJECT_CONTRIBUTION" ? "project.evidence.contribute" : "project.evidence.upload", reason: record.originalFileName, afterFacts: { fileRecordId: record.id, purpose: record.filePurpose } } });
    await this.afterEthicsFileChange(actor, record);
    await this.afterAcceptanceFileChange(actor, record, "upload");

    return this.toFileResponse(record, { canMutate: !EVALUATION_FILE_PURPOSES.includes(record.filePurpose) });
  }

  async listFiles(actor: SafeUserContext, input: { relatedEntityType: string; relatedEntityId: string }) {
    this.assertSupportedEntity(input.relatedEntityType);
    if (input.relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE) {
      // Story 6.13: chứng từ kinh phí theo quyền xem kinh phí; tệp khác giữ quy tắc cũ.
      const voucherRead = await this.canReadFundingVouchers(actor, input.relatedEntityId);
      const generalRead = await this.assertCanRead(actor, input.relatedEntityType, input.relatedEntityId).then(() => true, (error) => { if (voucherRead) return false; throw error; });
      const records = await this.prisma.fileRecord.findMany({ where: { relatedEntityType: input.relatedEntityType, relatedEntityId: input.relatedEntityId, status: "active", deletedAt: null }, include: { uploadedBy: { select: { displayName: true } } }, orderBy: { createdAt: "desc" } });
      const project = generalRead ? await new ApprovedProjectsService(this.prisma, this.auditLog).getProject(actor, input.relatedEntityId) : null;
      const fullAccess = !!project && (project.viewerAuthorization.viewerRelationships.some((relationship: { type: string }) => relationship.type === "TOPIC_PI") || ["RESEARCH_MANAGEMENT_STAFF", "RESEARCH_MANAGEMENT_HEAD"].includes(actor.systemRole));
      return Promise.all(records.filter((record) => record.filePurpose === FUNDING_VOUCHER_PURPOSE ? voucherRead : generalRead && (fullAccess || record.uploadedById === actor.id)).map(async (record) => this.toFileResponse(record, { canMutate: await this.canMutateFile(actor, record) })));
    }
    if (input.relatedEntityType === ETHICS_DOSSIER_ENTITY_TYPE || input.relatedEntityType === ACCEPTANCE_DOSSIER_ENTITY_TYPE) {
      await this.assertCanRead(actor, input.relatedEntityType, input.relatedEntityId);
      const records = await this.prisma.fileRecord.findMany({ where: { relatedEntityType: input.relatedEntityType, relatedEntityId: input.relatedEntityId, status: "active", deletedAt: null }, include: { uploadedBy: { select: { displayName: true } } }, orderBy: { createdAt: "desc" } });
      return Promise.all(records.map(async (record) => this.toFileResponse(record, { canMutate: await this.canMutateFile(actor, record) })));
    }
    const proposal = await this.hideUnreadable("Không tìm thấy hồ sơ đề xuất.", () => new ResearchProposalsService(this.prisma, this.auditLog, this.participation, this.reviewAccess, this.managementOfficers).getProposal(actor, input.relatedEntityId));
    return proposal.attachments;
  }

  async downloadFile(actor: SafeUserContext, fileId: string) {
    const record = await this.findReadableFile(actor, fileId);
    if (isFundingVoucher(record)) {
      if (!await this.canReadFundingVouchers(actor, record.relatedEntityId)) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Không có quyền xem chứng từ kinh phí đề tài này." });
    } else {
      if (record.relatedEntityType !== RESEARCH_PROPOSAL_ENTITY_TYPE) await this.assertCanRead(actor, record.relatedEntityType, record.relatedEntityId);
      await this.assertProjectFileOwnership(actor, record, false);
    }
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
    if (EVALUATION_FILE_PURPOSES.includes(record.filePurpose)) throw new BadRequestException({ message: "Tệp hành chính đánh giá được giữ nguyên. Hãy tải lên phiên bản mới." });
    if (record.relatedEntityType === ACCEPTANCE_DOSSIER_ENTITY_TYPE) {
      if ((await this.findAcceptanceDossier(record.relatedEntityId)).status !== ACCEPTANCE_DOSSIER_DRAFT) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Hồ sơ nghiệm thu đã nộp được giữ nguyên." });
      return;
    }
    if (record.relatedEntityType === ETHICS_DOSSIER_ENTITY_TYPE) {
      if ((await this.findEthicsDossier(record.relatedEntityId)).status !== ETHICS_DOSSIER_DRAFT) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Hồ sơ đạo đức đã nộp được giữ nguyên." });
      return;
    }
    if (record.relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE) {
      const [report, request, funding] = await Promise.all([
        this.prisma.projectReportEvidence.findFirst({ where: { fileRecordId: record.id } }),
        this.prisma.projectRequestEvidence.findFirst({ where: { fileRecordId: record.id } }),
        this.prisma.projectFundingRecord.findFirst({ where: { fileRecordIds: { has: record.id } } })
      ]);
      if (report || request || funding) throw new BadRequestException({ code: "EVIDENCE_PINNED", message: "Tệp minh chứng đã nộp được giữ nguyên. Hãy tải lên phiên bản mới." });
      return;
    }
    const events = await this.prisma.proposalSubmissionEvent.findMany({ where: { proposalId: record.relatedEntityId }, select: { snapshot: true } });
    if (events.some((event) => {
      const files = (event.snapshot as { attachments?: Array<{ id: string }> } | null)?.attachments;
      return files?.some((file) => file.id === record.id);
    })) throw new BadRequestException({ message: "Tệp thuộc phiên bản đã nộp được giữ nguyên. Hãy tải lên phiên bản mới." });
  }

  async updateFile(actor: SafeUserContext, fileId: string, input: { description: string | null; contextVersion?: unknown }): Promise<any> {
    if (!this.transactional) { const file = await this.findReadableFile(actor, fileId); const projectId = await this.mutationProjectId(file); return projectId ? this.mutateProject(actor, projectId, input.contextVersion, (s, a) => s.updateFile(a, fileId, input)) : this.mutate(actor, file.relatedEntityId, input.contextVersion, (s, a) => s.updateFile(a, fileId, input)); }
    const record = await this.findReadableFile(actor, fileId);
    // Chỉ chứng từ kinh phí xét quyền theo mục đích; tệp hành chính đánh giá giữ cổng tải tệp hồ sơ (thư ký bị từ chối trước khi xét bất biến).
    await this.assertCanUpload(actor, record.relatedEntityType, record.relatedEntityId, record.filePurpose === FUNDING_VOUCHER_PURPOSE ? record.filePurpose : undefined);
    await this.assertProjectFileOwnership(actor, record, true);
    await this.assertUnsubmittedFile(record);
    const updated = (await this.prisma.fileRecord.update({
      where: { id: fileId },
      data: {
        description: this.readDescription(input.description)
      } as never,
      include: {
        uploadedBy: {
          select: { displayName: true, researcherProfile: { select: { fullName: true } } }
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
    await this.afterEthicsFileChange(actor, updated);
    await this.afterAcceptanceFileChange(actor, updated, "metadata");

    return this.toFileResponse(updated, { canMutate: true });
  }

  async deleteFile(actor: SafeUserContext, fileId: string, contextVersion?: unknown): Promise<any> {
    if (!this.transactional) { const file = await this.findReadableFile(actor, fileId); const projectId = await this.mutationProjectId(file); return projectId ? this.mutateProject(actor, projectId, contextVersion, (s, a) => s.deleteFile(a, fileId, contextVersion)) : this.mutate(actor, file.relatedEntityId, contextVersion, (s, a) => s.deleteFile(a, fileId, contextVersion)); }
    const record = await this.findReadableFile(actor, fileId);
    // Chỉ chứng từ kinh phí xét quyền theo mục đích; tệp hành chính đánh giá giữ cổng tải tệp hồ sơ (thư ký bị từ chối trước khi xét bất biến).
    await this.assertCanUpload(actor, record.relatedEntityType, record.relatedEntityId, record.filePurpose === FUNDING_VOUCHER_PURPOSE ? record.filePurpose : undefined);
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
          select: { displayName: true, researcherProfile: { select: { fullName: true } } }
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
    await this.afterEthicsFileChange(actor, deleted);
    await this.afterAcceptanceFileChange(actor, deleted, "delete");

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
    if (![RESEARCH_PROPOSAL_ENTITY_TYPE, APPROVED_PROJECT_ENTITY_TYPE, ETHICS_DOSSIER_ENTITY_TYPE, ACCEPTANCE_DOSSIER_ENTITY_TYPE].includes(relatedEntityType)) {
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

  /** Trả quan hệ của actor để ghi audit. Tệp hành chính đánh giá bị chặn sửa/xóa ở `assertUnsubmittedFile`. */
  private async assertCanUpload(actor: SafeUserContext, relatedEntityType: string, relatedEntityId: string, filePurpose?: string): Promise<string | undefined> {
    if (relatedEntityType === ACCEPTANCE_DOSSIER_ENTITY_TYPE) {
      const denial = ethicsCapabilityError((await this.acceptanceCapability(actor, relatedEntityId)).capability, "acceptance-dossier.contribute");
      if (denial) throw denial;
      return;
    }
    if (relatedEntityType === ETHICS_DOSSIER_ENTITY_TYPE) {
      const { project, capability } = await this.ethicsCapability(actor, relatedEntityId);
      const denial = ethicsCapabilityError(capability, "ethics-dossier.edit");
      if (denial) throw denial;
      // CV phụ trách: cùng kiểm tra phạm vi, D-041 và xung đột phản biện như khi sửa mục; chỉ ghi audit miễn trừ khi đang ghi.
      if (!isPiViewer(capability) && isOfficerViewer(capability)) await new ApprovedProjectsService(this.prisma, this.auditLog).assertOfficer(this.prisma, actor, project, this.transactional ? "ethics-dossier.file" : "");
      return;
    }
    if (relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE) {
      const projects = new ApprovedProjectsService(this.prisma, this.auditLog);
      // Story 6.13: chứng từ kinh phí do người được ghi kinh phí tải (GĐ, TP, TB, CV phụ trách), không phải PI/thành viên.
      if (filePurpose === FUNDING_VOUCHER_PURPOSE) {
        const status = (await this.prisma.approvedProject.findUnique({ where: { id: relatedEntityId }, select: { status: true } }))?.status;
        if (status === "preparing" || status === "closed") throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Đề tài chưa thực hiện hoặc đã đóng." });
        if (!(await projects.getFunding(actor, relatedEntityId)).canWrite) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chỉ người quản lý kinh phí đề tài được tải chứng từ." });
        return;
      }
      const project = await projects.getProject(actor, relatedEntityId);
      if (!project.viewerAuthorization.allowedActions.includes("project.evidence.contribute")) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED" });
      return;
    }
    if (filePurpose && EVALUATION_FILE_PURPOSES.includes(filePurpose)) return this.assertCanUploadEvaluationFile(actor, relatedEntityType, relatedEntityId, filePurpose);
    if (relatedEntityType === RESEARCH_PROPOSAL_ENTITY_TYPE && !isInternalResearcherEligible(actor)) {
      throw new ForbiddenException({ message: "Chỉ PI hoặc thư ký nội bộ được tải tệp cho hồ sơ đề xuất." });
    }
    const proposal = await this.findRelatedProposal(relatedEntityType, relatedEntityId);
    if (proposal.status !== "draft" && proposal.status !== "supplement_requested") {
      throw new ForbiddenException({ message: "Hồ sơ không còn cho phép tải tệp." });
    }
    if (proposal.ownerId === actor.id) return "PROPOSAL_PI";
    const participation = await this.participation.resolveForProposal(actor.id, proposal);
    if (!participation.roles.includes("TOPIC_SECRETARY")) {
      throw new ForbiddenException({ message: "Không có quyền tải tệp cho hồ sơ đề xuất này." });
    }
    return "TOPIC_SECRETARY";
  }

  /** Story 5.6: tệp hành chính khi hồ sơ đang đánh giá. Tài liệu họp chỉ thư ký đề tài; biên bản chỉ thư ký hội đồng không xung đột. */
  private async assertCanUploadEvaluationFile(actor: SafeUserContext, relatedEntityType: string, relatedEntityId: string, filePurpose: string) {
    const proposal = await this.findRelatedProposal(relatedEntityType, relatedEntityId);
    if (proposal.status !== "under_review") {
      throw new ForbiddenException({ message: "Chỉ hồ sơ đang đánh giá mới nhận tệp hành chính đánh giá." });
    }
    if (filePurpose === "MEETING_MATERIAL") {
      const participation = await this.participation.resolveForProposal(actor.id, proposal);
      if (!isInternalResearcherEligible(actor) || !participation.roles.includes("TOPIC_SECRETARY")) {
        throw new ForbiddenException({ message: "Chỉ thư ký đề tài đang hiệu lực được tải tài liệu họp." });
      }
      return "TOPIC_SECRETARY";
    }
    const access = await this.reviewAccess.resolveForProposal(actor.id, proposal.id);
    if (!access.isAssignedReviewer || access.assignmentRole !== "council_secretary") {
      throw new ForbiddenException({ message: "Chỉ thư ký hội đồng được tải biên bản họp hội đồng." });
    }
    if ((await this.participation.evaluateConflict(actor.id, proposal.id)).conflicted) {
      throw new ForbiddenException({ code: "CONFLICT_DENIED", message: "Người tham gia hồ sơ không thể nộp biên bản hội đồng." });
    }
    return "COUNCIL_SECRETARY";
  }

  private async assertCanRead(actor: SafeUserContext, relatedEntityType: string, relatedEntityId: string) {
    this.assertSupportedEntity(relatedEntityType);
    if (relatedEntityType === ACCEPTANCE_DOSSIER_ENTITY_TYPE) {
      if (ethicsCapabilityError((await this.acceptanceCapability(actor, relatedEntityId)).capability, "acceptance-dossier.read")) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED" });
      return;
    }
    if (relatedEntityType === ETHICS_DOSSIER_ENTITY_TYPE) {
      if (ethicsCapabilityError((await this.ethicsCapability(actor, relatedEntityId)).capability, "ethics-dossier.read")) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED" });
      return;
    }
    if (relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE) {
      if (["LEADERSHIP_APPROVAL_AUTHORITY", "RESEARCH_OVERSIGHT_AUTHORITY"].includes(actor.systemRole)) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED" });
      await new ApprovedProjectsService(this.prisma, this.auditLog).getProject(actor, relatedEntityId);
      return;
    }
    return new ResearchProposalsService(this.prisma, this.auditLog, this.participation, this.reviewAccess, this.managementOfficers).getProposal(actor, relatedEntityId);
  }

  private async canMutateEntity(actor: SafeUserContext, relatedEntityType: string, relatedEntityId: string, filePurpose?: string) {
    try {
      await this.assertCanUpload(actor, relatedEntityType, relatedEntityId, filePurpose);
      return true;
    } catch {
      return false;
    }
  }

  private async canMutateFile(actor: SafeUserContext, record: FileRecord) {
    if (!await this.canMutateEntity(actor, record.relatedEntityType, record.relatedEntityId, record.filePurpose)) return false;
    try { await this.assertProjectFileOwnership(actor, record, true); await this.assertUnsubmittedFile(record); return true; } catch { return false; }
  }

  private async assertProjectFileOwnership(actor: SafeUserContext, record: FileRecord, mutate: boolean) {
    // Hồ sơ nghiệm thu: người đóng góp chỉ sửa/xóa tệp của mình; xem theo `acceptance-dossier.read`.
    if (record.relatedEntityType === ACCEPTANCE_DOSSIER_ENTITY_TYPE) {
      if (mutate && record.uploadedById !== actor.id && !isPiViewer((await this.acceptanceCapability(actor, record.relatedEntityId)).capability)) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED" });
      return;
    }
    // Chứng từ kinh phí: quyền theo kinh phí (đọc: canReadFundingVouchers, sửa/xoá: assertCanUpload → canWrite), không theo người tải.
    if (record.relatedEntityType !== APPROVED_PROJECT_ENTITY_TYPE || isFundingVoucher(record)) return;
    const project = await new ApprovedProjectsService(this.prisma, this.auditLog).getProject(actor, record.relatedEntityId);
    const isPi = project.viewerAuthorization.viewerRelationships.some((relationship: { type: string }) => relationship.type === "TOPIC_PI");
    const manager = ["RESEARCH_MANAGEMENT_STAFF", "RESEARCH_MANAGEMENT_HEAD"].includes(actor.systemRole);
    if (!isPi && (!manager || mutate) && record.uploadedById !== actor.id) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED" });
  }

  private async canReadFundingVouchers(actor: SafeUserContext, projectId: string) {
    return new ApprovedProjectsService(this.prisma, this.auditLog).getFunding(actor, projectId).then((funding) => !funding.restricted, () => false);
  }

  private async findEthicsDossier(dossierId: string) {
    const dossier = await this.prisma.ethicsDossier.findUnique({ where: { id: dossierId }, select: { id: true, projectId: true, status: true } });
    if (!dossier) throw new NotFoundException({ message: "Không tìm thấy hồ sơ đạo đức." });
    return dossier;
  }

  /** Quyền trên tệp hồ sơ đạo đức đi theo capability `ethics-dossier.*` của đề tài nguồn. */
  private async ethicsCapability(actor: SafeUserContext, dossierId: string) {
    const dossier = await this.findEthicsDossier(dossierId);
    return new ApprovedProjectsService(this.prisma, this.auditLog).loadAuthorized(this.prisma, actor, dossier.projectId);
  }

  /** Tệp hồ sơ đạo đức đổi: tăng context đề tài; người không phải PI làm thì bỏ tích cam kết (D-042). */
  private async afterEthicsFileChange(actor: SafeUserContext, record: FileRecord) {
    if (record.relatedEntityType !== ETHICS_DOSSIER_ENTITY_TYPE) return;
    const { project, capability } = await this.ethicsCapability(actor, record.relatedEntityId);
    if (!isPiViewer(capability)) await resetEthicsCommitment(this.prisma, record.relatedEntityId);
    await bumpEthicsProjectContext(this.prisma, project.id, new Date());
  }

  private async findAcceptanceDossier(dossierId: string) {
    const dossier = await this.prisma.acceptanceDossier.findUnique({ where: { id: dossierId }, select: { id: true, projectId: true, status: true } });
    if (!dossier) throw new NotFoundException({ message: "Không tìm thấy hồ sơ nghiệm thu." });
    return dossier;
  }

  /** Quyền trên tệp hồ sơ nghiệm thu đi theo capability `acceptance-dossier.*` của đề tài nguồn. */
  private async acceptanceCapability(actor: SafeUserContext, dossierId: string) {
    const dossier = await this.findAcceptanceDossier(dossierId);
    return new ApprovedProjectsService(this.prisma, this.auditLog).loadAuthorized(this.prisma, actor, dossier.projectId);
  }

  /** Tệp hồ sơ nghiệm thu đổi: ghi lịch sử đề tài (chỉ id/purpose) và tăng context để client cũ không nộp nhầm. */
  private async afterAcceptanceFileChange(actor: SafeUserContext, record: FileRecord, change: "upload" | "metadata" | "delete") {
    if (record.relatedEntityType !== ACCEPTANCE_DOSSIER_ENTITY_TYPE) return;
    const { projectId } = await this.findAcceptanceDossier(record.relatedEntityId);
    await this.prisma.projectHistory.create({ data: { projectId, actorId: actor.id, action: `acceptance-dossier.file.${change}`, afterFacts: { dossierId: record.relatedEntityId, fileRecordId: record.id, purpose: record.filePurpose } } });
    await bumpEthicsProjectContext(this.prisma, projectId, new Date());
  }

  /** Tệp đề tài và hồ sơ đạo đức khóa theo đề tài; tệp đề xuất khóa theo đề xuất. */
  private async mutationProjectId(record: FileRecord) {
    if (record.relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE) return record.relatedEntityId;
    if (record.relatedEntityType === ETHICS_DOSSIER_ENTITY_TYPE) return (await this.findEthicsDossier(record.relatedEntityId)).projectId;
    if (record.relatedEntityType === ACCEPTANCE_DOSSIER_ENTITY_TYPE) return (await this.findAcceptanceDossier(record.relatedEntityId)).projectId;
    return null;
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

  /** Tệp đề xuất ngoài quyền đọc trả cùng 404 như tệp không tồn tại, để không lộ sự tồn tại của tệp. */
  private async findReadableFile(actor: SafeUserContext, fileId: string) {
    const record = await this.findActiveFile(fileId);
    if (record.relatedEntityType !== RESEARCH_PROPOSAL_ENTITY_TYPE) return record;
    // Chỉ tệp có trong danh sách đã lọc theo người xem (vd. biên bản hội đồng ẩn với người tham gia).
    const proposal = await this.hideUnreadable("Không tìm thấy tệp.", () => this.assertCanRead(actor, record.relatedEntityType, record.relatedEntityId));
    if (!proposal?.attachments.some((attachment: { id: string }) => attachment.id === record.id)) throw new NotFoundException({ message: "Không tìm thấy tệp." });
    return record;
  }

  /** Từ chối quyền và hồ sơ không tồn tại cùng trả một 404, cùng nội dung. */
  private async hideUnreadable<T>(message: string, read: () => Promise<T>): Promise<T> {
    try {
      return await read();
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) throw new NotFoundException({ message });
      throw error;
    }
  }

  private async findActiveFile(fileId: string) {
    const record = (await this.prisma.fileRecord.findUnique({
      where: { id: fileId },
      include: {
        uploadedBy: {
          select: { displayName: true, researcherProfile: { select: { fullName: true } } }
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
      documentType: record.documentType,
      version: record.version,
      fileName: record.originalFileName,
      description: record.description ?? null,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      uploadedById: record.uploadedById,
      uploaderDisplayName: record.uploadedBy?.researcherProfile?.fullName || record.uploadedBy?.displayName || "",
      status: record.status,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      canEdit: options.canMutate,
      canDelete: options.canMutate
    };
  }
}

function isFundingVoucher(record: FileRecord) {
  return record.relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE && record.filePurpose === FUNDING_VOUCHER_PURPOSE;
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
