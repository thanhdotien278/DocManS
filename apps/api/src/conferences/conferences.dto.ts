import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { CONFERENCE_LEVELS, type ConferenceLevel, type InvitationKind, type PaperVersionKind } from "./conference-workflow.js";

export type ConferenceInfoDto = {
  title: string;
  description?: string | null;
  level: ConferenceLevel;
  hostOrganizationUnitId: string;
  location: string;
  startsAt: Date;
  endsAt: Date;
  responseDeadline?: Date | null;
  abstractDeadline: Date;
  fullPaperDeadline: Date;
};

export type UpdateConferenceDto = Partial<ConferenceInfoDto> & { version: string };
export type VersionedReasonDto = { version: string; reason?: string };
export type AssignOfficerDto = { version: string; userId: string; reason?: string };

export type InvitationInputDto = {
  kind: InvitationKind;
  userId?: string;
  fullName?: string;
  academicTitle?: string | null;
  email?: string | null;
  isInternal?: boolean;
  organizationUnitId?: string | null;
  externalOrganization?: string | null;
};
export type UpdateInvitationDto = Omit<InvitationInputDto, "userId" | "kind"> & { kind?: InvitationKind };

export type MailingKind = "invitation" | "reminder" | "change_notice" | "program" | "proceedings";
export type SendMailingDto = { kind: MailingKind; invitationIds: string[]; subject?: string; message?: string };

export type InvitationResponseDto = { decision: "accept" | "decline"; reason?: string };
export type PublicInvitationResponseDto = InvitationResponseDto & { token: string };

export type PaperAuthor = { fullName: string; organization?: string; corresponding?: boolean };
export type SubmitPaperDto = { version: string; kind: PaperVersionKind; title?: string; abstractText?: string; authors?: PaperAuthor[] };
export type RevisionRequestDto = { version: string; kind: PaperVersionKind; reason: string; dueAt: Date };

const MAX_INVITATIONS_PER_REQUEST = 500;

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException({ message: "Dữ liệu không hợp lệ." });
  return value as Record<string, unknown>;
}

export function readRequired(value: unknown, field: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new BadRequestException({ message: `${field} là bắt buộc và tối đa ${max} ký tự.` });
  return value.trim();
}

function readOptional(value: unknown, field: string, max: number) {
  if (value === undefined || value === null || value === "") return undefined;
  return readRequired(value, field, max);
}

/** Thời điểm ISO (giao diện gửi sẵn đầu/cuối ngày theo giờ Việt Nam, như đợt tiếp nhận). */
function readInstant(value: unknown, field: string) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new BadRequestException({ message: `${field} không hợp lệ.` });
  return new Date(value);
}

function readOptionalInstant(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") return undefined;
  return readInstant(value, field);
}

/** Phiên bản hội nghị/báo cáo người dùng đang xem (updatedAt, ISO): chặn ghi đè thay đổi của người khác. */
export function readVersion(value: unknown) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new BadRequestException({ code: "CONTEXT_VERSION_REQUIRED", message: "Thiếu phiên bản dữ liệu. Vui lòng tải lại trang." });
  return new Date(value).toISOString();
}

function readLevel(value: unknown): ConferenceLevel {
  if (typeof value !== "string" || !(CONFERENCE_LEVELS as readonly string[]).includes(value)) throw new BadRequestException({ message: "Cấp hội nghị không hợp lệ." });
  return value as ConferenceLevel;
}

function readKind(value: unknown): InvitationKind {
  if (value !== "speaker" && value !== "delegate") throw new BadRequestException({ message: "Loại khách mời phải là báo cáo viên hoặc đại biểu." });
  return value;
}

export function readPaperKind(value: unknown): PaperVersionKind {
  if (value !== "abstract" && value !== "full_paper") throw new BadRequestException({ message: "Loại bài phải là tóm tắt hoặc toàn văn." });
  return value;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function readEmail(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.trim().length > 254 || !EMAIL_PATTERN.test(value.trim())) throw new BadRequestException({ message: "Email không hợp lệ." });
  return value.trim().toLowerCase();
}

