import type { Prisma } from "@prisma/client";
import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import ExcelJS from "exceljs";
import { randomBytes } from "node:crypto";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PasswordService } from "../auth/password.service.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { MailService } from "../notifications/mail.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { absoluteLink, escapeHtml } from "../notifications/notification-events.js";
import { canConference, isConferenceParticipant } from "./conference-access.js";
import { conferenceMailLines, conferenceMailSubject, formatVietnamDateTime, formatVietnamTime, renderConferenceMailHtml, type ConferenceMailFacts } from "./conference-mail-templates.js";
import { readProgramSnapshot } from "./conference-program.service.js";
import { getOrganizationScopeIds } from "../proposals-shared/proposal-access.js";
import { CONFERENCE_INCLUDE, conferenceFacts, conferenceNotFound, lockAndRecheck, lockConference, recordConferenceEvent, stale, touchConference, type ConferenceRecord } from "./conference-support.js";
import { CONFERENCE_CLOSED_STATUSES, CONFERENCE_INVITABLE_STATUSES } from "./conference-workflow.js";
import { readEmail, readInvitationInput, type InvitationInputDto, type InvitationResponseDto, type MailingKind, type PublicInvitationResponseDto, type SendMailingDto, type UpdateInvitationDto } from "./conferences.dto.js";

const ACTIVATION_TTL_MS = 48 * 60 * 60 * 1000;
/** Mã trong thư dùng được tối thiểu 14 ngày, và tới khi hội nghị kết thúc nếu muộn hơn. */
const MIN_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const PUBLIC_WINDOW_MS = 15 * 60 * 1000;
const PUBLIC_MAX_FAILURES = 10;
/** Khoá theo IP lấy từ yêu cầu không đăng nhập: vượt ngưỡng thì dọn khoá hết hạn để Map không phình mãi (như AuthRateLimitService). */
const PUBLIC_MAX_TRACKED_IPS = 10_000;
/** Ghi nhiều token/lời mời trong một giao dịch: mặc định 5 giây của Prisma không đủ cho đợt thư lớn. */
const BULK_TRANSACTION_OPTIONS = { timeout: 30_000 };

/** Trạng thái lời mời được chọn làm người nhận theo từng loại thư. */
const MAILING_RECIPIENT_STATUSES: Record<MailingKind, string[]> = {
  invitation: ["draft", "sent"],
  reminder: ["sent", "accepted"],
  change_notice: ["sent", "accepted"],
  program: ["accepted"],
  proceedings: ["accepted"]
};

const INVITATION_INCLUDE = { organizationUnit: { select: { id: true, name: true } } } satisfies Prisma.ConferenceInvitationInclude;

type RequestContext = { ip?: string; userAgent?: string };

export type UploadedSheet = { originalname: string; mimetype: string; size: number; buffer: Buffer };

/** Thông tin hội nghị dùng trong thư. */
function mailFacts(conference: ConferenceRecord): ConferenceMailFacts {
  return {
    title: conference.title,
    location: conference.location,
    startsAt: conference.startsAt,
    endsAt: conference.endsAt,
    responseDeadline: conference.responseDeadline,
    abstractDeadline: conference.abstractDeadline,
    fullPaperDeadline: conference.fullPaperDeadline,
    hostUnitName: conference.hostOrganizationUnit.name
  };
}

/**
 * Đơn vị của người được mời có tài khoản: phạm vi chính, hoặc phạm vi duy nhất. Tài khoản nhiều phạm vi mà không có
 * phạm vi chính (lãnh đạo, chuyên viên phạm vi toàn Học viện) để trống: không tự chọn bừa một đơn vị. Đơn vị chỉ để
 * hiển thị và thống kê; tài khoản có sẵn không đổi.
 */
export function accountUnitId(scopes: Array<{ organizationUnitId: string; isPrimary: boolean }>) {
  return scopes.find((scope) => scope.isPrimary)?.organizationUnitId ?? (scopes.length === 1 ? scopes[0].organizationUnitId : null);
}

function uniqueViolation(error: unknown) {
  return (error as { code?: string })?.code === "P2002";
}

@Injectable()
export class ConferenceInvitationsService {
  private readonly logger = new Logger(ConferenceInvitationsService.name);
  /** Đếm lần dùng mã sai theo IP: đường link công khai không có đăng nhập. */
  private readonly publicFailures = new Map<string, { count: number; startedAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly passwords: PasswordService,
    @Optional() private readonly mail?: MailService,
    @Optional() private readonly notifications?: NotificationsService
  ) {}

  private async loadForAction(actor: SafeUserContext, conferenceId: string, action: "invitation.manage" | "mailing.send" | "proceedings.manage") {
    const conference = await this.prisma.scientificConference.findUnique({ where: { id: conferenceId }, include: CONFERENCE_INCLUDE });
    if (!conference) conferenceNotFound();
    const facts = conferenceFacts(conference);
    if (!canConference(actor, facts, action)) {
      if (!canConference(actor, facts, "export")) conferenceNotFound();
      throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chỉ chuyên viên phụ trách quản lý khách mời và gửi thư, khi hội nghị đã được giao và chưa kết thúc." });
    }
    return conference;
  }

  // ---- Khách mời ----

  /** Tài khoản có thể mời (tìm theo tên, tên đăng nhập, email). */
  async userCandidates(actor: SafeUserContext, conferenceId: string, keyword: string) {
    await this.loadForAction(actor, conferenceId, "invitation.manage");
    const term = typeof keyword === "string" ? keyword.trim().slice(0, 120) : "";
    if (term.length < 2) return [];
    return this.prisma.user.findMany({
      where: {
        status: { in: ["active", "pending_activation"] },
        systemRole: { not: "SYSTEM_ADMIN" },
        OR: [{ displayName: { contains: term, mode: "insensitive" } }, { username: { contains: term, mode: "insensitive" } }, { credentialEmail: { contains: term, mode: "insensitive" } }]
      },
      select: { id: true, displayName: true, username: true, unit: true, credentialEmail: true, systemRole: true },
      orderBy: { displayName: "asc" },
      take: 30
    });
  }

