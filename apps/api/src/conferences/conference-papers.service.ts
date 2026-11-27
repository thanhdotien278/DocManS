import type { Prisma } from "@prisma/client";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { storageReadFailure, type ObjectStorage } from "../infrastructure/minio/minio-object-storage.service.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { assertValidUpload, defaultFileConfig, readUploadFileName, type FileModuleConfig } from "../modules/files/file-validation.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { canConference, canReadConferenceManagement, isPaperOwner } from "./conference-access.js";
import { CONFERENCE_INCLUDE, CONFERENCE_PAPER_ENTITY_TYPE, conferenceFacts, iso, lockConference, recordConferenceEvent, stale } from "./conference-support.js";
import { readProgramSnapshot } from "./conference-program.service.js";
import { CONFERENCE_STATUS_LABELS, PAPER_OPEN_STATUSES, PAPER_WITHDRAWABLE_STATUSES, paperStatusAfterSubmit, submissionBlockReason, type ConferenceStatus, type PaperVersionKind } from "./conference-workflow.js";
import type { RevisionRequestDto, SubmitPaperDto, VersionedReasonDto } from "./conferences.dto.js";

export type UploadedPaperFile = { originalname: string; mimetype: string; size: number; buffer: Buffer };

const PAPER_INCLUDE = {
  conference: { include: CONFERENCE_INCLUDE },
  invitation: { select: { id: true, status: true, fullName: true } },
  versions: { select: { id: true, kind: true, versionNumber: true, title: true, abstractText: true, authors: true, submittedAt: true, file: { select: { id: true, originalFileName: true, sizeBytes: true, mimeType: true } } }, orderBy: { versionNumber: "desc" } },
  revisionRequests: { orderBy: { requestedAt: "desc" } }
} satisfies Prisma.ConferencePaperInclude;

type PaperRecord = Prisma.ConferencePaperGetPayload<{ include: typeof PAPER_INCLUDE }>;

const KIND_LABEL: Record<PaperVersionKind, string> = { abstract: "tóm tắt", full_paper: "toàn văn" };

function openRevisions(paper: PaperRecord) {
  return paper.revisionRequests.filter((request) => !request.resolvedAt).map((request) => ({ kind: request.kind as PaperVersionKind, dueAt: request.dueAt }));
}

function blockReason(paper: PaperRecord, kind: PaperVersionKind, now = new Date()) {
  if (paper.invitation.status !== "accepted") return "Lời mời không còn hiệu lực.";
  return submissionBlockReason({
    conferenceStatus: paper.conference.status, paperStatus: paper.status, kind,
    abstractDeadline: paper.conference.abstractDeadline, fullPaperDeadline: paper.conference.fullPaperDeadline,
    hasAbstract: paper.versions.some((version) => version.kind === "abstract"), openRevisions: openRevisions(paper), now
  });
}