/** Thứ tự các mốc: hạn tóm tắt ≤ hạn toàn văn ≤ ngày kết thúc; bắt đầu ≤ kết thúc. */
export function assertConferenceDates(input: Pick<ConferenceInfoDto, "startsAt" | "endsAt" | "abstractDeadline" | "fullPaperDeadline"> & { responseDeadline?: Date | null }) {
  if (input.endsAt < input.startsAt) throw new BadRequestException({ message: "Ngày kết thúc phải sau ngày bắt đầu." });
  if (input.fullPaperDeadline < input.abstractDeadline) throw new BadRequestException({ message: "Hạn nộp toàn văn phải sau hạn nộp tóm tắt." });
  if (input.fullPaperDeadline > input.endsAt) throw new BadRequestException({ message: "Hạn nộp toàn văn phải trước khi hội nghị kết thúc." });
  if (input.responseDeadline && input.responseDeadline > input.endsAt) throw new BadRequestException({ message: "Hạn trả lời thư mời phải trước khi hội nghị kết thúc." });
}

function readInfo(input: Record<string, unknown>): ConferenceInfoDto {
  return {
    title: readRequired(input.title, "Tên hội nghị", 500),
    description: readOptional(input.description, "Mô tả", 5000) ?? null,
    level: readLevel(input.level ?? "academy"),
    hostOrganizationUnitId: readRequired(input.hostOrganizationUnitId, "Đơn vị chủ trì", 80),
    location: readRequired(input.location, "Địa điểm", 500),
    startsAt: readInstant(input.startsAt, "Ngày bắt đầu"),
    endsAt: readInstant(input.endsAt, "Ngày kết thúc"),
    responseDeadline: readOptionalInstant(input.responseDeadline, "Hạn trả lời thư mời") ?? null,
    abstractDeadline: readInstant(input.abstractDeadline, "Hạn nộp tóm tắt"),
    fullPaperDeadline: readInstant(input.fullPaperDeadline, "Hạn nộp toàn văn")
  };
}

export const createConferencePipe: PipeTransform<unknown, ConferenceInfoDto> = { transform(value) {
  const result = readInfo(record(value));
  assertConferenceDates(result);
  return result;
} };

export const updateConferencePipe: PipeTransform<unknown, UpdateConferenceDto> = { transform(value) {
  const input = record(value);
  const result: UpdateConferenceDto = { version: readVersion(input.version) };
  if ("title" in input) result.title = readRequired(input.title, "Tên hội nghị", 500);
  if ("description" in input) result.description = readOptional(input.description, "Mô tả", 5000) ?? null;
  if ("level" in input) result.level = readLevel(input.level);
  if ("hostOrganizationUnitId" in input) result.hostOrganizationUnitId = readRequired(input.hostOrganizationUnitId, "Đơn vị chủ trì", 80);
  if ("location" in input) result.location = readRequired(input.location, "Địa điểm", 500);
  if ("startsAt" in input) result.startsAt = readInstant(input.startsAt, "Ngày bắt đầu");
  if ("endsAt" in input) result.endsAt = readInstant(input.endsAt, "Ngày kết thúc");
  if ("responseDeadline" in input) result.responseDeadline = readOptionalInstant(input.responseDeadline, "Hạn trả lời thư mời") ?? null;
  if ("abstractDeadline" in input) result.abstractDeadline = readInstant(input.abstractDeadline, "Hạn nộp tóm tắt");
  if ("fullPaperDeadline" in input) result.fullPaperDeadline = readInstant(input.fullPaperDeadline, "Hạn nộp toàn văn");
  if (Object.keys(result).length === 1) throw new BadRequestException({ message: "Không có thông tin nào cần sửa." });
  return result;
} };

export const versionedReasonPipe: PipeTransform<unknown, VersionedReasonDto> = { transform(value) {
  const input = record(value ?? {});
  return { version: readVersion(input.version), reason: readOptional(input.reason, "Lý do", 1000) };
} };

export const assignOfficerPipe: PipeTransform<unknown, AssignOfficerDto> = { transform(value) {
  const input = record(value);
  return { version: readVersion(input.version), userId: readRequired(input.userId, "Chuyên viên phụ trách", 80), reason: readOptional(input.reason, "Lý do", 1000) };
} };