  /**
   * Đơn vị để chọn cho khách mời nội bộ chưa có tài khoản: chỉ đơn vị trong phạm vi của chuyên viên, vì nhận lời sẽ
   * tạo tài khoản nội bộ thuộc đơn vị đó (chuyên viên chỉ cấp tài khoản trong phạm vi được giao).
   */
  async organizationUnits(actor: SafeUserContext, conferenceId: string) {
    await this.loadForAction(actor, conferenceId, "invitation.manage");
    return this.prisma.organizationUnit.findMany({ where: { status: "active", id: { in: getOrganizationScopeIds(actor) } }, select: { id: true, code: true, name: true }, orderBy: { name: "asc" } });
  }

  private assertUnitInScope(actor: SafeUserContext, organizationUnitId: string, fullName?: string) {
    if (!getOrganizationScopeIds(actor).includes(organizationUnitId)) throw new ForbiddenException({ code: "ORG_SCOPE_DENIED", message: `Đơn vị của ${fullName ?? "khách mời"} không thuộc phạm vi của bạn.` });
  }

  /** Chuẩn hoá một khách mời: người có tài khoản lấy họ tên, email, đơn vị từ tài khoản. */
  private async resolveInvitee(tx: Prisma.TransactionClient, actor: SafeUserContext, input: InvitationInputDto) {
    if (input.userId) {
      const user = await tx.user.findUnique({ where: { id: input.userId }, include: { organizationScopes: { select: { organizationUnitId: true, isPrimary: true } } } });
      if (!user || !["active", "pending_activation"].includes(user.status) || user.systemRole === "SYSTEM_ADMIN") throw new BadRequestException({ message: "Tài khoản được mời không hợp lệ hoặc đã ngừng hoạt động." });
      const isInternal = user.systemRole !== "EXTERNAL_RESEARCHER_USER";
      return {
        kind: input.kind, userId: user.id, fullName: user.displayName, academicTitle: null, email: user.credentialEmail?.toLowerCase() ?? null,
        isInternal, organizationUnitId: isInternal ? accountUnitId(user.organizationScopes) : null, externalOrganization: isInternal ? null : user.unit || null
      };
    }
    if (input.isInternal && input.organizationUnitId) {
      this.assertUnitInScope(actor, input.organizationUnitId, input.fullName);
      const unit = await tx.organizationUnit.findUnique({ where: { id: input.organizationUnitId } });
      if (!unit || unit.status !== "active") throw new BadRequestException({ message: `Đơn vị của ${input.fullName} không tồn tại hoặc đã ngừng hoạt động.` });
    }
    // Email đã thuộc một tài khoản: gắn luôn tài khoản để người đó nhận lời trong hệ thống (trừ quản trị hệ thống).
    const existing = input.email ? await tx.user.findUnique({ where: { credentialEmail: input.email } }) : null;
    return {
      kind: input.kind, userId: existing && existing.systemRole !== "SYSTEM_ADMIN" && ["active", "pending_activation"].includes(existing.status) ? existing.id : null,
      fullName: input.fullName!, academicTitle: input.academicTitle ?? null, email: input.email ?? null,
      isInternal: !!input.isInternal, organizationUnitId: input.isInternal ? input.organizationUnitId ?? null : null, externalOrganization: input.isInternal ? null : input.externalOrganization ?? null
    };
  }

  async addInvitations(actor: SafeUserContext, conferenceId: string, inputs: InvitationInputDto[]) {
    const conference = await this.loadForAction(actor, conferenceId, "invitation.manage");
    const officerId = conference.officers[0]?.userId;
    const created = await this.prisma.$transaction(async (tx) => {
      await lockConference(tx, conferenceId);
      const current = await tx.scientificConference.findUnique({ where: { id: conferenceId }, select: { status: true, officers: { where: { revokedAt: null }, select: { userId: true } } } });
      if (!current || !(CONFERENCE_INVITABLE_STATUSES as string[]).includes(current.status) || current.officers[0]?.userId !== officerId) stale();
      const officer = officerId ? await tx.user.findUnique({ where: { id: officerId } }) : null;
      const rows: { id: string; fullName: string }[] = [];
      for (const input of inputs) {
        const invitee = await this.resolveInvitee(tx, actor, input);
        // Tách nhiệm vụ: chuyên viên phụ trách không là khách mời của chính hội nghị mình phụ trách.
        if (invitee.userId === officerId || (invitee.email && invitee.email === officer?.credentialEmail?.toLowerCase())) throw new ConflictException({ code: "CONFLICT_DENIED", message: "Chuyên viên phụ trách không thể là khách mời của hội nghị này." });
        try {
          const invitation = await tx.conferenceInvitation.create({ data: { conferenceId, ...invitee, status: "draft", createdById: actor.id } });
          rows.push({ id: invitation.id, fullName: invitation.fullName });
          await recordConferenceEvent(tx, { conferenceId, invitationId: invitation.id, actorId: actor.id, action: "invitation.add", toStatus: "draft", facts: { kind: invitee.kind, fullName: invitee.fullName } });
        } catch (error) {
          if (uniqueViolation(error)) throw new ConflictException({ message: `${invitee.fullName} (${invitee.email ?? "tài khoản đã chọn"}) đã có trong danh sách khách mời.` });
          throw error;
        }
      }
      await touchConference(tx, conferenceId);
      return rows;
    }, BULK_TRANSACTION_OPTIONS);
    await this.auditLog.record({ action: "add-conference-invitations", result: "success", actorId: actor.id, targetEntity: "scientific-conference", targetEntityId: conferenceId, username: actor.username, afterFacts: { count: created.length } });
    return { created };
  }

