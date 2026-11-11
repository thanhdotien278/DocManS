import { BadRequestException } from "@nestjs/common";

/** Story 6.13: quy tắc số liệu kinh phí dùng chung cho ghi sổ, tạo đề tài và thanh lý. Không truy cập DB. */
export const FUNDING_KINDS = ["GRANT", "DISBURSEMENT", "SETTLEMENT"] as const;
export type FundingKind = (typeof FUNDING_KINDS)[number];
export type FundingTotals = Record<FundingKind, number>;
// 10^13 đồng: đủ cho mọi đề tài, chặn giá trị vô lý hoặc tràn số.
export const MAX_FUNDING_AMOUNT = 10_000_000_000_000;

function invalid(message: string): never {
  throw new BadRequestException({ code: "FUNDING_INVALID", message });
}

export function readFundingAmount(value: unknown, field = "Số tiền"): number {
  const amount = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 || amount > MAX_FUNDING_AMOUNT) invalid(`${field} phải là số không âm, tối đa ${MAX_FUNDING_AMOUNT.toLocaleString("vi-VN")} đồng.`);
  return Math.round(amount);
}

/** Kinh phí được duyệt: số lãnh đạo sửa khi phê duyệt (`approvedAmount`) ưu tiên hơn số đề xuất (`amount`). */
export function readApprovedBudget(budgetMetadata: unknown): number {
  if (!budgetMetadata || typeof budgetMetadata !== "object") return 0;
  const record = budgetMetadata as Record<string, unknown>;
  for (const key of ["approvedAmount", "amount"]) {
    const raw = record[key];
    if (raw === undefined || raw === null || raw === "") continue;
    const amount = Number(raw);
    return Number.isFinite(amount) && amount >= 0 && amount <= MAX_FUNDING_AMOUNT ? Math.round(amount) : 0;
  }
  return 0;
}

export function latestFunding<T extends { entryId: string; version: number }>(rows: T[]): T[] {
  const latest = new Map<string, T>();
  for (const row of rows) if (!latest.has(row.entryId) || latest.get(row.entryId)!.version < row.version) latest.set(row.entryId, row);
  return [...latest.values()];
}

export function fundingTotals(records: Array<{ kind: string; amount: unknown }>): FundingTotals {
  const totals: FundingTotals = { GRANT: 0, DISBURSEMENT: 0, SETTLEMENT: 0 };
  for (const row of records) if (row.kind in totals) totals[row.kind as FundingKind] += Number(row.amount);
  return totals;
}

export function assertFundingInvariant(totals: FundingTotals): void {
  if (totals.DISBURSEMENT > totals.GRANT) invalid(`Tổng đã giải ngân (${totals.DISBURSEMENT.toLocaleString("vi-VN")} đ) không được vượt kinh phí được cấp (${totals.GRANT.toLocaleString("vi-VN")} đ).`);
  if (totals.SETTLEMENT > totals.DISBURSEMENT) invalid(`Tổng đã quyết toán (${totals.SETTLEMENT.toLocaleString("vi-VN")} đ) không được vượt số đã giải ngân (${totals.DISBURSEMENT.toLocaleString("vi-VN")} đ).`);
}
