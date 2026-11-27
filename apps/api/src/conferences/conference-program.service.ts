import type { Prisma } from "@prisma/client";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { storageReadFailure, type ObjectStorage } from "../infrastructure/minio/minio-object-storage.service.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { assertValidUpload, defaultFileConfig, readUploadFileName, type FileModuleConfig } from "../modules/files/file-validation.js";
import { canConference, canReadConferenceManagement, isConferenceParticipant, type ConferenceAction } from "./conference-access.js";
import { scheduleProgram, type ScheduleSessionInput } from "./conference-scheduling.js";
import { CONFERENCE_INCLUDE, conferenceFacts, conferenceNotFound, lockAndRecheck, recordConferenceEvent } from "./conference-support.js";
import type { ProceedingsInputDto, ProgramSettingsDto, PublishProgramDto, SessionInputDto, SessionSlotsDto, SlotTimeDto } from "./conferences.dto.js";

/** Loại thực thể của tệp kỷ yếu: chỉ đi qua module hội nghị. */
export const CONFERENCE_PROCEEDINGS_ENTITY_TYPE = "conference-proceedings";

export type UploadedProceedingsFile = { originalname: string; mimetype: string; size: number; buffer: Buffer };

/** Báo cáo được xếp vào chương trình: đã nộp toàn văn (hoặc đã xếp ở lần chốt trước). */
const SCHEDULABLE_PAPER_STATUSES = ["full_paper_submitted", "scheduled"];

const SESSION_INCLUDE = {
  breaks: { orderBy: { startsAt: "asc" } },
  slots: {
    orderBy: { position: "asc" },
    include: { paper: { select: { id: true, title: true, authors: true, ownerId: true, status: true, invitation: { select: { fullName: true, academicTitle: true, organizationUnit: { select: { name: true } }, externalOrganization: true } } } } }
  }
} satisfies Prisma.ConferenceSessionInclude;

type SessionRecord = Prisma.ConferenceSessionGetPayload<{ include: typeof SESSION_INCLUDE }>;

export type ProgramSnapshot = {
  conference: { title: string; code: string; location: string; startsAt: string; endsAt: string; hostUnitName: string };
  sessions: Array<{
    kind: string; name: string; room: string | null; chairName: string | null; secretaryName: string | null; startsAt: string; endsAt: string;
    items: Array<{ type: "paper"; startsAt: string; endsAt: string; title: string; speaker: string; organization: string | null; authors: Prisma.JsonValue } | { type: "break"; startsAt: string; endsAt: string; label: string }>;
  }>;
};

/** Đọc lại bản chương trình đã lưu, kiểm tra hình dạng trước khi dùng (dữ liệu JSON không có kiểu). */
export function readProgramSnapshot(value: Prisma.JsonValue): ProgramSnapshot {
  const snapshot = value as ProgramSnapshot | null;
  if (!snapshot || typeof snapshot !== "object" || !snapshot.conference || !Array.isArray(snapshot.sessions) || snapshot.sessions.some((session) => !Array.isArray(session?.items))) {
    throw new ConflictException({ message: "Bản chương trình đã lưu không đọc được." });
  }
  return snapshot;
}

function toScheduleInput(session: SessionRecord): ScheduleSessionInput {
  return {
    id: session.id, kind: session.kind, name: session.name, room: session.room, startsAt: session.startsAt, endsAt: session.endsAt, slotMinutes: session.slotMinutes,
    breaks: session.breaks.map((item) => ({ startsAt: item.startsAt, endsAt: item.endsAt, label: item.label })),
    slots: session.slots.map((slot) => ({ paperId: slot.paperId, ownerId: slot.paper.ownerId, position: slot.position, manuallyAdjusted: slot.manuallyAdjusted, startsAt: slot.startsAt, endsAt: slot.endsAt }))
  };
}

function speakerName(invitation: { fullName: string; academicTitle: string | null }) {
  return [invitation.academicTitle, invitation.fullName].filter(Boolean).join(" ");
}