  /** Mẫu Excel nhập khách mời. */
  async importTemplate() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Khach_moi");
    sheet.columns = IMPORT_COLUMNS.map((column) => ({ header: column.header, key: column.key, width: column.width }));
    sheet.getRow(1).font = { bold: true };
    sheet.addRow({ fullName: "Nguyễn Văn A", academicTitle: "PGS.TS", email: "nguyenvana@example.com", kind: "Báo cáo viên", unitCode: "", externalOrganization: "Bệnh viện X" });
    sheet.addRow({ fullName: "Trần Thị B", academicTitle: "ThS", email: "tranthib@example.com", kind: "Đại biểu", unitCode: "MA-DON-VI", externalOrganization: "" });
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Nhập khách mời từ Excel. Đọc hết rồi mới ghi: có dòng lỗi thì không thêm dòng nào và trả danh sách lỗi theo dòng.
   * Cột "Mã đơn vị trong Học viện" có giá trị nghĩa là người trong Học viện (tài khoản nội bộ của đơn vị đó).
   */
  async importInvitations(actor: SafeUserContext, conferenceId: string, file: UploadedSheet | undefined) {
    const conference = await this.loadForAction(actor, conferenceId, "invitation.manage");
    if (!file?.buffer?.length) throw new BadRequestException({ message: "Chưa chọn tệp Excel." });
    if (!/\.xlsx$/i.test(file.originalname)) throw new BadRequestException({ message: "Chỉ nhận tệp Excel .xlsx." });
    const workbook = new ExcelJS.Workbook();
    try { await workbook.xlsx.load(file.buffer.buffer.slice(file.buffer.byteOffset, file.buffer.byteOffset + file.buffer.byteLength) as ArrayBuffer); } catch { throw new BadRequestException({ message: "Không đọc được tệp Excel." }); }
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException({ message: "Tệp Excel không có trang tính nào." });
    const headerIndex = new Map<string, number>();
    sheet.getRow(1).eachCell((cell, column) => {
      const text = String(cell.text ?? "").trim().toLowerCase();
      const match = IMPORT_COLUMNS.find((item) => item.header.toLowerCase() === text);
      if (match) headerIndex.set(match.key, column);
    });
    for (const key of ["fullName", "email", "kind"]) if (!headerIndex.has(key)) throw new BadRequestException({ message: `Thiếu cột "${IMPORT_COLUMNS.find((item) => item.key === key)!.header}". Hãy dùng tệp mẫu.` });
    const units = await this.prisma.organizationUnit.findMany({ where: { status: "active" }, select: { id: true, code: true } });
    const unitByCode = new Map(units.map((unit) => [unit.code.toLowerCase(), unit.id]));
    const scopeIds = getOrganizationScopeIds(actor);
    const inputs: InvitationInputDto[] = [];
    const inputRows: number[] = [];
    const errors: { row: number; message: string }[] = [];
    const seen = new Set<string>();
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const cell = (key: string) => (headerIndex.has(key) ? String(row.getCell(headerIndex.get(key)!).text ?? "").trim() : "");
      if (!cell("fullName") && !cell("email")) return;
      try {
        const kindText = cell("kind").toLowerCase();
        const kind = kindText.startsWith("báo cáo") || kindText === "speaker" ? "speaker" : kindText.startsWith("đại biểu") || kindText === "delegate" ? "delegate" : null;
        if (!kind) throw new BadRequestException({ message: "Loại phải là Báo cáo viên hoặc Đại biểu." });
        const unitCode = cell("unitCode");
        const organizationUnitId = unitCode ? unitByCode.get(unitCode.toLowerCase()) : undefined;
        if (unitCode && !organizationUnitId) throw new BadRequestException({ message: `Không có đơn vị mã ${unitCode}.` });
        if (organizationUnitId && !scopeIds.includes(organizationUnitId)) throw new BadRequestException({ message: `Đơn vị mã ${unitCode} không thuộc phạm vi của bạn.` });
        const input = readInvitationInput({ kind, fullName: cell("fullName"), academicTitle: cell("academicTitle"), email: cell("email"), isInternal: !!organizationUnitId, organizationUnitId, externalOrganization: cell("externalOrganization") });
        if (seen.has(input.email!)) throw new BadRequestException({ message: `Email ${input.email} bị lặp trong tệp.` });
        seen.add(input.email!);
        inputs.push(input);
        inputRows.push(rowNumber);
      } catch (error) {
        const message = error instanceof HttpException ? String((error.getResponse() as { message?: string }).message ?? error.message) : "Dòng không hợp lệ.";
        errors.push({ row: rowNumber, message });
      }
    });
    if (!errors.length && inputs.length) errors.push(...(await this.importConflicts(conferenceId, conference.officers[0]?.userId, inputs, inputRows)));
    if (errors.length) return { created: [], errors: errors.sort((a, b) => a.row - b.row) };
    if (!inputs.length) throw new BadRequestException({ message: "Tệp không có khách mời nào." });
    if (inputs.length > 500) throw new BadRequestException({ message: "Mỗi lần nhập tối đa 500 khách mời." });
    const result = await this.addInvitations(actor, conferenceId, inputs);
    return { ...result, errors: [] };
  }

  /** Lỗi theo dòng khi ghi sẽ bị chặn: đã có trong danh sách khách mời (theo email hoặc tài khoản trùng email), hoặc là chuyên viên phụ trách. */
  private async importConflicts(conferenceId: string, officerId: string | undefined, inputs: InvitationInputDto[], rows: number[]) {
    const emails = inputs.map((input) => input.email!);
    const [invited, accounts] = await Promise.all([
      this.prisma.conferenceInvitation.findMany({ where: { conferenceId, status: { not: "revoked" }, email: { in: emails } }, select: { email: true } }),
      this.prisma.user.findMany({ where: { credentialEmail: { in: emails }, status: { in: ["active", "pending_activation"] }, systemRole: { not: "SYSTEM_ADMIN" } }, select: { id: true, credentialEmail: true } })
    ]);
    const accountByEmail = new Map(accounts.map((account) => [account.credentialEmail!, account.id]));
    const invitedUsers = accounts.length ? new Set((await this.prisma.conferenceInvitation.findMany({ where: { conferenceId, status: { not: "revoked" }, userId: { in: accounts.map((account) => account.id) } }, select: { userId: true } })).map((item) => item.userId)) : new Set<string | null>();
    const officerEmail = officerId ? (await this.prisma.user.findUnique({ where: { id: officerId }, select: { credentialEmail: true } }))?.credentialEmail?.toLowerCase() : undefined;
    const invitedEmails = new Set(invited.map((item) => item.email));
    const errors: { row: number; message: string }[] = [];
    inputs.forEach((input, index) => {
      const email = input.email!;
      const accountId = accountByEmail.get(email);
      if (email === officerEmail || (officerId && accountId === officerId)) errors.push({ row: rows[index], message: "Chuyên viên phụ trách không thể là khách mời của hội nghị này." });
      else if (invitedEmails.has(email) || (accountId && invitedUsers.has(accountId))) errors.push({ row: rows[index], message: `${input.fullName} (${email}) đã có trong danh sách khách mời.` });
    });
    return errors;
  }

  private async loadInvitation(conferenceId: string, invitationId: string) {
    const invitation = await this.prisma.conferenceInvitation.findFirst({ where: { id: invitationId, conferenceId }, include: INVITATION_INCLUDE });
    if (!invitation) throw new NotFoundException({ message: "Không tìm thấy khách mời." });
    return invitation;
  }

  /** Sửa khách mời chưa nhận lời. Người đã có tài khoản chỉ đổi được loại (báo cáo viên/đại biểu). */
  async updateInvitation(actor: SafeUserContext, conferenceId: string, invitationId: string, input: UpdateInvitationDto) {
    const conference = await this.loadForAction(actor, conferenceId, "invitation.manage");
    const invitation = await this.loadInvitation(conferenceId, invitationId);
    if (invitation.status !== "draft" && invitation.status !== "sent") throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Chỉ sửa được khách mời chưa trả lời." });
    const data: Prisma.ConferenceInvitationUpdateInput = {};
    if (input.kind) data.kind = input.kind;
    if (invitation.userId) {
      if (Object.keys(input).some((key) => key !== "kind")) throw new BadRequestException({ message: "Thông tin của người đã có tài khoản lấy từ tài khoản; chỉ đổi được loại khách mời." });
    } else {
      if (input.fullName) data.fullName = input.fullName;
      if ("academicTitle" in input) data.academicTitle = input.academicTitle ?? null;
      if ("email" in input) {
        if (!input.email) throw new BadRequestException({ message: "Cần email để gửi thư mời." });
        data.email = input.email;
      }
      const isInternal = input.isInternal ?? invitation.isInternal;
      const unitId = "organizationUnitId" in input ? input.organizationUnitId ?? null : invitation.organizationUnitId;
      if (isInternal && !unitId) throw new BadRequestException({ message: "Người trong Học viện cần chọn đơn vị." });
      if (isInternal && unitId !== invitation.organizationUnitId) {
        this.assertUnitInScope(actor, unitId!, invitation.fullName);
        const unit = await this.prisma.organizationUnit.findUnique({ where: { id: unitId! } });
        if (!unit || unit.status !== "active") throw new BadRequestException({ message: "Đơn vị không tồn tại hoặc đã ngừng hoạt động." });
      }
      data.isInternal = isInternal;
      data.organizationUnit = isInternal ? { connect: { id: unitId! } } : { disconnect: true };
      data.externalOrganization = isInternal ? null : "externalOrganization" in input ? input.externalOrganization ?? null : invitation.externalOrganization;
    }
    const officer = conference.officers[0]?.user;
    if (typeof data.email === "string" && officer) {
      const officerUser = await this.prisma.user.findUnique({ where: { id: officer.id } });
      if (officerUser?.credentialEmail?.toLowerCase() === data.email) throw new ConflictException({ code: "CONFLICT_DENIED", message: "Chuyên viên phụ trách không thể là khách mời của hội nghị này." });
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        await lockAndRecheck(tx, actor, conferenceId, "invitation.manage");
        const current = await tx.conferenceInvitation.findFirst({ where: { id: invitationId, conferenceId }, select: { status: true } });
        if (!current || current.status !== invitation.status) stale();
        await tx.conferenceInvitation.update({ where: { id: invitationId }, data });
        // Đổi email của thư đã gửi: thu hồi đường link cũ, cần gửi lại thư.
        if (typeof data.email === "string" && data.email !== invitation.email) await tx.conferenceInvitationToken.updateMany({ where: { invitationId, usedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
        await recordConferenceEvent(tx, { conferenceId, invitationId, actorId: actor.id, action: "invitation.update", facts: { fields: Object.keys(input) } });
        await touchConference(tx, conferenceId);
      });
    } catch (error) {
      if (uniqueViolation(error)) throw new ConflictException({ message: "Email này đã có trong danh sách khách mời." });
      throw error;
    }
    await this.auditLog.record({ action: "update-conference-invitation", result: "success", actorId: actor.id, targetEntity: "conference-invitation", targetEntityId: invitationId, username: actor.username, afterFacts: { fields: Object.keys(input) } });
    return { id: invitationId };
  }

  /** Huỷ lời mời (kể cả đã nhận lời): đường link bị thu hồi, báo cáo đang có chuyển sang đã rút. */
  async revokeInvitation(actor: SafeUserContext, conferenceId: string, invitationId: string, reason: string) {
    await this.loadForAction(actor, conferenceId, "invitation.manage");
    const invitation = await this.loadInvitation(conferenceId, invitationId);
    if (!["draft", "sent", "accepted"].includes(invitation.status)) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Lời mời đã bị từ chối hoặc đã huỷ." });
    await this.prisma.$transaction(async (tx) => {
      // Khoá như setSessionSlots: báo cáo bị rút không thể được xếp vào phiên song song.
      await lockAndRecheck(tx, actor, conferenceId, "invitation.manage");
      const changed = await tx.conferenceInvitation.updateMany({ where: { id: invitationId, status: invitation.status }, data: { status: "revoked", revokedAt: new Date(), revokeReason: reason } });
      if (changed.count !== 1) throw new ConflictException({ code: "CONTEXT_VERSION_MISMATCH", message: "Lời mời vừa thay đổi. Vui lòng tải lại trang." });
      await tx.conferenceInvitationToken.updateMany({ where: { invitationId, usedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
      const paper = await tx.conferencePaper.findUnique({ where: { invitationId } });
      if (paper && paper.status !== "withdrawn") {
        await tx.conferencePaper.update({ where: { id: paper.id }, data: { status: "withdrawn", withdrawReason: reason } });
        const removed = await tx.conferenceSessionSlot.deleteMany({ where: { paperId: paper.id } });
        if (removed.count) await tx.scientificConference.update({ where: { id: conferenceId }, data: { programChangedAt: new Date() } });
        await recordConferenceEvent(tx, { conferenceId, paperId: paper.id, invitationId, actorId: actor.id, action: "paper.withdraw", fromStatus: paper.status, toStatus: "withdrawn", reason });
      }
      await recordConferenceEvent(tx, { conferenceId, invitationId, actorId: actor.id, action: "invitation.revoke", fromStatus: invitation.status, toStatus: "revoked", reason });
      await touchConference(tx, conferenceId);
    });
    await this.auditLog.record({ action: "revoke-conference-invitation", result: "success", actorId: actor.id, targetEntity: "conference-invitation", targetEntityId: invitationId, username: actor.username, reason, beforeFacts: { status: invitation.status } });
    if (invitation.userId && invitation.status !== "draft") {
      await this.notifications?.createConferenceNotification({ userId: invitation.userId, conferenceId, audience: "invitation", title: "Lời mời hội nghị đã được huỷ", message: `Lời mời tham dự ${(await this.prisma.scientificConference.findUnique({ where: { id: conferenceId } }))?.title ?? "hội nghị"} đã được huỷ. Lý do: ${reason}`, link: "/my-conferences" });
    }
    return { id: invitationId, status: "revoked" };
  }

  // ---- Gửi thư ----

  /**
   * Gửi một đợt thư. Người có tài khoản nhận thông báo trong hệ thống (kèm email tới địa chỉ của tài khoản, do dịch
   * vụ thông báo gửi); người chưa có tài khoản nhận email kèm đường link trả lời mới (link cũ bị thu hồi).
   * Người nhận không đúng trạng thái cho loại thư được bỏ qua và báo lại.
   */
  async sendMailing(actor: SafeUserContext, conferenceId: string, input: SendMailingDto) {
    // Kỷ yếu gửi được cả sau khi hội nghị kết thúc; các loại thư khác theo quyền gửi thư thông thường.
    const conference = await this.loadForAction(actor, conferenceId, input.kind === "proceedings" ? "proceedings.manage" : "mailing.send");
    const allowed = MAILING_RECIPIENT_STATUSES[input.kind];
    const programLines = await this.programPrecondition(conferenceId, input.kind);
    const tokenExpiresAt = new Date(Math.max(conference.endsAt.getTime(), Date.now() + MIN_TOKEN_TTL_MS));
    const subject = conferenceMailSubject({ kind: input.kind, conference: mailFacts(conference), subject: input.subject });

    const prepared = await this.prisma.$transaction(async (tx) => {
      const current = await lockAndRecheck(tx, actor, conferenceId, input.kind === "proceedings" ? "proceedings.manage" : "mailing.send");
      const invitations = await tx.conferenceInvitation.findMany({ where: { conferenceId, id: { in: input.invitationIds } } });
      const targets = invitations.filter((invitation) => allowed.includes(invitation.status));
      if (!targets.length) throw new BadRequestException({ message: "Không có người nhận phù hợp với loại thư này." });
      const mailing = await tx.conferenceMailing.create({ data: { conferenceId, kind: input.kind, subject, message: input.message ?? null, sentById: actor.id, recipientCount: targets.length } });
      const userIds = targets.map((item) => item.userId).filter((id): id is string => Boolean(id));
      const activeIds = new Set(userIds.length ? (await tx.user.findMany({ where: { id: { in: userIds }, status: "active" }, select: { id: true } })).map((user) => user.id) : []);
      const deliveries: { invitation: (typeof targets)[number]; token: string | null; viaAccount: boolean }[] = [];
      const now = new Date();
      for (const invitation of targets) {
        const viaAccount = Boolean(invitation.userId && activeIds.has(invitation.userId));
        let token: string | null = null;
        // Chưa có tài khoản hoạt động và chưa trả lời: cấp đường link trả lời mới, thu hồi đường link cũ.
        if (!viaAccount && invitation.status !== "accepted") {
          const issued = this.passwords.createResetToken();
          await tx.conferenceInvitationToken.updateMany({ where: { invitationId: invitation.id, usedAt: null, revokedAt: null }, data: { revokedAt: now } });
          await tx.conferenceInvitationToken.create({ data: { invitationId: invitation.id, tokenHash: issued.tokenHash, expiresAt: tokenExpiresAt } });
          token = issued.token;
        }
        if (input.kind === "invitation" && invitation.status === "draft") await tx.conferenceInvitation.update({ where: { id: invitation.id }, data: { status: "sent", sentAt: now } });
        deliveries.push({ invitation, token, viaAccount });
      }
      // Thư mời đầu tiên mở giai đoạn mời và nhận bài.
      if (input.kind === "invitation" && current.status === "preparing") {
        await tx.scientificConference.update({ where: { id: conferenceId }, data: { status: "inviting" } });
        await recordConferenceEvent(tx, { conferenceId, actorId: actor.id, action: "open-invitations", fromStatus: "preparing", toStatus: "inviting" });
      } else {
        await touchConference(tx, conferenceId);
      }
      await recordConferenceEvent(tx, { conferenceId, actorId: actor.id, action: `mailing.${input.kind}`, facts: { mailingId: mailing.id, recipients: targets.length, skipped: input.invitationIds.length - targets.length } });
      return { mailing, deliveries };
    }, BULK_TRANSACTION_OPTIONS);

    // Gửi sau khi đã ghi: lỗi gửi một người không làm hỏng cả đợt, chỉ ghi nhận trạng thái từng người.
    const facts = mailFacts(conference);
    let sent = 0, failed = 0, skipped = 0;
    for (const { invitation, token, viaAccount } of prepared.deliveries) {
      const recipient = { fullName: invitation.fullName, academicTitle: invitation.academicTitle, kind: invitation.kind as "speaker" | "delegate" };
      let channel = "notification", status = "sent", error: string | null = null;
      if (viaAccount) {
        const lines = conferenceMailLines({ kind: input.kind, conference: facts, recipient, message: input.message, programLines });
        const notification = await this.notifications?.createConferenceNotification({ userId: invitation.userId!, conferenceId, audience: "invitation", title: subject, message: lines.join("\n"), link: "/my-conferences" });
        if (!notification) { status = "failed"; error = "Tài khoản không hoạt động hoặc không ghi được thông báo."; }
      } else {
        channel = "email";
        const responseUrl = token ? absoluteLink(`/conference-invitation#token=${encodeURIComponent(token)}`) : "";
        if (token && !responseUrl) { status = "failed"; error = "Chưa cấu hình APP_BASE_URL để tạo đường link trong thư."; }
        else if (!invitation.email) { status = "failed"; error = "Không có email."; }
        else {
          try {
            const result = await this.mail?.sendMail(invitation.email, subject, renderConferenceMailHtml({ kind: input.kind, conference: facts, recipient, message: input.message, responseUrl: responseUrl || undefined, programLines }));
            if (!result) { status = "skipped"; error = "Chưa cấu hình máy chủ email (SMTP)."; }
          } catch (cause) {
            status = "failed"; error = (cause as Error)?.message?.slice(0, 300) ?? "Gửi email thất bại.";
          }
        }
      }
      if (status === "sent") sent += 1; else if (status === "failed") failed += 1; else skipped += 1;
      await this.prisma.conferenceMailingRecipient.create({ data: { mailingId: prepared.mailing.id, invitationId: invitation.id, channel, email: invitation.email, status, error } });
    }
    await this.auditLog.record({ action: `send-conference-${input.kind.replace("_", "-")}`, result: "success", actorId: actor.id, targetEntity: "scientific-conference", targetEntityId: conferenceId, username: actor.username, afterFacts: { mailingId: prepared.mailing.id, sent, failed, skipped } });
    return { mailingId: prepared.mailing.id, recipients: prepared.deliveries.length, sent, failed, skipped, ignored: input.invitationIds.length - prepared.deliveries.length };
  }

  /** Thư chương trình cần bản đã chốt (và trả về tóm tắt các phiên); thư kỷ yếu cần kỷ yếu đã tải lên. */
  private async programPrecondition(conferenceId: string, kind: MailingKind) {
    if (kind === "program") {
      const program = await this.prisma.conferenceProgramVersion.findFirst({ where: { conferenceId }, orderBy: { versionNumber: "desc" } });
      if (!program) throw new BadRequestException({ message: "Chưa chốt chương trình chi tiết." });
      return readProgramSnapshot(program.snapshot).sessions.map((session) => `${session.kind === "plenary" ? "Phiên toàn thể" : "Tiểu ban"} ${session.name}: ${formatVietnamDateTime(new Date(session.startsAt))} – ${formatVietnamTime(new Date(session.endsAt))}${session.room ? `, ${session.room}` : ""}`);
    }
    if (kind === "proceedings" && !(await this.prisma.conferenceProceedings.findFirst({ where: { conferenceId } }))) throw new BadRequestException({ message: "Chưa tải kỷ yếu lên." });
    return undefined;
  }

  // ---- Trả lời thư mời ----

  /** Người có tài khoản trả lời trong hệ thống. */
  async respondInApp(actor: SafeUserContext, invitationId: string, input: InvitationResponseDto) {
    const invitation = await this.prisma.conferenceInvitation.findUnique({ where: { id: invitationId } });
    if (!invitation || !isConferenceParticipant(actor, invitation)) throw new NotFoundException({ message: "Không tìm thấy lời mời." });
    if (invitation.status !== "sent") throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Lời mời này đã được trả lời." });
    await this.applyResponse(invitation.id, input, { kind: "account", userId: actor.id });
    return { id: invitationId, status: input.decision === "accept" ? "accepted" : "declined" };
  }

  private assertPublicAllowed(ip: string) {
    const state = this.publicFailures.get(ip);
    if (state && Date.now() - state.startedAt < PUBLIC_WINDOW_MS && state.count >= PUBLIC_MAX_FAILURES) throw new HttpException({ message: "Thử quá nhiều lần. Vui lòng thử lại sau." }, HttpStatus.TOO_MANY_REQUESTS);
  }

  private recordPublicFailure(ip: string) {
    const state = this.publicFailures.get(ip);
    const now = Date.now();
    if (!state || now - state.startedAt >= PUBLIC_WINDOW_MS) this.publicFailures.set(ip, { count: 1, startedAt: now });
    else state.count += 1;
    if (this.publicFailures.size > PUBLIC_MAX_TRACKED_IPS) {
      for (const [key, tracked] of this.publicFailures) if (now - tracked.startedAt >= PUBLIC_WINDOW_MS) this.publicFailures.delete(key);
    }
  }

  /** Mã còn hiệu lực; mọi trường hợp sai, hết hạn, đã dùng, đã thu hồi đều trả cùng một lỗi. */
  private async findToken(token: string, context: RequestContext) {
    const ip = context.ip ?? "unknown";
    this.assertPublicAllowed(ip);
    const record = await this.prisma.conferenceInvitationToken.findUnique({ where: { tokenHash: this.passwords.hashResetToken(token) }, include: { invitation: { include: { conference: { include: CONFERENCE_INCLUDE } } } } });
    const valid = record && !record.usedAt && !record.revokedAt && record.expiresAt.getTime() >= Date.now() && record.invitation.status === "sent"
      && !(CONFERENCE_CLOSED_STATUSES as string[]).includes(record.invitation.conference.status);
    if (!valid) {
      this.recordPublicFailure(ip);
      await this.auditLog.record({ action: "conference-invitation-token", result: "failure", targetEntity: "conference-invitation", targetEntityId: "unknown", ip: context.ip, userAgent: context.userAgent, reason: "invalid_or_expired" });
      throw new NotFoundException({ code: "INVITATION_TOKEN_INVALID", message: "Đường link thư mời không hợp lệ, đã được dùng hoặc đã hết hạn." });
    }
    return record;
  }

  /** Trang công khai: nội dung thư mời theo đường link (không cần đăng nhập). */
  async publicLookup(token: string, context: RequestContext) {
    const record = await this.findToken(token, context);
    const { invitation } = record;
    const conference = invitation.conference;
    return {
      invitation: { fullName: invitation.fullName, academicTitle: invitation.academicTitle, kind: invitation.kind, isInternal: invitation.isInternal },
      conference: {
        title: conference.title, description: conference.description, level: conference.level, hostOrganizationUnit: conference.hostOrganizationUnit.name, location: conference.location,
        startsAt: conference.startsAt, endsAt: conference.endsAt, responseDeadline: conference.responseDeadline,
        abstractDeadline: invitation.kind === "speaker" ? conference.abstractDeadline : null, fullPaperDeadline: invitation.kind === "speaker" ? conference.fullPaperDeadline : null
      }
    };
  }

  /**
   * Trả lời qua đường link. Nhận lời: gắn tài khoản có sẵn theo email, hoặc tạo tài khoản mới (nội bộ theo đơn vị
   * chuyên viên đã chọn, hoặc tài khoản ngoài) và trả về đường dẫn đặt mật khẩu.
   */
  async publicRespond(input: PublicInvitationResponseDto, context: RequestContext) {
    const record = await this.findToken(input.token, context);
    const result = await this.applyResponse(record.invitation.id, input, { kind: "token", tokenId: record.id, context });
    return result;
  }

  private async applyResponse(invitationId: string, input: InvitationResponseDto, via: { kind: "account"; userId: string } | { kind: "token"; tokenId: string; context: RequestContext }) {
    let activation: { token: string; expiresAt: Date; email: string; displayName: string } | null = null;
    let accountState: "existing" | "created" | "pending_activation" | null = null;
    const outcome = await this.prisma.$transaction(async (tx) => {
      const invitation = await tx.conferenceInvitation.findUnique({ where: { id: invitationId }, include: { conference: { include: CONFERENCE_INCLUDE } } });
      if (!invitation) throw new NotFoundException({ message: "Không tìm thấy lời mời." });
      await lockConference(tx, invitation.conferenceId);
      const currentConf = await tx.scientificConference.findUnique({ where: { id: invitation.conferenceId }, select: { status: true } });
      if (!currentConf || (CONFERENCE_CLOSED_STATUSES as string[]).includes(currentConf.status)) {
        throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Hội nghị đã kết thúc hoặc đã huỷ; không trả lời thư mời được nữa." });
      }
      if (via.kind === "token") {
        const consumed = await tx.conferenceInvitationToken.updateMany({ where: { id: via.tokenId, usedAt: null, revokedAt: null }, data: { usedAt: new Date() } });
        if (consumed.count !== 1) throw new NotFoundException({ code: "INVITATION_TOKEN_INVALID", message: "Đường link thư mời đã được dùng hoặc đã hết hạn." });
      }
      const changed = await tx.conferenceInvitation.updateMany({ where: { id: invitationId, status: "sent" }, data: { status: input.decision === "accept" ? "accepted" : "declined", respondedAt: new Date(), declineReason: input.decision === "decline" ? input.reason ?? null : null } });
      if (changed.count !== 1) throw new ConflictException({ code: "CONTEXT_VERSION_MISMATCH", message: "Lời mời này đã được trả lời hoặc đã bị huỷ." });
      const conference = invitation.conference;
      const officerId = conference.officers[0]?.userId ?? null;
      let userId = invitation.userId;
      if (input.decision === "accept") {
        if (!userId) {
          const existing = invitation.email ? await tx.user.findUnique({ where: { credentialEmail: invitation.email } }) : null;
          if (existing) {
            if (existing.systemRole === "SYSTEM_ADMIN") throw new ConflictException({ message: "Email này thuộc tài khoản quản trị hệ thống, không dùng để nhận lời mời. Vui lòng liên hệ chuyên viên phụ trách." });
            if (!["active", "pending_activation"].includes(existing.status)) throw new ConflictException({ message: "Email này thuộc một tài khoản đang bị khoá. Vui lòng liên hệ chuyên viên phụ trách hội nghị." });
            userId = existing.id;
            accountState = existing.status === "pending_activation" ? "pending_activation" : "existing";
            if (existing.status === "pending_activation") activation = { ...(await this.issueActivation(tx, existing, invitation.createdById)), email: invitation.email!, displayName: existing.displayName };
          } else {
            const created = await this.createAccount(tx, invitation);
            userId = created.id;
            accountState = "created";
            activation = { ...(await this.issueActivation(tx, created, invitation.createdById)), email: invitation.email!, displayName: created.displayName };
          }
          if (userId === officerId) throw new ConflictException({ code: "CONFLICT_DENIED", message: "Chuyên viên phụ trách không thể là khách mời của hội nghị này." });
          try {
            await tx.conferenceInvitation.update({ where: { id: invitationId }, data: { userId } });
          } catch (error) {
            if (uniqueViolation(error)) throw new ConflictException({ message: "Tài khoản này đã có một lời mời khác trong hội nghị. Vui lòng liên hệ chuyên viên phụ trách." });
            throw error;
          }
        } else if (via.kind === "token" && invitation.email) {
          const linked = await tx.user.findUnique({ where: { id: userId } });
          if (linked?.status === "pending_activation") {
            accountState = "pending_activation";
            activation = { ...(await this.issueActivation(tx, linked, invitation.createdById)), email: invitation.email, displayName: linked.displayName };
          } else {
            accountState = "existing";
          }
        } else {
          accountState = "existing";
        }
        if (invitation.kind === "speaker") {
          const paper = await tx.conferencePaper.create({ data: { conferenceId: conference.id, invitationId, ownerId: userId!, status: "awaiting_abstract" } });
          await recordConferenceEvent(tx, { conferenceId: conference.id, paperId: paper.id, invitationId, actorId: userId, action: "paper.create", toStatus: "awaiting_abstract" });
        }
      }
      await recordConferenceEvent(tx, { conferenceId: conference.id, invitationId, actorId: userId, action: input.decision === "accept" ? "invitation.accept" : "invitation.decline", fromStatus: "sent", toStatus: input.decision === "accept" ? "accepted" : "declined", reason: input.reason ?? null, facts: { via: via.kind, account: accountState } });
      await touchConference(tx, conference.id);
      return { conferenceId: conference.id, title: conference.title, officerId, fullName: invitation.fullName, userId };
    });
    await this.auditLog.record({ action: input.decision === "accept" ? "accept-conference-invitation" : "decline-conference-invitation", result: "success", actorId: outcome.userId ?? undefined, targetEntity: "conference-invitation", targetEntityId: invitationId, ip: via.kind === "token" ? via.context.ip : undefined, userAgent: via.kind === "token" ? via.context.userAgent : undefined, afterFacts: { account: accountState } });
    if (outcome.officerId) {
      await this.notifications?.createConferenceNotification({ userId: outcome.officerId, conferenceId: outcome.conferenceId, audience: "management", title: input.decision === "accept" ? "Khách mời nhận lời" : "Khách mời từ chối", message: `${outcome.fullName} đã ${input.decision === "accept" ? "nhận lời" : "từ chối"} lời mời ${outcome.title}.${input.reason ? ` Lý do: ${input.reason}` : ""}`, link: `/conferences/${outcome.conferenceId}` });
    }
    const pending = activation as { token: string; expiresAt: Date; email: string; displayName: string } | null;
    let activationPath: string | null = null;
    if (pending) {
      // Mã nằm sau dấu # để trình duyệt không gửi lên máy chủ (không vào nhật ký truy cập).
      activationPath = `/password-reset#mode=activation&token=${encodeURIComponent(pending.token)}`;
      // Gửi kèm email phòng khi người dùng đóng trang trước khi đặt mật khẩu.
      const url = absoluteLink(activationPath);
      if (url) {
        try {
          await this.mail?.sendMail(pending.email, "Thiết lập mật khẩu tài khoản DocManS", `<p>Xin chào ${escapeHtml(pending.displayName)},</p><p>Tài khoản để nộp báo cáo và nhận chương trình hội nghị đã được tạo. Thiết lập mật khẩu tại: <a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p><p>Liên kết hết hạn sau 48 giờ. Không chia sẻ liên kết này.</p>`);
        } catch (error) {
          this.logger.warn(`Không gửi được email kích hoạt tài khoản hội nghị: ${(error as Error)?.message ?? error}`);
        }
      }
    }
    return { status: input.decision === "accept" ? "accepted" : "declined", account: accountState, activationPath };
  }

  /** Tài khoản mới cho người nhận lời: nội bộ theo đơn vị đã chọn, hoặc tài khoản ngoài. */
  private async createAccount(tx: Prisma.TransactionClient, invitation: { email: string | null; fullName: string; isInternal: boolean; organizationUnitId: string | null; externalOrganization: string | null }) {
    if (!invitation.email) throw new BadRequestException({ message: "Lời mời không có email để tạo tài khoản." });
    const email = readEmail(invitation.email)!;
    const passwordHash = await this.passwords.hashPassword(randomBytes(32).toString("base64url"));
    const unit = invitation.isInternal && invitation.organizationUnitId ? await tx.organizationUnit.findUnique({ where: { id: invitation.organizationUnitId } }) : null;
    if (invitation.isInternal && (!unit || unit.status !== "active")) throw new ConflictException({ message: "Đơn vị của lời mời đã ngừng hoạt động. Vui lòng liên hệ chuyên viên phụ trách hội nghị." });
    return tx.user.create({
      data: {
        username: null, usernameKey: null, displayName: invitation.fullName, passwordHash, credentialEmail: email, mustChangePassword: false, status: "pending_activation",
        systemRole: invitation.isInternal ? "RESEARCHER_INTERNAL_USER" : "EXTERNAL_RESEARCHER_USER",
        unit: unit?.name ?? invitation.externalOrganization ?? "Ngoài Học viện",
        ...(unit ? { organizationScopes: { create: { organizationUnitId: unit.id, isPrimary: true } } } : {})
      }
    });
  }

  private async issueActivation(tx: Prisma.TransactionClient, user: { id: string; credentialVersion: number }, issuerId: string) {
    const activation = this.passwords.createResetToken();
    const expiresAt = new Date(Date.now() + ACTIVATION_TTL_MS);
    await tx.accountActivationToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
    await tx.accountActivationToken.create({ data: { userId: user.id, createdById: issuerId, tokenHash: activation.tokenHash, expiresAt, credentialVersion: user.credentialVersion } });
    return { token: activation.token, expiresAt };
  }
}

const IMPORT_COLUMNS = [
  { key: "fullName", header: "Họ tên", width: 30 },
  { key: "academicTitle", header: "Học hàm, học vị", width: 16 },
  { key: "email", header: "Email", width: 32 },
  { key: "kind", header: "Loại (Báo cáo viên/Đại biểu)", width: 26 },
  { key: "unitCode", header: "Mã đơn vị trong Học viện", width: 24 },
  { key: "externalOrganization", header: "Đơn vị ngoài Học viện", width: 32 }
];
