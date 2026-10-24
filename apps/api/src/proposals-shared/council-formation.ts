import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import type { SafeUserContext } from "../auth/auth.types.js";
import type { PrismaService } from "../infrastructure/prisma/prisma.service.js";

export const COUNCIL_TYPES = ["EVALUATION", "ACCEPTANCE", "IRB"] as const;
export type CouncilType = (typeof COUNCIL_TYPES)[number];

/** Bốn role Phòng KHQS mà Admin được tích (spec P3). Thứ tự này là thứ tự chuẩn hóa khi lưu. */
export const COUNCIL_FORMATION_SELECTABLE_ROLES: readonly string[] = [
  "RESEARCH_MANAGEMENT_HEAD",
  "RESEARCH_MANAGEMENT_DEPUTY_HEAD",
  "RESEARCH_BOARD_HEAD",
  "RESEARCH_MANAGEMENT_STAFF"
];

export type CouncilFormationConfig = {
  councilType: CouncilType;
  allowedRoles: string[];
  memberCount: number;
  isDefault: boolean;
  updatedAt: string | null;
};

export const DEFAULT_COUNCIL_FORMATION: Record<CouncilType, { allowedRoles: string[]; memberCount: number }> = {
  EVALUATION: { allowedRoles: ["RESEARCH_MANAGEMENT_HEAD", "RESEARCH_BOARD_HEAD"], memberCount: 7 },
  ACCEPTANCE: { allowedRoles: ["RESEARCH_MANAGEMENT_HEAD", "RESEARCH_BOARD_HEAD"], memberCount: 7 },
  IRB: { allowedRoles: ["RESEARCH_MANAGEMENT_HEAD", "RESEARCH_BOARD_HEAD"], memberCount: 5 }
};

export const COUNCIL_MEMBER_COUNT_RANGE: Record<CouncilType, { min: number; max: number }> = {
  EVALUATION: { min: 5, max: 15 },
  ACCEPTANCE: { min: 3, max: 15 },
  IRB: { min: 3, max: 15 }
};

export const COUNCIL_TYPE_LABELS: Record<CouncilType, string> = {
  EVALUATION: "Hội đồng đánh giá (thẩm định)",
  ACCEPTANCE: "Hội đồng nghiệm thu",
  IRB: "Hội đồng đạo đức (IRB)"
};

export const COUNCIL_ROLE_LABELS: Record<string, string> = {
  RESEARCH_MANAGEMENT_HEAD: "Trưởng phòng KHQS (TP)",
  RESEARCH_MANAGEMENT_DEPUTY_HEAD: "Phó phòng KHQS (PP)",
  RESEARCH_BOARD_HEAD: "Trưởng ban QLKH (TB)",
  RESEARCH_MANAGEMENT_STAFF: "Chuyên viên QLKH (CV)"
};

export function isCouncilType(value: unknown): value is CouncilType {
  return typeof value === "string" && (COUNCIL_TYPES as readonly string[]).includes(value);
}

export function councilFormationKey(type: CouncilType) {
  return `council_formation.${type}`;
}

function invalid(message: string): never {
  throw new BadRequestException({ code: "COUNCIL_CONFIG_INVALID", message });
}

/** Validate và chuẩn hóa (sort role theo thứ tự chuẩn). Ném 400 COUNCIL_CONFIG_INVALID. */
export function parseCouncilFormationValue(type: CouncilType, raw: unknown): { allowedRoles: string[]; memberCount: number } {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      invalid("Giá trị cấu hình phải là JSON hợp lệ.");
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("Cấu hình hội đồng không hợp lệ.");
  const { allowedRoles, memberCount } = value as { allowedRoles?: unknown; memberCount?: unknown };

  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) invalid("Phải chọn ít nhất một vai trò được thành lập hội đồng.");
  if (new Set(allowedRoles).size !== allowedRoles.length) invalid("Vai trò không được trùng lặp.");
  if (allowedRoles.some((role) => typeof role !== "string" || !COUNCIL_FORMATION_SELECTABLE_ROLES.includes(role))) {
    invalid("Chỉ được chọn vai trò Phòng KHQS: TP, PP, TB, CV.");
  }

  const range = COUNCIL_MEMBER_COUNT_RANGE[type];
  if (typeof memberCount !== "number" || !Number.isInteger(memberCount) || memberCount < range.min || memberCount > range.max) {
    invalid(`Số lượng thành viên phải là số nguyên từ ${range.min} đến ${range.max}.`);
  }

  return {
    allowedRoles: COUNCIL_FORMATION_SELECTABLE_ROLES.filter((role) => (allowedRoles as string[]).includes(role)),
    memberCount: memberCount as number
  };
}

const UNREADABLE = {
  code: "COUNCIL_CONFIG_UNREADABLE",
  message: "Cấu hình hội đồng không hợp lệ. Liên hệ quản trị hệ thống."
};

/** Thiếu khóa → mặc định. Giá trị DB hỏng → fail closed (503), không tự dùng mặc định. */
export async function readCouncilFormationConfig(
  prisma: Pick<PrismaService, "systemParameter">,
  type: CouncilType
): Promise<CouncilFormationConfig> {
  const row = await prisma.systemParameter.findUnique({ where: { key: councilFormationKey(type) } });
  if (!row) return { councilType: type, ...DEFAULT_COUNCIL_FORMATION[type], isDefault: true, updatedAt: null };
  try {
    return {
      councilType: type,
      ...parseCouncilFormationValue(type, row.value),
      isDefault: false,
      updatedAt: row.updatedAt.toISOString()
    };
  } catch {
    throw new ServiceUnavailableException(UNREADABLE);
  }
}

/** Cấu trúc cố định: 1 Chủ tịch, 2 Phản biện, 1 Thư ký, Ủy viên = memberCount − 4 (spec P1). */
export const EVALUATION_COUNCIL_STRUCTURE = (memberCount: number) => ({
  council_chair: 1,
  reviewer: 2,
  committee_member: Math.max(memberCount - 4, 0),
  council_secretary: 1
});

export function canFormCouncil(
  actor: SafeUserContext | undefined,
  config: CouncilFormationConfig,
  proposal: { hostOrganizationUnitId: string },
  isActiveOfficer: boolean
): { allowed: true } | { allowed: false; code: "COUNCIL_FORMATION_DENIED"; reason: string } {
  const deny = (reason: string) => ({ allowed: false as const, code: "COUNCIL_FORMATION_DENIED" as const, reason });
  if (!actor || !COUNCIL_FORMATION_SELECTABLE_ROLES.includes(actor.systemRole) || !config.allowedRoles.includes(actor.systemRole)) {
    return deny("Vai trò của bạn không được cấu hình để thành lập hội đồng.");
  }
  if (actor.systemRole === "RESEARCH_MANAGEMENT_STAFF") {
    return isActiveOfficer ? { allowed: true } : deny("Chỉ chuyên viên đang phụ trách hồ sơ được thành lập hội đồng.");
  }
  if (!actor.organizationScopes.some((scope) => scope.id === proposal.hostOrganizationUnitId)) {
    return deny("Hồ sơ không thuộc đơn vị trong phạm vi của bạn.");
  }
  return { allowed: true };
}