@Injectable()
export class ConferencePapersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly storage: ObjectStorage,
    @Optional() private readonly notifications?: NotificationsService,
    private readonly fileConfig: FileModuleConfig = defaultFileConfig()
  ) {}

  private presentPaper(paper: PaperRecord, owner: boolean) {
    const abstractBlock = blockReason(paper, "abstract");
    const fullBlock = blockReason(paper, "full_paper");
    return {
      id: paper.id,
      title: paper.title,
      authors: paper.authors,
      status: paper.status,
      withdrawReason: paper.withdrawReason,
      version: iso(paper.updatedAt),
      versions: paper.versions,
      openRevisions: paper.revisionRequests.filter((request) => !request.resolvedAt).map((request) => ({ id: request.id, kind: request.kind, reason: request.reason, dueAt: request.dueAt, requestedAt: request.requestedAt })),
      viewer: owner ? {
        canSubmitAbstract: !abstractBlock, abstractBlockReason: abstractBlock,
        canSubmitFullPaper: !fullBlock, fullPaperBlockReason: fullBlock,
        canWithdraw: (PAPER_WITHDRAWABLE_STATUSES as string[]).includes(paper.status) && paper.invitation.status === "accepted" && !["completed", "cancelled"].includes(paper.conference.status)
      } : null
    };
  }

  /** "Hội nghị của tôi": lời mời đã gửi tới tôi hoặc tôi đã nhận lời, kèm báo cáo của tôi. */
  async myConferences(actor: SafeUserContext) {
    const invitations = await this.prisma.conferenceInvitation.findMany({
      where: { userId: actor.id, status: { in: ["sent", "accepted"] }, conference: { status: { not: "draft" } } },
      include: { conference: { include: CONFERENCE_INCLUDE }, paper: { include: PAPER_INCLUDE } },
      orderBy: { createdAt: "desc" }
    });
    // Chương trình đã chốt và kỷ yếu mới nhất: chỉ cho khách mời đã nhận lời.
    const acceptedIds = invitations.filter((invitation) => invitation.status === "accepted").map((invitation) => invitation.conferenceId);
    const [programs, proceedings] = acceptedIds.length ? await Promise.all([
      this.prisma.conferenceProgramVersion.findMany({ where: { conferenceId: { in: acceptedIds } }, orderBy: { versionNumber: "desc" } }),
      this.prisma.conferenceProceedings.findMany({ where: { conferenceId: { in: acceptedIds } }, orderBy: { versionNumber: "desc" }, include: { file: { select: { originalFileName: true, sizeBytes: true } } } })
    ]) : [[], []];
    return invitations.map((invitation) => {
      const conference = invitation.conference;
      const accepted = invitation.status === "accepted";
      const program = accepted ? programs.find((item) => item.conferenceId === conference.id) : undefined;
      const book = accepted ? proceedings.find((item) => item.conferenceId === conference.id) : undefined;
      return {
        program: program ? { versionNumber: program.versionNumber, publishedAt: program.publishedAt, snapshot: readProgramSnapshot(program.snapshot) } : null,
        proceedings: book ? { id: book.id, versionNumber: book.versionNumber, isbn: book.isbn, uploadedAt: book.uploadedAt, fileName: book.file.originalFileName, sizeBytes: book.file.sizeBytes } : null,
        invitation: { id: invitation.id, kind: invitation.kind, status: invitation.status, sentAt: invitation.sentAt, respondedAt: invitation.respondedAt, canRespond: invitation.status === "sent" && !["completed", "cancelled"].includes(conference.status) },
        conference: {
          id: conference.id, code: conference.code, title: conference.title, description: conference.description, level: conference.level,
          status: conference.status, statusLabel: CONFERENCE_STATUS_LABELS[conference.status as ConferenceStatus] ?? conference.status,
          hostOrganizationUnit: conference.hostOrganizationUnit, location: conference.location, startsAt: conference.startsAt, endsAt: conference.endsAt,
          responseDeadline: conference.responseDeadline, abstractDeadline: conference.abstractDeadline, fullPaperDeadline: conference.fullPaperDeadline, cancelReason: conference.cancelReason
        },
        paper: invitation.paper && invitation.status === "accepted" ? this.presentPaper(invitation.paper, true) : null
      };
    });
  }

  private async loadPaper(id: string) {
    const paper = await this.prisma.conferencePaper.findUnique({ where: { id }, include: PAPER_INCLUDE });
    if (!paper) throw new NotFoundException({ message: "Không tìm thấy báo cáo." });
    return paper;
  }

  /** Người đọc được báo cáo: tác giả chính (lời mời còn hiệu lực) hoặc người đọc được bản quản lý của hội nghị. */
  private canRead(actor: SafeUserContext, paper: PaperRecord) {
    return (isPaperOwner(actor, paper) && paper.invitation.status === "accepted") || canReadConferenceManagement(actor, conferenceFacts(paper.conference));
  }

  async submit(actor: SafeUserContext, paperId: string, input: SubmitPaperDto, file: UploadedPaperFile | undefined) {
    const paper = await this.loadPaper(paperId);
    if (!this.canRead(actor, paper)) throw new NotFoundException({ message: "Không tìm thấy báo cáo." });
    if (!isPaperOwner(actor, paper)) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chỉ báo cáo viên tự nộp bài của mình." });
    if (iso(paper.updatedAt) !== input.version) stale();
    const blocked = blockReason(paper, input.kind);
    if (blocked) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: blocked });
    if (input.kind === "full_paper" && !file) throw new BadRequestException({ message: "Cần tải tệp toàn văn." });
    const title = input.title ?? paper.title ?? paper.versions.find((version) => version.kind === "abstract")?.title;
    if (!title) throw new BadRequestException({ message: "Cần tên báo cáo." });

    let upload: { fileId: string; objectKey: string; originalFileName: string } | null = null;
    if (file) {
      const originalFileName = readUploadFileName(file.originalname);
      assertValidUpload({ fileName: originalFileName, mimeType: file.mimetype, sizeBytes: file.size, content: file.buffer }, this.fileConfig);
      const fileId = randomUUID();
      const objectKey = `conferences/${paper.conferenceId}/${paper.id}/${fileId}/${randomUUID()}${path.extname(originalFileName).toLowerCase()}`;
      await this.storage.putObject({ objectKey, content: file.buffer, mimeType: file.mimetype, sizeBytes: file.size });
      upload = { fileId, objectKey, originalFileName };
    }
    let created: { id: string; versionNumber: number; toStatus: string };
    try {
      created = await this.prisma.$transaction(async (tx) => {
        // Kho tệp không chung giao dịch: khoá hội nghị, đọc lại báo cáo rồi kiểm tra lại điều kiện trước khi ghi.
        await lockConference(tx, paper.conferenceId);
        const current = await tx.conferencePaper.findUnique({ where: { id: paper.id }, include: PAPER_INCLUDE });
        if (!current || iso(current.updatedAt) !== input.version) stale();
        const again = blockReason(current, input.kind);
        if (again) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: again });
        if (upload) {
          await tx.fileRecord.create({
            data: {
              id: upload.fileId, relatedEntityType: CONFERENCE_PAPER_ENTITY_TYPE, relatedEntityId: paper.id, filePurpose: input.kind === "abstract" ? "CONFERENCE_ABSTRACT" : "CONFERENCE_FULL_PAPER", documentType: input.kind === "abstract" ? "CONFERENCE_ABSTRACT" : "CONFERENCE_FULL_PAPER",
              originalFileName: upload.originalFileName, version: 1, mimeType: file!.mimetype, sizeBytes: file!.size,
              storageBucket: this.fileConfig.bucketName ?? "rtms-files", storageObjectKey: upload.objectKey, uploadedById: actor.id, status: "active"
            }
          });
        }
        const versionNumber = (current.versions.filter((version) => version.kind === input.kind)[0]?.versionNumber ?? 0) + 1;
        const version = await tx.conferencePaperVersion.create({ data: { paperId: paper.id, kind: input.kind, versionNumber, title, abstractText: input.abstractText ?? null, authors: input.authors ?? (current.authors as Prisma.InputJsonValue), fileId: upload?.fileId ?? null, submittedById: actor.id } });
        // Nộp bản mới cùng loại giải quyết yêu cầu sửa đang mở.
        const resolved = await tx.conferenceRevisionRequest.updateMany({ where: { paperId: paper.id, kind: input.kind, resolvedAt: null }, data: { resolvedAt: new Date(), resolvedVersionId: version.id } });
        const toStatus = paperStatusAfterSubmit(current.status, input.kind);
        await tx.conferencePaper.update({ where: { id: paper.id }, data: { status: toStatus, title, ...(input.authors ? { authors: input.authors } : {}) } });
        await recordConferenceEvent(tx, { conferenceId: paper.conferenceId, paperId: paper.id, actorId: actor.id, action: input.kind === "abstract" ? "paper.submit-abstract" : "paper.submit-full", fromStatus: current.status, toStatus, facts: { versionNumber, fileName: upload?.originalFileName ?? null, resolvedRevision: resolved.count > 0 } });
        return { id: version.id, versionNumber, toStatus };
      });
    } catch (error) {
      if (upload) await this.storage.deleteObject?.(upload.objectKey).catch(() => undefined);
      throw error;
    }
    await this.auditLog.record({ action: input.kind === "abstract" ? "submit-conference-abstract" : "submit-conference-full-paper", result: "success", actorId: actor.id, targetEntity: "conference-paper", targetEntityId: paper.id, username: actor.username, afterFacts: { versionId: created.id, versionNumber: created.versionNumber } });
    const officerId = paper.conference.officers[0]?.userId;
    if (officerId) await this.notifications?.createConferenceNotification({ userId: officerId, conferenceId: paper.conferenceId, audience: "management", title: `Báo cáo viên nộp ${KIND_LABEL[input.kind]}`, message: `${paper.invitation.fullName} đã nộp ${KIND_LABEL[input.kind]} (lần ${created.versionNumber}) cho ${paper.conference.title}: ${title}`, link: `/conferences/${paper.conferenceId}` });
    return { versionId: created.id, versionNumber: created.versionNumber, status: created.toStatus };
  }

  /** Báo cáo viên rút bài, hoặc chuyên viên phụ trách huỷ bài (bắt buộc lý do). */
  async withdraw(actor: SafeUserContext, paperId: string, input: VersionedReasonDto) {
    const paper = await this.loadPaper(paperId);
    if (!this.canRead(actor, paper)) throw new NotFoundException({ message: "Không tìm thấy báo cáo." });
    const owner = isPaperOwner(actor, paper);
    const officer = canConference(actor, conferenceFacts(paper.conference), "paper.review");
    if (!owner && !officer) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chỉ báo cáo viên hoặc chuyên viên phụ trách rút được báo cáo." });
    if (!owner && !input.reason) throw new BadRequestException({ message: "Cần nêu lý do huỷ báo cáo." });
    if (!(PAPER_WITHDRAWABLE_STATUSES as string[]).includes(paper.status) || ["completed", "cancelled"].includes(paper.conference.status)) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Báo cáo không còn rút được." });
    await this.prisma.$transaction(async (tx) => {
      // Khoá như setSessionSlots để bài vừa rút không bị xếp lại vào phiên song song.
      await lockConference(tx, paper.conferenceId);
      const changed = await tx.conferencePaper.updateMany({ where: { id: paper.id, status: paper.status, updatedAt: new Date(input.version) }, data: { status: "withdrawn", withdrawReason: input.reason ?? null } });
      if (changed.count !== 1) stale();
      const removed = await tx.conferenceSessionSlot.deleteMany({ where: { paperId: paper.id } });
      if (removed.count) await tx.scientificConference.update({ where: { id: paper.conferenceId }, data: { programChangedAt: new Date() } });
      await tx.conferenceRevisionRequest.updateMany({ where: { paperId: paper.id, resolvedAt: null }, data: { resolvedAt: new Date() } });
      await recordConferenceEvent(tx, { conferenceId: paper.conferenceId, paperId: paper.id, actorId: actor.id, action: owner ? "paper.withdraw" : "paper.cancel", fromStatus: paper.status, toStatus: "withdrawn", reason: input.reason ?? null });
    });
    await this.auditLog.record({ action: owner ? "withdraw-conference-paper" : "cancel-conference-paper", result: "success", actorId: actor.id, targetEntity: "conference-paper", targetEntityId: paper.id, username: actor.username, reason: input.reason, beforeFacts: { status: paper.status } });
    const notifyId = owner ? paper.conference.officers[0]?.userId : paper.ownerId;
    if (notifyId) await this.notifications?.createConferenceNotification({ userId: notifyId, conferenceId: paper.conferenceId, audience: owner ? "management" : "invitation", title: owner ? "Báo cáo viên rút bài" : "Báo cáo đã bị huỷ", message: `${owner ? `${paper.invitation.fullName} đã rút báo cáo` : "Chuyên viên phụ trách đã huỷ báo cáo của bạn"} tại ${paper.conference.title}.${input.reason ? ` Lý do: ${input.reason}` : ""}`, link: owner ? `/conferences/${paper.conferenceId}` : "/my-conferences" });
    return { id: paper.id, status: "withdrawn" };
  }

  /** Chuyên viên phụ trách yêu cầu sửa tóm tắt hoặc toàn văn (đã có bản nộp cùng loại), có hạn nộp lại. */
  async requestRevision(actor: SafeUserContext, paperId: string, input: RevisionRequestDto) {
    const paper = await this.loadPaper(paperId);
    if (!this.canRead(actor, paper)) throw new NotFoundException({ message: "Không tìm thấy báo cáo." });
    if (!canConference(actor, conferenceFacts(paper.conference), "paper.review")) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chỉ chuyên viên phụ trách yêu cầu sửa bài." });
    if (iso(paper.updatedAt) !== input.version) stale();
    if (!(PAPER_OPEN_STATUSES as string[]).includes(paper.status)) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Báo cáo đã rút hoặc đã xếp lịch." });
    if (!paper.versions.some((version) => version.kind === input.kind)) throw new BadRequestException({ message: `Báo cáo viên chưa nộp ${KIND_LABEL[input.kind]}.` });
    if (input.dueAt.getTime() < Date.now()) throw new BadRequestException({ message: "Hạn nộp lại phải ở tương lai." });
    if (input.dueAt.getTime() > paper.conference.endsAt.getTime()) throw new BadRequestException({ message: "Hạn nộp lại phải trước khi hội nghị kết thúc." });
    try {
      await this.prisma.$transaction(async (tx) => {
        await lockConference(tx, paper.conferenceId);
        // Đổi phiên bản báo cáo và kiểm tra đồng thời trước khi ghi yêu cầu sửa.
        const bumped = await tx.conferencePaper.updateMany({ where: { id: paper.id, status: paper.status, updatedAt: new Date(input.version) }, data: { updatedAt: new Date() } });
        if (bumped.count !== 1) stale();
        await tx.conferenceRevisionRequest.create({ data: { paperId: paper.id, kind: input.kind, reason: input.reason, dueAt: input.dueAt, requestedById: actor.id } });
        await recordConferenceEvent(tx, { conferenceId: paper.conferenceId, paperId: paper.id, actorId: actor.id, action: "paper.request-revision", reason: input.reason, facts: { kind: input.kind, dueAt: input.dueAt.toISOString() } });
      });
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") throw new ConflictException({ message: `Đang có yêu cầu sửa ${KIND_LABEL[input.kind]} chưa được nộp lại.` });
      throw error;
    }
    await this.auditLog.record({ action: "request-conference-paper-revision", result: "success", actorId: actor.id, targetEntity: "conference-paper", targetEntityId: paper.id, username: actor.username, reason: input.reason, afterFacts: { kind: input.kind, dueAt: input.dueAt.toISOString() } });
    await this.notifications?.createConferenceNotification({ userId: paper.ownerId, conferenceId: paper.conferenceId, audience: "invitation", title: `Yêu cầu sửa ${KIND_LABEL[input.kind]}`, message: `Chuyên viên phụ trách ${paper.conference.title} đề nghị sửa ${KIND_LABEL[input.kind]}: ${input.reason}`, link: "/my-conferences" });
    return { id: paper.id };
  }

  async download(actor: SafeUserContext, paperId: string, versionId: string) {
    const paper = await this.loadPaper(paperId);
    if (!this.canRead(actor, paper)) throw new NotFoundException({ message: "Không tìm thấy báo cáo." });
    const version = await this.prisma.conferencePaperVersion.findFirst({ where: { id: versionId, paperId }, include: { file: true } });
    const file = version?.file;
    if (!file || file.relatedEntityType !== CONFERENCE_PAPER_ENTITY_TYPE || file.relatedEntityId !== paperId || file.status !== "active") throw new NotFoundException({ message: "Không tìm thấy tệp." });
    let content: Awaited<ReturnType<ObjectStorage["getObject"]>>;
    try {
      content = await this.storage.getObject(file.storageObjectKey);
    } catch (error) {
      throw storageReadFailure(error);
    }
    await this.auditLog.record({ action: "download-conference-paper", result: "success", actorId: actor.id, targetEntity: "conference-paper", targetEntityId: paperId, username: actor.username, reason: `version:${versionId}` });
    return { fileName: file.originalFileName, mimeType: file.mimeType, sizeBytes: file.sizeBytes, content };
  }
}