@Injectable()
export class ConferenceProgramService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly storage: ObjectStorage,
    private readonly fileConfig: FileModuleConfig = defaultFileConfig()
  ) {}

  private async loadConference(actor: SafeUserContext, conferenceId: string, action?: ConferenceAction) {
    const conference = await this.prisma.scientificConference.findUnique({ where: { id: conferenceId }, include: CONFERENCE_INCLUDE });
    if (!conference || !canReadConferenceManagement(actor, conferenceFacts(conference))) conferenceNotFound();
    if (action && !canConference(actor, conferenceFacts(conference), action)) {
      throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: action === "program.manage" ? "Chỉ chuyên viên phụ trách lập chương trình, sau khi đã đóng nhận bài." : "Chỉ chuyên viên phụ trách tải kỷ yếu, sau khi đã có chương trình." });
    }
    return conference;
  }

  private async loadSessions(conferenceId: string) {
    return this.prisma.conferenceSession.findMany({ where: { conferenceId }, include: SESSION_INCLUDE, orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }, { name: "asc" }] });
  }

  private markChanged(tx: Prisma.TransactionClient, conferenceId: string) {
    return tx.scientificConference.update({ where: { id: conferenceId }, data: { programChangedAt: new Date() } });
  }

  // ---- Đọc ----

  /** Chương trình đang lập: phiên, khoảng nghỉ, báo cáo (giờ tính lại theo thuật toán), cảnh báo, báo cáo chưa xếp. */
  async getProgram(actor: SafeUserContext, conferenceId: string) {
    const conference = await this.loadConference(actor, conferenceId);
    const [sessions, papers, versions, proceedings] = await Promise.all([
      this.loadSessions(conferenceId),
      this.prisma.conferencePaper.findMany({ where: { conferenceId, status: { in: SCHEDULABLE_PAPER_STATUSES } }, select: { id: true, title: true, ownerId: true, status: true, invitation: { select: { fullName: true, academicTitle: true } }, slot: { select: { id: true } } }, orderBy: { createdAt: "asc" } }),
      this.prisma.conferenceProgramVersion.findMany({ where: { conferenceId }, orderBy: { versionNumber: "desc" }, select: { id: true, versionNumber: true, publishedAt: true, publishedBy: { select: { displayName: true } } } }),
      this.prisma.conferenceProceedings.findMany({ where: { conferenceId }, orderBy: { versionNumber: "desc" }, include: { file: { select: { originalFileName: true, sizeBytes: true } }, uploadedBy: { select: { displayName: true } } } })
    ]);
    const schedule = scheduleProgram(sessions.map(toScheduleInput), conference.defaultSlotMinutes);
    const computed = new Map(schedule.sessions.flatMap((session) => session.slots.map((slot) => [slot.paperId, slot] as const)));
    const latest = versions[0] ?? null;
    return {
      defaultSlotMinutes: conference.defaultSlotMinutes,
      // Đã sửa sau lần chốt gần nhất: cần chốt lại và gửi thông báo thay đổi.
      changedSincePublish: !!latest && !!conference.programChangedAt && conference.programChangedAt > latest.publishedAt,
      sessions: sessions.map((session) => ({
        id: session.id, kind: session.kind, name: session.name, room: session.room, chairName: session.chairName, secretaryName: session.secretaryName,
        startsAt: session.startsAt, endsAt: session.endsAt, slotMinutes: session.slotMinutes, sortOrder: session.sortOrder,
        breaks: session.breaks.map((item) => ({ id: item.id, label: item.label, startsAt: item.startsAt, endsAt: item.endsAt })),
        slots: session.slots.map((slot) => {
          const time = computed.get(slot.paperId);
          return {
            id: slot.id, paperId: slot.paperId, position: slot.position, manuallyAdjusted: slot.manuallyAdjusted,
            title: slot.paper.title, speaker: speakerName(slot.paper.invitation), paperStatus: slot.paper.status,
            startsAt: time?.startsAt ?? slot.startsAt, endsAt: time?.endsAt ?? slot.endsAt, overflowMinutes: time?.overflowMinutes ?? 0
          };
        })
      })),
      issues: schedule.issues,
      unscheduled: papers.filter((paper) => !paper.slot).map((paper) => ({ id: paper.id, title: paper.title, speaker: speakerName(paper.invitation) })),
      versions,
      proceedings: proceedings.map((item) => ({ id: item.id, versionNumber: item.versionNumber, isbn: item.isbn, note: item.note, uploadedAt: item.uploadedAt, uploadedBy: item.uploadedBy, fileName: item.file.originalFileName, sizeBytes: item.file.sizeBytes }))
    };
  }

  /** Bản chương trình đã chốt mới nhất và kỷ yếu mới nhất: khách mời đã nhận lời và người quản lý xem được. */
  async publishedForViewer(actor: SafeUserContext, conferenceId: string) {
    const conference = await this.prisma.scientificConference.findUnique({ where: { id: conferenceId }, include: CONFERENCE_INCLUDE });
    if (!conference) conferenceNotFound();
    if (!canReadConferenceManagement(actor, conferenceFacts(conference))) {
      const invitation = await this.prisma.conferenceInvitation.findFirst({ where: { conferenceId, userId: actor.id, status: { in: ["sent", "accepted"] } } });
      if (!isConferenceParticipant(actor, invitation) || invitation!.status !== "accepted") conferenceNotFound();
    }
    const [program, proceedings] = await Promise.all([
      this.prisma.conferenceProgramVersion.findFirst({ where: { conferenceId }, orderBy: { versionNumber: "desc" } }),
      this.prisma.conferenceProceedings.findFirst({ where: { conferenceId }, orderBy: { versionNumber: "desc" }, include: { file: { select: { originalFileName: true, sizeBytes: true } } } })
    ]);
    return {
      program: program ? { versionNumber: program.versionNumber, publishedAt: program.publishedAt, snapshot: readProgramSnapshot(program.snapshot) } : null,
      proceedings: proceedings ? { id: proceedings.id, versionNumber: proceedings.versionNumber, isbn: proceedings.isbn, note: proceedings.note, uploadedAt: proceedings.uploadedAt, fileName: proceedings.file.originalFileName, sizeBytes: proceedings.file.sizeBytes } : null
    };
  }

  // ---- Phiên, khoảng nghỉ ----

  private async assertWithinConference(conference: { startsAt: Date; endsAt: Date }, input: SessionInputDto) {
    if (input.startsAt < conference.startsAt || input.endsAt > conference.endsAt) throw new BadRequestException({ message: "Phiên phải nằm trong thời gian tổ chức hội nghị." });
  }

  async updateSettings(actor: SafeUserContext, conferenceId: string, input: ProgramSettingsDto) {
    await this.loadConference(actor, conferenceId, "program.manage");
    await this.prisma.$transaction(async (tx) => {
      await lockAndRecheck(tx, actor, conferenceId, "program.manage");
      await tx.scientificConference.update({ where: { id: conferenceId }, data: { defaultSlotMinutes: input.defaultSlotMinutes, programChangedAt: new Date() } });
      await recordConferenceEvent(tx, { conferenceId, actorId: actor.id, action: "program.settings", facts: { defaultSlotMinutes: input.defaultSlotMinutes } });
    });
    return this.getProgram(actor, conferenceId);
  }

  async createSession(actor: SafeUserContext, conferenceId: string, input: SessionInputDto) {
    const conference = await this.loadConference(actor, conferenceId, "program.manage");
    await this.assertWithinConference(conference, input);
    await this.prisma.$transaction(async (tx) => {
      await lockAndRecheck(tx, actor, conferenceId, "program.manage");
      const { breaks, ...data } = input;
      const session = await tx.conferenceSession.create({ data: { ...data, conferenceId, breaks: { create: breaks } } });
      await this.markChanged(tx, conferenceId);
      await recordConferenceEvent(tx, { conferenceId, actorId: actor.id, action: "program.session-create", facts: { sessionId: session.id, name: session.name, kind: session.kind } });
    });
    return this.getProgram(actor, conferenceId);
  }

  private async loadSession(conferenceId: string, sessionId: string) {
    const session = await this.prisma.conferenceSession.findFirst({ where: { id: sessionId, conferenceId } });
    if (!session) throw new NotFoundException({ message: "Không tìm thấy phiên." });
    return session;
  }

  async updateSession(actor: SafeUserContext, conferenceId: string, sessionId: string, input: SessionInputDto) {
    const conference = await this.loadConference(actor, conferenceId, "program.manage");
    await this.loadSession(conferenceId, sessionId);
    await this.assertWithinConference(conference, input);
    await this.prisma.$transaction(async (tx) => {
      await lockAndRecheck(tx, actor, conferenceId, "program.manage");
      const { breaks, ...data } = input;
      await tx.conferenceSession.update({ where: { id: sessionId }, data });
      // Khoảng nghỉ là cấu hình của phiên: thay cả danh sách.
      await tx.conferenceSessionBreak.deleteMany({ where: { sessionId } });
      if (breaks.length) await tx.conferenceSessionBreak.createMany({ data: breaks.map((item) => ({ ...item, sessionId })) });
      await this.markChanged(tx, conferenceId);
      await recordConferenceEvent(tx, { conferenceId, actorId: actor.id, action: "program.session-update", facts: { sessionId, name: input.name } });
    });
    return this.getProgram(actor, conferenceId);
  }

  /** Xoá phiên đang lập: báo cáo trong phiên trở về danh sách chưa xếp. Bản chương trình đã chốt vẫn giữ nguyên. */
  async deleteSession(actor: SafeUserContext, conferenceId: string, sessionId: string) {
    await this.loadConference(actor, conferenceId, "program.manage");
    const session = await this.loadSession(conferenceId, sessionId);
    await this.prisma.$transaction(async (tx) => {
      await lockAndRecheck(tx, actor, conferenceId, "program.manage");
      await tx.conferenceSession.delete({ where: { id: sessionId } });
      await this.markChanged(tx, conferenceId);
      await recordConferenceEvent(tx, { conferenceId, actorId: actor.id, action: "program.session-delete", facts: { sessionId, name: session.name } });
    });
    return this.getProgram(actor, conferenceId);
  }

  // ---- Báo cáo trong phiên ----

  /**
   * Đặt danh sách báo cáo của một phiên theo thứ tự (theo danh sách trưởng tiểu ban gửi). Báo cáo đang ở phiên khác
   * được chuyển sang; báo cáo bỏ khỏi danh sách trở về chưa xếp. Giờ đặt tay được giữ nếu báo cáo vẫn ở phiên này.
   */
  async setSessionSlots(actor: SafeUserContext, conferenceId: string, sessionId: string, input: SessionSlotsDto) {
    await this.loadConference(actor, conferenceId, "program.manage");
    await this.loadSession(conferenceId, sessionId);
    await this.prisma.$transaction(async (tx) => {
      await lockAndRecheck(tx, actor, conferenceId, "program.manage");
      const papers = await tx.conferencePaper.findMany({ where: { id: { in: input.paperIds }, conferenceId } });
      if (papers.length !== input.paperIds.length) throw new BadRequestException({ message: "Có báo cáo không thuộc hội nghị này." });
      const notReady = papers.filter((paper) => !SCHEDULABLE_PAPER_STATUSES.includes(paper.status));
      if (notReady.length) throw new BadRequestException({ message: `Chỉ xếp được báo cáo đã nộp toàn văn (${notReady.length} báo cáo chưa đủ).` });
      const existing = await tx.conferenceSessionSlot.findMany({ where: { paperId: { in: input.paperIds } } });
      const kept = new Map(existing.filter((slot) => slot.sessionId === sessionId).map((slot) => [slot.paperId, slot]));
      await tx.conferenceSessionSlot.deleteMany({ where: { OR: [{ sessionId, paperId: { notIn: input.paperIds } }, { paperId: { in: input.paperIds }, sessionId: { not: sessionId } }] } });
      for (const [position, paperId] of input.paperIds.entries()) {
        const slot = kept.get(paperId);
        if (slot) await tx.conferenceSessionSlot.update({ where: { id: slot.id }, data: { position } });
        else await tx.conferenceSessionSlot.create({ data: { sessionId, paperId, position } });
      }
      await this.markChanged(tx, conferenceId);
      await recordConferenceEvent(tx, { conferenceId, actorId: actor.id, action: "program.slots", facts: { sessionId, count: input.paperIds.length } });
    });
    return this.getProgram(actor, conferenceId);
  }

  /** Đặt giờ tay cho một báo cáo (giữ nguyên khi xếp lại) hoặc bỏ đặt tay để hệ thống xếp. */
  async setSlotTime(actor: SafeUserContext, conferenceId: string, slotId: string, input: SlotTimeDto) {
    await this.loadConference(actor, conferenceId, "program.manage");
    const slot = await this.prisma.conferenceSessionSlot.findFirst({ where: { id: slotId, session: { conferenceId } } });
    if (!slot) throw new NotFoundException({ message: "Không tìm thấy báo cáo trong phiên." });
    await this.prisma.$transaction(async (tx) => {
      await lockAndRecheck(tx, actor, conferenceId, "program.manage");
      await tx.conferenceSessionSlot.update({ where: { id: slotId }, data: "clear" in input ? { manuallyAdjusted: false, startsAt: null, endsAt: null } : { manuallyAdjusted: true, startsAt: input.startsAt, endsAt: input.endsAt } });
      await this.markChanged(tx, conferenceId);
    });
    return this.getProgram(actor, conferenceId);
  }

  // ---- Chốt chương trình ----

  /**
   * Chốt chương trình: tính lại giờ, chặn khi còn lỗi (vượt khung, trùng giờ, trùng phòng, phiên toàn thể song song),
   * cần xác nhận khi còn báo cáo đã nộp toàn văn mà chưa xếp. Lưu một bản bất biến, đánh dấu báo cáo đã xếp lịch,
   * và chuyển hội nghị sang "đã gửi chương trình". Gửi thư là bước riêng (thư loại "program").
   */
  async publish(actor: SafeUserContext, conferenceId: string, input: PublishProgramDto) {
    await this.loadConference(actor, conferenceId, "program.manage");
    const result = await this.prisma.$transaction(async (tx) => {
      const current = await lockAndRecheck(tx, actor, conferenceId, "program.manage");
      const sessions = await tx.conferenceSession.findMany({ where: { conferenceId }, include: SESSION_INCLUDE, orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }, { name: "asc" }] });
      if (!sessions.length) throw new BadRequestException({ message: "Chưa có phiên nào." });
      // Bản chốt bất biến: không đưa vào báo cáo đã rút hoặc chưa nộp toàn văn dù còn sót trong phiên.
      const unready = sessions.flatMap((session) => session.slots).filter((slot) => !SCHEDULABLE_PAPER_STATUSES.includes(slot.paper.status));
      if (unready.length) throw new ConflictException({ code: "PROGRAM_INVALID", message: `Có ${unready.length} báo cáo đã rút hoặc chưa nộp toàn văn còn trong phiên. Bỏ khỏi phiên trước khi chốt chương trình.` });
      if (sessions.some((session) => session.startsAt < current.startsAt || session.endsAt > current.endsAt)) {
        throw new BadRequestException({ message: "Có phiên nằm ngoài thời gian tổ chức hội nghị. Sửa phiên trước khi chốt chương trình." });
      }
      const schedule = scheduleProgram(sessions.map(toScheduleInput), current.defaultSlotMinutes);
      if (schedule.issues.length) throw new ConflictException({ code: "PROGRAM_INVALID", message: `Chương trình còn ${schedule.issues.length} lỗi cần sửa trước khi chốt.`, issues: schedule.issues });
      const scheduledIds = sessions.flatMap((session) => session.slots.map((slot) => slot.paperId));
      const unscheduled = await tx.conferencePaper.count({ where: { conferenceId, status: { in: SCHEDULABLE_PAPER_STATUSES }, id: { notIn: scheduledIds } } });
      if (unscheduled && !input.acknowledgeUnscheduled) throw new ConflictException({ code: "PROGRAM_UNSCHEDULED", message: `Còn ${unscheduled} báo cáo đã nộp toàn văn chưa được xếp vào phiên nào.`, unscheduled });
      const times = new Map(schedule.sessions.flatMap((session) => session.slots.map((slot) => [slot.paperId, slot] as const)));
      for (const session of sessions) for (const slot of session.slots) {
        const time = times.get(slot.paperId)!;
        if (!slot.manuallyAdjusted) await tx.conferenceSessionSlot.update({ where: { id: slot.id }, data: { startsAt: time.startsAt, endsAt: time.endsAt } });
      }
      const snapshot: ProgramSnapshot = {
        conference: { title: current.title, code: current.code, location: current.location, startsAt: current.startsAt.toISOString(), endsAt: current.endsAt.toISOString(), hostUnitName: current.hostOrganizationUnit.name },
        sessions: sessions.map((session) => ({
          kind: session.kind, name: session.name, room: session.room, chairName: session.chairName, secretaryName: session.secretaryName, startsAt: session.startsAt.toISOString(), endsAt: session.endsAt.toISOString(),
          items: [
            ...session.slots.map((slot) => {
              const time = times.get(slot.paperId)!;
              const invitation = slot.paper.invitation;
              return { type: "paper" as const, startsAt: time.startsAt.toISOString(), endsAt: time.endsAt.toISOString(), title: slot.paper.title ?? "", speaker: speakerName(invitation), organization: invitation.organizationUnit?.name ?? invitation.externalOrganization ?? null, authors: slot.paper.authors ?? [] };
            }),
            ...session.breaks.map((item) => ({ type: "break" as const, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), label: item.label }))
          ].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        }))
      };
      const last = await tx.conferenceProgramVersion.findFirst({ where: { conferenceId }, orderBy: { versionNumber: "desc" } });
      const version = await tx.conferenceProgramVersion.create({ data: { conferenceId, versionNumber: (last?.versionNumber ?? 0) + 1, snapshot, publishedById: actor.id } });
      await tx.conferencePaper.updateMany({ where: { conferenceId, id: { in: scheduledIds }, status: "full_paper_submitted" }, data: { status: "scheduled" } });
      // Báo cáo bị bỏ khỏi chương trình ở lần chốt này trở về "đã nộp toàn văn".
      await tx.conferencePaper.updateMany({ where: { conferenceId, status: "scheduled", id: { notIn: scheduledIds } }, data: { status: "full_paper_submitted" } });
      // programChangedAt = thời điểm chốt: chương trình khớp với bản vừa chốt.
      await tx.scientificConference.update({ where: { id: conferenceId }, data: { status: "program_published", programChangedAt: version.publishedAt } });
      await recordConferenceEvent(tx, { conferenceId, actorId: actor.id, action: "program.publish", fromStatus: current.status, toStatus: "program_published", facts: { versionNumber: version.versionNumber, papers: scheduledIds.length, unscheduled } });
      return { versionNumber: version.versionNumber, papers: scheduledIds.length, unscheduled };
    });
    await this.auditLog.record({ action: "publish-conference-program", result: "success", actorId: actor.id, targetEntity: "scientific-conference", targetEntityId: conferenceId, username: actor.username, afterFacts: result });
    return result;
  }

  // ---- Kỷ yếu ----

  async uploadProceedings(actor: SafeUserContext, conferenceId: string, input: ProceedingsInputDto, file: UploadedProceedingsFile | undefined) {
    await this.loadConference(actor, conferenceId, "proceedings.manage");
    if (!file) throw new BadRequestException({ message: "Chưa chọn tệp kỷ yếu." });
    const originalFileName = readUploadFileName(file.originalname);
    assertValidUpload({ fileName: originalFileName, mimeType: file.mimetype, sizeBytes: file.size, content: file.buffer }, this.fileConfig);
    const fileId = randomUUID();
    const objectKey = `conferences/${conferenceId}/proceedings/${fileId}/${randomUUID()}${path.extname(originalFileName).toLowerCase()}`;
    await this.storage.putObject({ objectKey, content: file.buffer, mimeType: file.mimetype, sizeBytes: file.size });
    let versionNumber: number;
    try {
      versionNumber = await this.prisma.$transaction(async (tx) => {
        await lockAndRecheck(tx, actor, conferenceId, "proceedings.manage");
        await tx.fileRecord.create({
          data: { id: fileId, relatedEntityType: CONFERENCE_PROCEEDINGS_ENTITY_TYPE, relatedEntityId: conferenceId, filePurpose: "CONFERENCE_PROCEEDINGS", documentType: "CONFERENCE_PROCEEDINGS", originalFileName, version: 1, mimeType: file.mimetype, sizeBytes: file.size, storageBucket: this.fileConfig.bucketName ?? "rtms-files", storageObjectKey: objectKey, uploadedById: actor.id, status: "active" }
        });
        const last = await tx.conferenceProceedings.findFirst({ where: { conferenceId }, orderBy: { versionNumber: "desc" } });
        const created = await tx.conferenceProceedings.create({ data: { conferenceId, versionNumber: (last?.versionNumber ?? 0) + 1, fileId, isbn: input.isbn ?? null, note: input.note ?? null, uploadedById: actor.id } });
        await recordConferenceEvent(tx, { conferenceId, actorId: actor.id, action: "proceedings.upload", facts: { versionNumber: created.versionNumber, fileName: originalFileName } });
        return created.versionNumber;
      });
    } catch (error) {
      await this.storage.deleteObject?.(objectKey).catch(() => undefined);
      throw error;
    }
    await this.auditLog.record({ action: "upload-conference-proceedings", result: "success", actorId: actor.id, targetEntity: "scientific-conference", targetEntityId: conferenceId, username: actor.username, afterFacts: { versionNumber, fileId } });
    return this.getProgram(actor, conferenceId);
  }

  /** Tải kỷ yếu: người quản lý, theo dõi; khách mời đã nhận lời. */
  async downloadProceedings(actor: SafeUserContext, conferenceId: string, proceedingsId: string) {
    await this.publishedForViewer(actor, conferenceId);
    const item = await this.prisma.conferenceProceedings.findFirst({ where: { id: proceedingsId, conferenceId }, include: { file: true } });
    if (!item || item.file.relatedEntityType !== CONFERENCE_PROCEEDINGS_ENTITY_TYPE || item.file.relatedEntityId !== conferenceId || item.file.status !== "active") throw new NotFoundException({ message: "Không tìm thấy kỷ yếu." });
    let content: Awaited<ReturnType<ObjectStorage["getObject"]>>;
    try {
      content = await this.storage.getObject(item.file.storageObjectKey);
    } catch (error) {
      throw storageReadFailure(error);
    }
    await this.auditLog.record({ action: "download-conference-proceedings", result: "success", actorId: actor.id, targetEntity: "scientific-conference", targetEntityId: conferenceId, username: actor.username, reason: `proceedings:${proceedingsId}` });
    return { fileName: item.file.originalFileName, mimeType: item.file.mimeType, sizeBytes: item.file.sizeBytes, content };
  }
}