export function readInvitationInput(value: unknown): InvitationInputDto {
  const input = record(value);
  const kind = readKind(input.kind);
  const userId = readOptional(input.userId, "Tài khoản", 80);
  if (userId) return { kind, userId };
  const isInternal = input.isInternal === true;
  const result: InvitationInputDto = {
    kind,
    fullName: readRequired(input.fullName, "Họ tên", 200),
    academicTitle: readOptional(input.academicTitle, "Học hàm, học vị", 100) ?? null,
    email: readEmail(input.email) ?? null,
    isInternal,
    organizationUnitId: isInternal ? readRequired(input.organizationUnitId, "Đơn vị trong Học viện", 80) : null,
    externalOrganization: isInternal ? null : readOptional(input.externalOrganization, "Đơn vị công tác", 300) ?? null
  };
  // Người chưa có tài khoản chỉ nhận được thư qua email.
  if (!result.email) throw new BadRequestException({ message: `Cần email của ${result.fullName} để gửi thư mời.` });
  return result;
}

export const createInvitationsPipe: PipeTransform<unknown, InvitationInputDto[]> = { transform(value) {
  const input = record(value);
  if (!Array.isArray(input.invitations) || !input.invitations.length) throw new BadRequestException({ message: "Chưa có khách mời nào." });
  if (input.invitations.length > MAX_INVITATIONS_PER_REQUEST) throw new BadRequestException({ message: `Mỗi lần thêm tối đa ${MAX_INVITATIONS_PER_REQUEST} khách mời.` });
  return input.invitations.map(readInvitationInput);
} };

export const updateInvitationPipe: PipeTransform<unknown, UpdateInvitationDto> = { transform(value) {
  const input = record(value);
  const result: UpdateInvitationDto = {};
  if ("kind" in input) result.kind = readKind(input.kind);
  if ("fullName" in input) result.fullName = readRequired(input.fullName, "Họ tên", 200);
  if ("academicTitle" in input) result.academicTitle = readOptional(input.academicTitle, "Học hàm, học vị", 100) ?? null;
  if ("email" in input) result.email = readEmail(input.email) ?? null;
  if ("isInternal" in input) result.isInternal = input.isInternal === true;
  if ("organizationUnitId" in input) result.organizationUnitId = readOptional(input.organizationUnitId, "Đơn vị trong Học viện", 80) ?? null;
  if ("externalOrganization" in input) result.externalOrganization = readOptional(input.externalOrganization, "Đơn vị công tác", 300) ?? null;
  if (!Object.keys(result).length) throw new BadRequestException({ message: "Không có thông tin nào cần sửa." });
  return result;
} };

export const reasonPipe: PipeTransform<unknown, { reason: string }> = { transform(value) {
  const input = record(value ?? {});
  return { reason: readRequired(input.reason, "Lý do", 1000) };
} };

export const sendMailingPipe: PipeTransform<unknown, SendMailingDto> = { transform(value) {
  const input = record(value);
  if (!["invitation", "reminder", "change_notice", "program", "proceedings"].includes(String(input.kind))) throw new BadRequestException({ message: "Loại thư không hợp lệ." });
  if (!Array.isArray(input.invitationIds) || !input.invitationIds.length) throw new BadRequestException({ message: "Chưa chọn người nhận." });
  if (input.invitationIds.length > 2000) throw new BadRequestException({ message: "Mỗi đợt thư tối đa 2000 người nhận." });
  const invitationIds = [...new Set(input.invitationIds.map((id) => readRequired(id, "Người nhận", 80)))];
  const subject = readOptional(input.subject, "Tiêu đề", 300);
  const message = readOptional(input.message, "Nội dung", 5000);
  if (input.kind === "change_notice" && !message) throw new BadRequestException({ message: "Thông báo thay đổi cần nêu nội dung thay đổi." });
  return { kind: input.kind as MailingKind, invitationIds, subject, message };
} };

function readDecision(input: Record<string, unknown>): InvitationResponseDto {
  if (input.decision !== "accept" && input.decision !== "decline") throw new BadRequestException({ message: "Cần chọn nhận lời hoặc từ chối." });
  return { decision: input.decision, reason: readOptional(input.reason, "Lý do", 1000) };
}

export const invitationResponsePipe: PipeTransform<unknown, InvitationResponseDto> = { transform(value) {
  return readDecision(record(value));
} };

