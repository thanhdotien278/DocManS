/**
 * Loại đơn vị và chức danh lãnh đạo đơn vị trong Học viện. Chức danh chỉ để hiển thị cùng tài khoản (một nhà
 * khoa học có chức danh vẫn là người dùng thông thường): KHÔNG dùng chức danh để phân quyền ở bất kỳ đâu.
 */

export const UNIT_TYPES = ["INSTITUTE", "DEPARTMENT", "FACULTY", "DIVISION", "OTHER"] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  INSTITUTE: "Viện",
  DEPARTMENT: "Phòng",
  FACULTY: "Khoa",
  DIVISION: "Bộ môn",
  OTHER: "Khác"
};

export type PositionDefinition = { code: string; label: string; max: number };

/** Chức danh theo loại đơn vị, kèm số người tối đa giữ chức danh đó trong một đơn vị. */
export const UNIT_POSITIONS: Record<UnitType, PositionDefinition[]> = {
  INSTITUTE: [
    { code: "DIRECTOR", label: "Giám đốc", max: 1 },
    { code: "DEPUTY_DIRECTOR", label: "Phó Giám đốc", max: 5 }
  ],
  DEPARTMENT: [
    { code: "HEAD", label: "Trưởng phòng", max: 1 },
    { code: "DEPUTY_HEAD", label: "Phó phòng", max: 2 }
  ],
  FACULTY: [
    { code: "HEAD", label: "Trưởng khoa", max: 1 },
    { code: "DEPUTY_HEAD", label: "Phó khoa", max: 2 }
  ],
  DIVISION: [
    { code: "HEAD", label: "Chủ nhiệm Bộ môn", max: 1 },
    { code: "DEPUTY_HEAD", label: "Phó Chủ nhiệm Bộ môn", max: 2 }
  ],
  OTHER: []
};

export function isUnitType(value: unknown): value is UnitType {
  return typeof value === "string" && (UNIT_TYPES as readonly string[]).includes(value);
}

export function findPosition(unitType: string, code: string) {
  return isUnitType(unitType) ? UNIT_POSITIONS[unitType].find((position) => position.code === code) ?? null : null;
}

/** Nhãn hiển thị: "Trưởng khoa – Khoa Nội". */
export function positionDisplay(unitType: string, code: string, unitName: string) {
  const position = findPosition(unitType, code);
  return position ? `${position.label} – ${unitName}` : unitName;
}

/** Đoán loại đơn vị theo tên (dùng khi tạo đơn vị chưa chọn loại; dữ liệu cũ được xếp loại trong migration). */
export function inferUnitType(name: string): UnitType {
  const normalized = name.trim().toLowerCase();
  if (normalized.startsWith("viện")) return "INSTITUTE";
  if (normalized.startsWith("phòng")) return "DEPARTMENT";
  if (normalized.startsWith("khoa")) return "FACULTY";
  if (normalized.startsWith("bộ môn")) return "DIVISION";
  return "OTHER";
}
