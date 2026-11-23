// Giờ Việt Nam cố định UTC+7 (không có giờ mùa hè), dùng chung cho thống kê, xuất Excel và ảnh chụp sức khoẻ đề tài.
export const DAY_MS = 86_400_000;
const VN_OFFSET_MS = 7 * 3_600_000;

export function vietnamIsoDate(date: Date): string {
  return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

export function vietnamYear(value: Date | string | null | undefined, fallback: Date): number {
  const source = value ? new Date(value) : fallback;
  const ms = Number.isNaN(source.getTime()) ? fallback.getTime() : source.getTime();
  return new Date(ms + VN_OFFSET_MS).getUTCFullYear();
}

export function vietnamDateParts(now = new Date()) {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  const dateStr = vn.toISOString().slice(0, 10);
  return {
    dateStr,
    snapshotDate: new Date(`${dateStr}T00:00:00.000Z`),
    dayOfWeek: vn.getUTCDay(),
    hour: vn.getUTCHours(),
    minute: vn.getUTCMinutes()
  };
}

/** Khoảng lọc ngày tối đa 3 năm kể từ ngày bắt đầu. */
export function maxRangeEndUtc(fromDate: Date): Date {
  return new Date(Date.UTC(fromDate.getUTCFullYear() + 3, fromDate.getUTCMonth(), fromDate.getUTCDate()));
}