export function readInvitationToken(value: unknown) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{20,200}$/.test(value)) throw new BadRequestException({ code: "INVITATION_TOKEN_INVALID", message: "Đường link thư mời không hợp lệ hoặc đã hết hạn." });
  return value;
}

export const invitationTokenPipe: PipeTransform<unknown, { token: string }> = { transform(value) {
  return { token: readInvitationToken(record(value).token) };
} };

export const publicInvitationResponsePipe: PipeTransform<unknown, PublicInvitationResponseDto> = { transform(value) {
  const input = record(value);
  return { token: readInvitationToken(input.token), ...readDecision(input) };
} };

function readAuthors(value: unknown): PaperAuthor[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  let parsed = value;
  // Biểu mẫu tải tệp (multipart) gửi danh sách tác giả dạng chuỗi JSON.
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { throw new BadRequestException({ message: "Danh sách tác giả không hợp lệ." }); }
  }
  if (!Array.isArray(parsed) || parsed.length > 50) throw new BadRequestException({ message: "Danh sách tác giả không hợp lệ (tối đa 50 tác giả)." });
  return parsed.map((item) => {
    const author = record(item);
    return { fullName: readRequired(author.fullName, "Họ tên tác giả", 200), organization: readOptional(author.organization, "Đơn vị của tác giả", 300), corresponding: author.corresponding === true || author.corresponding === "true" };
  });
}

/** Thân biểu mẫu nộp bài (multipart): tệp đi riêng, các trường là chuỗi. */
export function readSubmitPaper(value: unknown): SubmitPaperDto {
  const input = record(value ?? {});
  const kind = readPaperKind(input.kind);
  const result: SubmitPaperDto = { version: readVersion(input.version), kind, title: readOptional(input.title, "Tên báo cáo", 500), authors: readAuthors(input.authors) };
  if (kind === "abstract") {
    result.title = readRequired(input.title, "Tên báo cáo", 500);
    result.abstractText = readRequired(input.abstractText, "Nội dung tóm tắt", 10000);
  }
  return result;
}

export const revisionRequestPipe: PipeTransform<unknown, RevisionRequestDto> = { transform(value) {
  const input = record(value);
  return { version: readVersion(input.version), kind: readPaperKind(input.kind), reason: readRequired(input.reason, "Nội dung cần sửa", 2000), dueAt: readInstant(input.dueAt, "Hạn nộp lại") };
} };

// ---- Chương trình chi tiết (Đợt 2) ----

export type SessionBreakDto = { label: string; startsAt: Date; endsAt: Date };
export type SessionInputDto = {
  kind: "plenary" | "track";
  name: string;
  room: string | null;
  chairName: string | null;
  secretaryName: string | null;
  startsAt: Date;
  endsAt: Date;
  slotMinutes: number | null;
  sortOrder: number;
  breaks: SessionBreakDto[];
};
export type SessionSlotsDto = { paperIds: string[] };
export type SlotTimeDto = { startsAt: Date; endsAt: Date } | { clear: true };
export type ProgramSettingsDto = { defaultSlotMinutes: number };
export type PublishProgramDto = { acknowledgeUnscheduled: boolean };
export type ProceedingsInputDto = { isbn?: string; note?: string };

function readMinutes(value: unknown, field: string) {
  const minutes = typeof value === "string" ? Number(value) : value;
  if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes < 1 || minutes > 240) throw new BadRequestException({ message: `${field} phải là số phút từ 1 đến 240.` });
  return minutes;
}

function readSortOrder(value: unknown) {
  if (value === undefined || value === null || value === "") return 0;
  const order = Number(value);
  if (!Number.isInteger(order) || order < 0 || order > 1000) throw new BadRequestException({ message: "Thứ tự phiên không hợp lệ." });
  return order;
}

function readInterval(input: Record<string, unknown>, field: string) {
  const startsAt = readInstant(input.startsAt, `Giờ bắt đầu ${field}`);
  const endsAt = readInstant(input.endsAt, `Giờ kết thúc ${field}`);
  if (endsAt <= startsAt) throw new BadRequestException({ message: `Giờ kết thúc ${field} phải sau giờ bắt đầu.` });
  return { startsAt, endsAt };
}

