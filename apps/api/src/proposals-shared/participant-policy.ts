import { BadRequestException } from "@nestjs/common";
import type { PrismaService } from "../infrastructure/prisma/prisma.service.js";

/**
 * D-041: QT cấu hình TP/TB/CV có được làm PI/thành viên (`pi`), có xem dữ liệu quản lý (`view`) và có
 * thực hiện thao tác quản lý (`manage`, phần 2) trên hồ sơ/đề tài mình tham gia hay không. Vai trò khác luôn theo mặc định.
 */
export const PARTICIPANT_POLICY_KEY = "participant_policy";

export const PARTICIPANT_POLICY_ROLES = ["RESEARCH_MANAGEMENT_HEAD", "RESEARCH_BOARD_HEAD", "RESEARCH_MANAGEMENT_STAFF"] as const;
export type ParticipantPolicyRole = (typeof PARTICIPANT_POLICY_ROLES)[number];
export type ParticipantPolicyEntry = { pi: boolean; view: boolean; manage: boolean };
export type ParticipantPolicy = Record<ParticipantPolicyRole, ParticipantPolicyEntry>;

/** Mặc định = hành vi trước D-041: được làm PI/thành viên, không xem, không phụ trách hồ sơ mình tham gia. */
export const DEFAULT_PARTICIPANT_ENTRY: ParticipantPolicyEntry = Object.freeze({ pi: true, view: false, manage: false });

export function defaultParticipantPolicy(): ParticipantPolicy {
  return Object.fromEntries(PARTICIPANT_POLICY_ROLES.map((role) => [role, { ...DEFAULT_PARTICIPANT_ENTRY }])) as ParticipantPolicy;
}

export const PARTICIPANT_POLICY_ROLE_LABELS: Record<ParticipantPolicyRole, string> = {
  RESEARCH_MANAGEMENT_HEAD: "Trưởng phòng KHQS (TP)",
  RESEARCH_BOARD_HEAD: "Trưởng ban QLKH (TB)",
  RESEARCH_MANAGEMENT_STAFF: "Chuyên viên QLKH (CV)"
};

function invalid(message: string): never {
  throw new BadRequestException({ code: "PARTICIPANT_POLICY_INVALID", message });
}

/**
 * Validate chặt: đủ ba vai trò, mỗi vai trò có `pi`, `view`, `manage` kiểu boolean. Ném 400 PARTICIPANT_POLICY_INVALID.
 * `legacy` (chỉ khi đọc giá trị đã lưu): cho phép thiếu `manage` (cấu hình phần 1) và coi là `false`.
 */
export function parseParticipantPolicyValue(raw: unknown, { legacy = false }: { legacy?: boolean } = {}): ParticipantPolicy {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      invalid("Giá trị cấu hình phải là JSON hợp lệ.");
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("Cấu hình người tham gia không hợp lệ.");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !(PARTICIPANT_POLICY_ROLES as readonly string[]).includes(key))) invalid("Chỉ cấu hình được TP, TB, CV.");
  const policy = {} as ParticipantPolicy;
  for (const role of PARTICIPANT_POLICY_ROLES) {
    const entry = record[role];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) invalid(`Thiếu cấu hình cho ${PARTICIPANT_POLICY_ROLE_LABELS[role]}.`);
    const { pi, view, manage = legacy ? false : undefined, ...rest } = entry as Record<string, unknown>;
    if (typeof pi !== "boolean" || typeof view !== "boolean" || typeof manage !== "boolean" || Object.keys(rest).length) invalid(`Cấu hình ${PARTICIPANT_POLICY_ROLE_LABELS[role]} phải có đúng ba giá trị bật/tắt.`);
    policy[role] = { pi, view, manage };
  }
  return policy;
}

/** Đọc mỗi request/mutation. Thiếu khóa, giá trị hỏng hoặc lỗi đọc → mặc định (fail closed về hành vi cũ), không bao giờ ném. */
export async function readParticipantPolicy(prisma: Pick<PrismaService, "systemParameter">): Promise<ParticipantPolicy> {
  try {
    const row = await prisma.systemParameter.findUnique({ where: { key: PARTICIPANT_POLICY_KEY } });
    return row ? parseParticipantPolicyValue(row.value, { legacy: true }) : defaultParticipantPolicy();
  } catch {
    return defaultParticipantPolicy();
  }
}

/** "Phụ trách" kéo theo "Xem": `view` trả về là `view || manage`. */
export function participantPolicyFor(actor: { systemRole?: string | null } | undefined | null, policy?: ParticipantPolicy | null): ParticipantPolicyEntry {
  const role = actor?.systemRole;
  if (!role || !(PARTICIPANT_POLICY_ROLES as readonly string[]).includes(role)) return { ...DEFAULT_PARTICIPANT_ENTRY };
  const entry = { ...DEFAULT_PARTICIPANT_ENTRY, ...(policy?.[role as ParticipantPolicyRole] ?? {}) };
  return { ...entry, view: entry.view || entry.manage };
}
