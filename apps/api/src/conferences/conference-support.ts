import type { Prisma } from "@prisma/client";
import { ConflictException, NotFoundException } from "@nestjs/common";
import type { ConferenceFacts } from "./conference-access.js";

/** Loại thực thể của tệp báo cáo tham luận: dịch vụ tệp chung không nhận loại này, nên tệp chỉ đi qua module hội nghị. */
export const CONFERENCE_PAPER_ENTITY_TYPE = "conference-paper";

export const CONFERENCE_INCLUDE = {
  hostOrganizationUnit: { select: { id: true, code: true, name: true } },
  officers: { where: { revokedAt: null }, include: { user: { select: { id: true, displayName: true, username: true } } } },
  createdBy: { select: { id: true, displayName: true } }
} satisfies Prisma.ScientificConferenceInclude;

export type ConferenceRecord = Prisma.ScientificConferenceGetPayload<{ include: typeof CONFERENCE_INCLUDE }>;

export function iso(value: unknown) {
  return value instanceof Date ? value.toISOString() : String(value ?? "");
}

export function conferenceFacts(conference: ConferenceRecord): ConferenceFacts {
  return {
    status: conference.status,
    hostOrganizationUnitId: conference.hostOrganizationUnitId,
    createdById: conference.createdById,
    activeOfficerId: conference.officers[0]?.userId ?? null
  };
}

export function conferenceNotFound(): never {
  // Không phân biệt "không tồn tại" và "không có quyền" để không lộ sự tồn tại của hội nghị.
  throw new NotFoundException({ message: "Không tìm thấy hội nghị." });
}

export function stale(): never {
  throw new ConflictException({ code: "CONTEXT_VERSION_MISMATCH", message: "Dữ liệu vừa được người khác cập nhật. Vui lòng tải lại trang." });
}

export function assertVersion(record: { updatedAt: Date }, version: string | undefined) {
  if (version && iso(record.updatedAt) !== version) stale();
}

/** Khoá dòng hội nghị trong giao dịch để thao tác đồng thời (gửi thư, nhận lời, đổi trạng thái) xếp hàng. */
export async function lockConference(tx: Prisma.TransactionClient, conferenceId: string) {
  await tx.$queryRaw`SELECT id FROM scientific_conferences WHERE id = ${conferenceId} FOR UPDATE`;
}

/**
 * Cập nhật hội nghị có điều kiện: chỉ ghi khi trạng thái và phiên bản (updatedAt) vẫn như lúc người dùng xem.
 * Trả về false nếu hội nghị đã đổi.
 */
export async function guardedConferenceUpdate(tx: Prisma.TransactionClient, conference: { id: string; status: string }, version: string | undefined, data: Prisma.ScientificConferenceUpdateManyMutationInput) {
  const where: Prisma.ScientificConferenceWhereInput = { id: conference.id, status: conference.status };
  if (version) where.updatedAt = new Date(version);
  const result = await tx.scientificConference.updateMany({ where, data: { ...data, updatedAt: new Date() } });
  return result.count === 1;
}

/** Cập nhật thời điểm sửa của hội nghị (đổi phiên bản) khi thay đổi nằm ở bảng con: khách mời, chuyên viên. */
export async function touchConference(tx: Prisma.TransactionClient, conferenceId: string) {
  await tx.scientificConference.update({ where: { id: conferenceId }, data: { updatedAt: new Date() } });
}

export type ConferenceEventInput = {
  conferenceId: string;
  actorId: string | null;
  action: string;
  paperId?: string | null;
  invitationId?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  reason?: string | null;
  facts?: Prisma.InputJsonValue;
};

export async function recordConferenceEvent(tx: Prisma.TransactionClient, input: ConferenceEventInput) {
  await tx.conferenceEvent.create({
    data: {
      conferenceId: input.conferenceId,
      actorId: input.actorId,
      action: input.action,
      paperId: input.paperId ?? null,
      invitationId: input.invitationId ?? null,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      reason: input.reason ?? null,
      facts: input.facts ?? undefined
    }
  });
}

/** Mã hội nghị HN-<năm>-<số thứ tự>, cấp trong giao dịch từ document_number_counters. */
export async function issueConferenceCode(tx: Prisma.TransactionClient, year: number) {
  const rows = await tx.$queryRaw<Array<{ last_value: number }>>`
    INSERT INTO document_number_counters (scope, year, last_value) VALUES ('scientific-conference', ${year}, 1)
    ON CONFLICT (scope, year) DO UPDATE SET last_value = document_number_counters.last_value + 1
    RETURNING last_value`;
  return `HN-${year}-${String(rows[0].last_value).padStart(3, "0")}`;
}

/** Năm theo giờ Việt Nam. */
export function vietnamYear(date: Date) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).getUTCFullYear();
}