export const sessionInputPipe: PipeTransform<unknown, SessionInputDto> = { transform(value) {
  const input = record(value);
  if (input.kind !== "plenary" && input.kind !== "track") throw new BadRequestException({ message: "Loại phiên phải là phiên toàn thể hoặc tiểu ban." });
  const interval = readInterval(input, "phiên");
  if (interval.endsAt.getTime() - interval.startsAt.getTime() > 24 * 60 * 60 * 1000) throw new BadRequestException({ message: "Một phiên không dài quá một ngày." });
  const rawBreaks = input.breaks ?? [];
  if (!Array.isArray(rawBreaks) || rawBreaks.length > 20) throw new BadRequestException({ message: "Danh sách khoảng nghỉ không hợp lệ (tối đa 20)." });
  const breaks = rawBreaks.map((item) => {
    const entry = record(item);
    const range = readInterval(entry, "khoảng nghỉ");
    if (range.startsAt < interval.startsAt || range.endsAt > interval.endsAt) throw new BadRequestException({ message: "Khoảng nghỉ phải nằm trong khung giờ của phiên." });
    return { label: readOptional(entry.label, "Tên khoảng nghỉ", 100) ?? "Giải lao", ...range };
  });
  return {
    kind: input.kind,
    name: readRequired(input.name, "Tên phiên", 300),
    room: readOptional(input.room, "Phòng", 200) ?? null,
    chairName: readOptional(input.chairName, "Chủ toạ", 300) ?? null,
    secretaryName: readOptional(input.secretaryName, "Thư ký", 300) ?? null,
    ...interval,
    slotMinutes: input.slotMinutes === undefined || input.slotMinutes === null || input.slotMinutes === "" ? null : readMinutes(input.slotMinutes, "Thời lượng mỗi báo cáo"),
    sortOrder: readSortOrder(input.sortOrder),
    breaks
  };
} };

export const sessionSlotsPipe: PipeTransform<unknown, SessionSlotsDto> = { transform(value) {
  const input = record(value);
  if (!Array.isArray(input.paperIds) || input.paperIds.length > 300) throw new BadRequestException({ message: "Danh sách báo cáo không hợp lệ." });
  const paperIds = input.paperIds.map((id) => readRequired(id, "Báo cáo", 80));
  if (new Set(paperIds).size !== paperIds.length) throw new BadRequestException({ message: "Một báo cáo bị lặp trong phiên." });
  return { paperIds };
} };

export const slotTimePipe: PipeTransform<unknown, SlotTimeDto> = { transform(value) {
  const input = record(value);
  if (input.clear === true) return { clear: true };
  return readInterval(input, "báo cáo");
} };

export const programSettingsPipe: PipeTransform<unknown, ProgramSettingsDto> = { transform(value) {
  return { defaultSlotMinutes: readMinutes(record(value).defaultSlotMinutes, "Thời lượng mỗi báo cáo") };
} };

export const publishProgramPipe: PipeTransform<unknown, PublishProgramDto> = { transform(value) {
  return { acknowledgeUnscheduled: record(value ?? {}).acknowledgeUnscheduled === true };
} };

export function readProceedingsInput(value: unknown): ProceedingsInputDto {
  const input = record(value ?? {});
  return { isbn: readOptional(input.isbn, "ISBN", 40), note: readOptional(input.note, "Ghi chú", 1000) };
}

// ---- Thống kê ----

/** Bộ lọc thống kê từ query string: ?year=&hostUnitId=&level=. Giá trị lạ bị từ chối thay vì bỏ qua lặng lẽ. */
export function readStatsFilters(query: Record<string, unknown>) {
  const filters: { year?: number; hostUnitId?: string; level?: string } = {};
  if (query.year !== undefined && query.year !== "") {
    const year = Number(query.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new BadRequestException({ message: "Năm không hợp lệ." });
    filters.year = year;
  }
  // Dashboard dùng khoá unitId cho đơn vị; ở hội nghị đó là đơn vị chủ trì.
  const unit = query.hostUnitId ?? query.unitId;
  if (unit !== undefined && unit !== "") filters.hostUnitId = readRequired(unit, "Đơn vị", 80);
  if (query.level !== undefined && query.level !== "") filters.level = readLevel(query.level);
  return filters;
}
