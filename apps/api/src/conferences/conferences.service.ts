import type { Prisma } from "@prisma/client";
import { BadRequestException, ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import {
  canConference,
  canCreateConference,
  canReadConferenceManagement,
  conferenceActions,
  conferenceManagementFilter,
  CONFERENCE_OFFICER_ROLES,
  isConferenceParticipant
} from "./conference-access.js";
import {
  assertVersion,
  CONFERENCE_INCLUDE,
  conferenceFacts,
  conferenceNotFound,
  guardedConferenceUpdate,
  iso,
  issueConferenceCode,
  lockConference,
  recordConferenceEvent,
  stale,
  touchConference,
  vietnamYear,
  type ConferenceRecord
} from "./conference-support.js";
import { computeConferenceStats, type StatsConference, type StatsFilters } from "./conference-stats.js";
import { CONFERENCE_STATUS_LABELS, CONFERENCE_TRANSITIONS, type ConferenceStatus, type ConferenceTransition } from "./conference-workflow.js";
import { assertConferenceDates, type AssignOfficerDto, type ConferenceInfoDto, type UpdateConferenceDto, type VersionedReasonDto } from "./conferences.dto.js";

const INFO_FIELDS = ["title", "description", "level", "hostOrganizationUnitId", "location", "startsAt", "endsAt", "responseDeadline", "abstractDeadline", "fullPaperDeadline"] as const;

const MANAGEMENT_DETAIL_INCLUDE = {
  ...CONFERENCE_INCLUDE,
  invitations: {
    include: {
      organizationUnit: { select: { id: true, name: true } },
      user: { select: { id: true, displayName: true, status: true, unit: true } },
      paper: {
        include: {
          versions: { select: { id: true, kind: true, versionNumber: true, title: true, abstractText: true, submittedAt: true, file: { select: { id: true, originalFileName: true, sizeBytes: true } } }, orderBy: { versionNumber: "desc" } },
          revisionRequests: { orderBy: { requestedAt: "desc" }, include: { requestedBy: { select: { displayName: true } } } }
        }
      }
    },
    orderBy: { createdAt: "asc" }
  },
  mailings: { orderBy: { sentAt: "desc" }, include: { sentBy: { select: { displayName: true } }, recipients: { select: { status: true } } } },
  events: { orderBy: { createdAt: "desc" }, take: 300, include: { actor: { select: { displayName: true } } } }
} satisfies Prisma.ScientificConferenceInclude;

type ManagementDetail = Prisma.ScientificConferenceGetPayload<{ include: typeof MANAGEMENT_DETAIL_INCLUDE }>;

const PAPER_STATUS_LABELS: Record<string, string> = {
  awaiting_abstract: "Chưa nộp tóm tắt",
  abstract_submitted: "Đã nộp tóm tắt",
  full_paper_submitted: "Đã nộp toàn văn",
  scheduled: "Đã xếp lịch",
  withdrawn: "Đã rút"
};

const INVITATION_STATUS_LABELS: Record<string, string> = { draft: "Chưa gửi", sent: "Chờ trả lời", accepted: "Đã nhận lời", declined: "Từ chối", revoked: "Đã huỷ" };

@Injectable()
export class ConferencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService
  ) {}

  /** Thông tin chung: ai xem được hội nghị cũng thấy. */
  private presentInfo(conference: ConferenceRecord) {
    return {
      id: conference.id,
      code: conference.code,
      title: conference.title,
      description: conference.description,
      level: conference.level,
      status: conference.status,
      statusLabel: CONFERENCE_STATUS_LABELS[conference.status as ConferenceStatus] ?? conference.status,
      hostOrganizationUnit: conference.hostOrganizationUnit,
      location: conference.location,
      startsAt: conference.startsAt,
      endsAt: conference.endsAt,
      responseDeadline: conference.responseDeadline,
      abstractDeadline: conference.abstractDeadline,
      fullPaperDeadline: conference.fullPaperDeadline,
      cancelReason: conference.cancelReason
    };
  }

  private presentSummary(actor: SafeUserContext, conference: ConferenceRecord, counts?: Record<string, number>) {
    const officer = conference.officers[0]?.user ?? null;
    return {
      ...this.presentInfo(conference),
      officer: officer ? { id: officer.id, displayName: officer.displayName } : null,
      createdBy: conference.createdBy,
      version: iso(conference.updatedAt),
      counts: counts ?? null,
      viewer: { actions: conferenceActions(actor, conferenceFacts(conference)) }
    };
  }

  private async findRecord(id: string) {
    const conference = await this.prisma.scientificConference.findUnique({ where: { id }, include: CONFERENCE_INCLUDE });
    if (!conference) conferenceNotFound();
    return conference;
  }

  /** Hội nghị mà người dùng được đọc bản quản lý; ngược lại báo không tìm thấy. */
  async loadManaged(actor: SafeUserContext, id: string) {
    const conference = await this.findRecord(id);
    if (!canReadConferenceManagement(actor, conferenceFacts(conference))) conferenceNotFound();
    return conference;
  }

  private async assertActiveUnit(organizationUnitId: string) {
    const unit = await this.prisma.organizationUnit.findUnique({ where: { id: organizationUnitId } });
    if (!unit || unit.status !== "active") throw new BadRequestException({ message: "Đơn vị không tồn tại hoặc đã ngừng hoạt động." });
    return unit;
  }

  // ---- Tạo, sửa ----

  async create(actor: SafeUserContext, input: ConferenceInfoDto) {
    if (!canCreateConference(actor, input.hostOrganizationUnitId)) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chỉ Trưởng phòng KHQS tạo hội nghị cho đơn vị trong phạm vi của mình." });
    await this.assertActiveUnit(input.hostOrganizationUnitId);
    const created = await this.prisma.$transaction(async (tx) => {
      const code = await issueConferenceCode(tx, vietnamYear(input.startsAt));
      const conference = await tx.scientificConference.create({ data: { ...input, code, status: "draft", createdById: actor.id } });
      await recordConferenceEvent(tx, { conferenceId: conference.id, actorId: actor.id, action: "create", toStatus: "draft", facts: { code } });
      return conference;
    });
    await this.auditLog.record({ action: "create-scientific-conference", result: "success", actorId: actor.id, targetEntity: "scientific-conference", targetEntityId: created.id, username: actor.username, afterFacts: { code: created.code, hostOrganizationUnitId: created.hostOrganizationUnitId } });
    return this.detail(actor, created.id);
  }

  async update(actor: SafeUserContext, id: string, input: UpdateConferenceDto) {
    const conference = await this.loadManaged(actor, id);
    const facts = conferenceFacts(conference);
    if (!canConference(actor, facts, "edit")) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chỉ Trưởng phòng hoặc chuyên viên phụ trách sửa được hội nghị chưa kết thúc." });
    assertVersion(conference, input.version);
    if (input.hostOrganizationUnitId && input.hostOrganizationUnitId !== conference.hostOrganizationUnitId) {
      // Đổi đơn vị chủ trì đổi phạm vi quản lý: chỉ Trưởng phòng, và chỉ sang đơn vị trong phạm vi của mình.
      if (!canCreateConference(actor, input.hostOrganizationUnitId)) throw new ForbiddenException({ code: "ORG_SCOPE_DENIED", message: "Chỉ Trưởng phòng đổi được đơn vị chủ trì, sang đơn vị trong phạm vi của mình." });
      await this.assertActiveUnit(input.hostOrganizationUnitId);
    }
    const current = conference as Record<string, unknown>;
    const changed = INFO_FIELDS.filter((key) => key in input && iso(input[key]) !== iso(current[key]));
    if (!changed.length) return this.detail(actor, id);
    const next = { ...conference, ...Object.fromEntries(changed.map((key) => [key, input[key]])) } as ConferenceRecord;
    assertConferenceDates(next);
    const data = Object.fromEntries(changed.map((key) => [key, input[key] ?? null])) as Prisma.ScientificConferenceUpdateManyMutationInput;
    const before = Object.fromEntries(changed.map((key) => [key, iso(current[key]) || null]));
    const after = Object.fromEntries(changed.map((key) => [key, iso(input[key]) || null]));
    const invitationsSent = await this.prisma.conferenceMailing.count({ where: { conferenceId: id } });
    await this.prisma.$transaction(async (tx) => {
      if (!(await guardedConferenceUpdate(tx, conference, input.version, data))) stale();
      await recordConferenceEvent(tx, { conferenceId: id, actorId: actor.id, action: "update", fromStatus: conference.status, toStatus: conference.status, facts: { fields: [...changed], before, after } });
    });
    await this.auditLog.record({ action: "update-scientific-conference", result: "success", actorId: actor.id, targetEntity: "scientific-conference", targetEntityId: id, username: actor.username, beforeFacts: before, afterFacts: after });
    const detail = await this.detail(actor, id);
    // Đã gửi thư mà đổi thời gian, địa điểm hoặc hạn: gợi ý chuyên viên gửi thông báo thay đổi.
    const noticeSuggested = invitationsSent > 0 && changed.some((key) => key === "startsAt" || key === "endsAt" || key === "location" || key === "responseDeadline" || key === "abstractDeadline" || key === "fullPaperDeadline");
    return { ...detail, changeNoticeSuggested: noticeSuggested };
  }

  // ---- Chuyên viên phụ trách ----

  async officerCandidates(actor: SafeUserContext) {
    if (actor.systemRole !== "RESEARCH_MANAGEMENT_HEAD") throw new ForbiddenException({ code: "ACTION_NOT_GRANTED" });
    return this.prisma.user.findMany({ where: { status: "active", systemRole: { in: CONFERENCE_OFFICER_ROLES } }, select: { id: true, displayName: true, username: true, unit: true }, orderBy: { displayName: "asc" }, take: 500 });
  }

  async assignOfficer(actor: SafeUserContext, id: string, input: AssignOfficerDto) {
    const conference = await this.loadManaged(actor, id);
    if (!canConference(actor, conferenceFacts(conference), "officer.assign")) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chỉ Trưởng phòng giao chuyên viên phụ trách hội nghị chưa kết thúc." });
    assertVersion(conference, input.version);
    const officer = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!officer || officer.status !== "active" || !CONFERENCE_OFFICER_ROLES.includes(officer.systemRole ?? "")) throw new BadRequestException({ message: "Chuyên viên phụ trách phải là chuyên viên QLKH đang hoạt động." });
    const previous = conference.officers[0] ?? null;
    if (previous?.userId === officer.id) return this.detail(actor, id);
    await this.prisma.$transaction(async (tx) => {
      await lockConference(tx, id);
      const current = await tx.scientificConference.findUnique({ where: { id } });
      if (!current || iso(current.updatedAt) !== input.version) stale();
      // Tách nhiệm vụ: người đang là khách mời của hội nghị không phụ trách chính hội nghị đó.
      const invited = await tx.conferenceInvitation.findFirst({ where: { conferenceId: id, status: { in: ["draft", "sent", "accepted"] }, OR: [{ userId: officer.id }, ...(officer.credentialEmail ? [{ email: officer.credentialEmail.toLowerCase() }] : [])] } });
      if (invited) throw new ConflictException({ code: "CONFLICT_DENIED", message: "Người này đang là khách mời của hội nghị nên không thể làm chuyên viên phụ trách." });
      const now = new Date();
      if (previous) await tx.conferenceOfficer.update({ where: { id: previous.id }, data: { revokedAt: now } });
      await tx.conferenceOfficer.create({ data: { conferenceId: id, userId: officer.id, assignedById: actor.id, assignedAt: now, reason: input.reason ?? null } });
      const toStatus = current.status === "draft" ? "preparing" : current.status;
      await tx.scientificConference.update({ where: { id }, data: { status: toStatus, updatedAt: now } });
      await recordConferenceEvent(tx, { conferenceId: id, actorId: actor.id, action: previous ? "officer.reassign" : "officer.assign", fromStatus: current.status, toStatus, reason: input.reason ?? null, facts: { officerId: officer.id, previousOfficerId: previous?.userId ?? null } });
    });
    await this.auditLog.record({ action: previous ? "reassign-conference-officer" : "assign-conference-officer", result: "success", actorId: actor.id, targetEntity: "scientific-conference", targetEntityId: id, username: actor.username, reason: input.reason, beforeFacts: { officerId: previous?.userId ?? null }, afterFacts: { officerId: officer.id } });
    return this.detail(actor, id);
  }

  async revokeOfficer(actor: SafeUserContext, id: string, input: VersionedReasonDto) {
    const conference = await this.loadManaged(actor, id);
    if (!canConference(actor, conferenceFacts(conference), "officer.assign")) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chỉ Trưởng phòng thu hồi chuyên viên phụ trách." });
    assertVersion(conference, input.version);
    if (!input.reason) throw new BadRequestException({ message: "Cần nêu lý do thu hồi." });
    const previous = conference.officers[0];
    if (!previous) throw new BadRequestException({ message: "Hội nghị chưa có chuyên viên phụ trách." });
    await this.prisma.$transaction(async (tx) => {
      await lockConference(tx, id);
      const current = await tx.scientificConference.findUnique({ where: { id } });
      if (!current || iso(current.updatedAt) !== input.version) stale();
      await tx.conferenceOfficer.update({ where: { id: previous.id }, data: { revokedAt: new Date(), reason: input.reason } });
      await touchConference(tx, id);
      await recordConferenceEvent(tx, { conferenceId: id, actorId: actor.id, action: "officer.revoke", reason: input.reason, facts: { officerId: previous.userId } });
    });
    await this.auditLog.record({ action: "revoke-conference-officer", result: "success", actorId: actor.id, targetEntity: "scientific-conference", targetEntityId: id, username: actor.username, reason: input.reason, beforeFacts: { officerId: previous.userId } });
    return this.detail(actor, id);
  }

  // ---- Chuyển trạng thái ----

  async transition(actor: SafeUserContext, id: string, action: ConferenceTransition, input: VersionedReasonDto) {
    const rule = CONFERENCE_TRANSITIONS[action];
    const conference = await this.loadManaged(actor, id);
    if (!canConference(actor, conferenceFacts(conference), action)) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Không thực hiện được thao tác này ở trạng thái hiện tại của hội nghị." });
    assertVersion(conference, input.version);
    if (rule.reasonRequired && !input.reason) throw new BadRequestException({ message: "Cần nêu lý do." });
    if (action === "complete" && conference.endsAt.getTime() > Date.now()) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Chỉ kết thúc được hội nghị sau ngày tổ chức." });
    await this.prisma.$transaction(async (tx) => {
      const data: Prisma.ScientificConferenceUpdateManyMutationInput = { status: rule.to };
      if (action === "cancel") data.cancelReason = input.reason ?? null;
      if (!(await guardedConferenceUpdate(tx, conference, input.version, data))) stale();
      await recordConferenceEvent(tx, { conferenceId: id, actorId: actor.id, action, fromStatus: conference.status, toStatus: rule.to, reason: input.reason ?? null });
    });
    await this.auditLog.record({ action: `${action}-scientific-conference`, result: "success", actorId: actor.id, targetEntity: "scientific-conference", targetEntityId: id, username: actor.username, reason: input.reason, beforeFacts: { status: conference.status }, afterFacts: { status: rule.to } });
    return this.detail(actor, id);
  }

  // ---- Đọc ----

  async list(actor: SafeUserContext) {
    const where = conferenceManagementFilter(actor);
    if (!where) return [];
    const conferences = await this.prisma.scientificConference.findMany({ where, include: CONFERENCE_INCLUDE, orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }], take: 500 });
    const readable = conferences.filter((conference) => canReadConferenceManagement(actor, conferenceFacts(conference)));
    if (!readable.length) return [];
    const ids = readable.map((conference) => conference.id);
    const [invitationCounts, paperCounts] = await Promise.all([
      this.prisma.conferenceInvitation.groupBy({ by: ["conferenceId", "status"], where: { conferenceId: { in: ids } }, _count: { _all: true } }),
      this.prisma.conferencePaper.groupBy({ by: ["conferenceId", "status"], where: { conferenceId: { in: ids } }, _count: { _all: true } })
    ]);
    return readable.map((conference) => {
      const counts: Record<string, number> = { invited: 0, accepted: 0, declined: 0, awaitingAbstract: 0, abstracts: 0, fullPapers: 0 };
      for (const row of invitationCounts.filter((item) => item.conferenceId === conference.id)) {
        if (row.status !== "draft" && row.status !== "revoked") counts.invited += row._count._all;
        if (row.status === "accepted") counts.accepted += row._count._all;
        if (row.status === "declined") counts.declined += row._count._all;
      }
      for (const row of paperCounts.filter((item) => item.conferenceId === conference.id)) {
        if (row.status === "awaiting_abstract") counts.awaitingAbstract += row._count._all;
        if (row.status === "abstract_submitted" || row.status === "full_paper_submitted" || row.status === "scheduled") counts.abstracts += row._count._all;
        if (row.status === "full_paper_submitted" || row.status === "scheduled") counts.fullPapers += row._count._all;
      }
      return this.presentSummary(actor, conference, counts);
    });
  }

  /** Chi tiết: bản quản lý cho người quản lý/theo dõi, bản khách mời cho người được mời. */
  async detail(actor: SafeUserContext, id: string) {
    const conference = await this.findRecord(id);
    const facts = conferenceFacts(conference);
    if (canReadConferenceManagement(actor, facts)) {
      const full = await this.prisma.scientificConference.findUnique({ where: { id }, include: MANAGEMENT_DETAIL_INCLUDE });
      if (!full) conferenceNotFound();
      return { mode: "management" as const, conference: this.presentManagement(actor, full) };
    }
    const invitation = await this.prisma.conferenceInvitation.findFirst({ where: { conferenceId: id, userId: actor.id } });
    if (!isConferenceParticipant(actor, invitation)) conferenceNotFound();
    return { mode: "participant" as const, conference: this.presentInfo(conference) };
  }

  private presentManagement(actor: SafeUserContext, conference: ManagementDetail) {
    const now = Date.now();
    const invitations = conference.invitations.map((invitation) => {
      const paper = invitation.paper;
      const latest = (kind: string) => paper?.versions.find((version) => version.kind === kind) ?? null;
      return {
        id: invitation.id,
        kind: invitation.kind,
        fullName: invitation.fullName,
        academicTitle: invitation.academicTitle,
        email: invitation.email,
        isInternal: invitation.isInternal,
        organizationUnit: invitation.organizationUnit,
        // Tài khoản phạm vi toàn Học viện không có đơn vị chính: hiện đơn vị ghi trên tài khoản.
        externalOrganization: invitation.externalOrganization ?? (!invitation.organizationUnit && invitation.user?.unit ? invitation.user.unit : null),
        hasAccount: !!invitation.userId,
        accountStatus: invitation.user?.status ?? null,
        status: invitation.status,
        statusLabel: INVITATION_STATUS_LABELS[invitation.status] ?? invitation.status,
        sentAt: invitation.sentAt,
        respondedAt: invitation.respondedAt,
        declineReason: invitation.declineReason,
        revokeReason: invitation.revokeReason,
        // Quá hạn trả lời chỉ là cờ để chuyên viên nhắc hoặc huỷ; lời mời không tự đổi trạng thái.
        responseOverdue: invitation.status === "sent" && !!conference.responseDeadline && conference.responseDeadline.getTime() < now,
        paper: paper ? {
          id: paper.id,
          title: paper.title,
          authors: paper.authors,
          status: paper.status,
          statusLabel: PAPER_STATUS_LABELS[paper.status] ?? paper.status,
          version: iso(paper.updatedAt),
          withdrawReason: paper.withdrawReason,
          latestAbstract: latest("abstract"),
          latestFullPaper: latest("full_paper"),
          versions: paper.versions,
          openRevisions: paper.revisionRequests.filter((request) => !request.resolvedAt).map((request) => ({ id: request.id, kind: request.kind, reason: request.reason, dueAt: request.dueAt, requestedAt: request.requestedAt, requestedBy: request.requestedBy })),
          revisionHistory: paper.revisionRequests.map((request) => ({ id: request.id, kind: request.kind, reason: request.reason, dueAt: request.dueAt, requestedAt: request.requestedAt, resolvedAt: request.resolvedAt, requestedBy: request.requestedBy }))
        } : null
      };
    });
    const mailings = conference.mailings.map((mailing) => ({
      id: mailing.id, kind: mailing.kind, subject: mailing.subject, message: mailing.message, sentAt: mailing.sentAt, sentBy: mailing.sentBy, recipientCount: mailing.recipientCount,
      sent: mailing.recipients.filter((recipient) => recipient.status === "sent").length,
      failed: mailing.recipients.filter((recipient) => recipient.status === "failed").length,
      skipped: mailing.recipients.filter((recipient) => recipient.status === "skipped").length
    }));
    const events = conference.events.map((event) => ({ id: event.id, action: event.action, fromStatus: event.fromStatus, toStatus: event.toStatus, reason: event.reason, facts: event.facts, actor: event.actor, paperId: event.paperId, invitationId: event.invitationId, createdAt: event.createdAt }));
    return { ...this.presentSummary(actor, conference), invitations, mailings, events };
  }

  /** Đơn vị chủ trì Trưởng phòng được chọn khi tạo hội nghị. */
  async hostUnits(actor: SafeUserContext) {
    if (!canCreateConference(actor)) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED" });
    const ids = actor.organizationScopes.map((scope) => scope.id);
    return this.prisma.organizationUnit.findMany({ where: { id: { in: ids }, status: "active" }, select: { id: true, code: true, name: true }, orderBy: { name: "asc" } });
  }

  // ---- Thống kê ----

  /**
   * Thống kê trên đúng các hội nghị người xem được đọc bản quản lý (cùng điều kiện với danh sách). Người không có
   * quyền xem hội nghị nào nhận `visible: false` để giao diện ẩn mục thống kê.
   */
  async stats(actor: SafeUserContext, filters: StatsFilters) {
    const where = conferenceManagementFilter(actor);
    if (!where) return { visible: false as const };
    const rows = await this.prisma.scientificConference.findMany({
      where,
      include: {
        ...CONFERENCE_INCLUDE,
        invitations: { select: { kind: true, status: true, isInternal: true, organizationUnit: { select: { name: true } }, user: { select: { unit: true } }, paper: { select: { status: true, versions: { select: { kind: true } } } } } },
        sessions: { select: { kind: true, name: true, _count: { select: { slots: true } } } }
      },
      take: 2000
    });
    const readable: StatsConference[] = rows.filter((row) => canReadConferenceManagement(actor, conferenceFacts(row))).map((row) => ({
      id: row.id, code: row.code, title: row.title, level: row.level, status: row.status, startsAt: row.startsAt,
      hostUnitId: row.hostOrganizationUnitId, hostUnitName: row.hostOrganizationUnit.name,
      invitations: row.invitations.map((invitation) => ({
        kind: invitation.kind, status: invitation.status, isInternal: invitation.isInternal, unitName: invitation.organizationUnit?.name ?? invitation.user?.unit ?? null,
        paper: invitation.paper ? { status: invitation.paper.status, hasAbstract: invitation.paper.versions.some((version) => version.kind === "abstract"), hasFullPaper: invitation.paper.versions.some((version) => version.kind === "full_paper") } : null
      })),
      sessions: row.sessions.map((session) => ({ kind: session.kind, name: session.name, papers: session._count.slots }))
    }));
    return { visible: true as const, ...computeConferenceStats(readable, filters) };
  }

  async statsXlsx(actor: SafeUserContext, filters: StatsFilters) {
    const result = await this.stats(actor, filters);
    if (!result.visible) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Không có hội nghị nào trong phạm vi của bạn." });
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "DocManS";
    workbook.created = new Date();
    const header = (sheet: ExcelJS.Worksheet) => { sheet.getRow(1).font = { bold: true }; sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } }; };
    const day = (value: Date) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }).format(value);
    const percent = (value: number | null) => (value === null ? "" : `${value}%`);
    const sheet = workbook.addWorksheet("Theo_hoi_nghi");
    sheet.columns = [
      { header: "STT", key: "stt", width: 5 }, { header: "Mã", key: "code", width: 14 }, { header: "Tên hội nghị", key: "title", width: 45 }, { header: "Ngày bắt đầu", key: "startsAt", width: 14 },
      { header: "Đơn vị chủ trì", key: "host", width: 28 }, { header: "Trạng thái", key: "status", width: 18 }, { header: "Đã mời", key: "invited", width: 10 }, { header: "Nhận lời", key: "accepted", width: 10 },
      { header: "Từ chối", key: "declined", width: 10 }, { header: "Tỉ lệ nhận lời", key: "acceptanceRate", width: 14 }, { header: "Báo cáo viên", key: "speakers", width: 12 },
      { header: "Đã nộp tóm tắt", key: "abstracts", width: 14 }, { header: "Đã nộp toàn văn", key: "fullPapers", width: 15 }, { header: "Tỉ lệ nộp toàn văn", key: "fullPaperRate", width: 16 },
      { header: "Đã xếp lịch", key: "scheduled", width: 12 }, { header: "Số phiên", key: "sessions", width: 10 }
    ];
    header(sheet);
    result.perConference.forEach((row, index) => sheet.addRow({ ...row, stt: index + 1, startsAt: day(row.startsAt), host: row.hostUnitName, status: CONFERENCE_STATUS_LABELS[row.status as ConferenceStatus] ?? row.status, acceptanceRate: percent(row.acceptanceRate), fullPaperRate: percent(row.fullPaperRate) }));
    const units = workbook.addWorksheet("Bao_cao_vien_theo_don_vi");
    units.columns = [{ header: "Đơn vị", key: "label", width: 40 }, { header: "Số báo cáo viên", key: "count", width: 16 }];
    header(units);
    result.speakersByUnit.forEach((row) => units.addRow(row));
    const tracks = workbook.addWorksheet("Theo_phien");
    tracks.columns = [{ header: "Hội nghị", key: "conferenceCode", width: 14 }, { header: "Loại", key: "kind", width: 16 }, { header: "Phiên", key: "name", width: 40 }, { header: "Số báo cáo", key: "papers", width: 12 }];
    header(tracks);
    result.tracks.forEach((row) => tracks.addRow({ ...row, kind: row.kind === "plenary" ? "Phiên toàn thể" : "Tiểu ban" }));
    await this.auditLog.record({ action: "export-conference-stats", result: "success", actorId: actor.id, targetEntity: "scientific-conference", targetEntityId: "stats", username: actor.username, afterFacts: { ...filters, conferences: result.perConference.length } });
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // ---- Xuất Excel ----

  async exportXlsx(actor: SafeUserContext, id: string) {
    const conference = await this.loadManaged(actor, id);
    if (!canConference(actor, conferenceFacts(conference), "export")) conferenceNotFound();
    const full = await this.prisma.scientificConference.findUnique({ where: { id }, include: MANAGEMENT_DETAIL_INCLUDE });
    if (!full) conferenceNotFound();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "DocManS";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet("Khach_moi");
    sheet.columns = [
      { header: "STT", key: "stt", width: 5 },
      { header: "Họ tên", key: "fullName", width: 30 },
      { header: "Học hàm, học vị", key: "academicTitle", width: 16 },
      { header: "Đơn vị", key: "unit", width: 32 },
      { header: "Email", key: "email", width: 30 },
      { header: "Loại", key: "kind", width: 14 },
      { header: "Lời mời", key: "status", width: 14 },
      { header: "Tên báo cáo", key: "paperTitle", width: 50 },
      { header: "Tình trạng bài", key: "paperStatus", width: 18 },
      { header: "Nộp tóm tắt", key: "abstractAt", width: 18 },
      { header: "Nộp toàn văn", key: "fullPaperAt", width: 18 },
      { header: "Đang chờ sửa", key: "revision", width: 14 }
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    const day = (value: Date | null | undefined) => (value ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(value) : "");
    full.invitations.forEach((invitation, index) => {
      const paper = invitation.paper;
      const latest = (kind: string) => paper?.versions.find((version) => version.kind === kind)?.submittedAt ?? null;
      sheet.addRow({
        stt: index + 1,
        fullName: invitation.fullName,
        academicTitle: invitation.academicTitle ?? "",
        unit: invitation.organizationUnit?.name ?? invitation.externalOrganization ?? invitation.user?.unit ?? "",
        email: invitation.email ?? "",
        kind: invitation.kind === "speaker" ? "Báo cáo viên" : "Đại biểu",
        status: INVITATION_STATUS_LABELS[invitation.status] ?? invitation.status,
        paperTitle: paper?.title ?? "",
        paperStatus: paper ? PAPER_STATUS_LABELS[paper.status] ?? paper.status : "",
        abstractAt: day(latest("abstract")),
        fullPaperAt: day(latest("full_paper")),
        revision: paper?.revisionRequests.some((request) => !request.resolvedAt) ? "Có" : ""
      });
    });
    await this.auditLog.record({ action: "export-scientific-conference", result: "success", actorId: actor.id, targetEntity: "scientific-conference", targetEntityId: id, username: actor.username });
    return { fileName: `Hoi_nghi_${full.code}.xlsx`, content: Buffer.from(await workbook.xlsx.writeBuffer()) };
  }
}
