import { BadRequestException, type PipeTransform } from "@nestjs/common";
// @ts-ignore Runtime package is JavaScript; its TypeScript source is the contract.
import { isContextVersionTokenV1, isDelegablePermissionActionV1, isPermissionActionV1 } from "@rtms/permissions";

export type CreateDelegationDto = { delegateUserId: string; actionIds: string[]; startsAt: string; endsAt: string | null; reason: string; contextVersion: unknown };
export type DelegationContextDto = { contextVersion: unknown };

function parse(value: unknown): CreateDelegationDto {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException({ message: "Dữ liệu ủy quyền không hợp lệ." });
  const input = value as Record<string, unknown>;
  const actions = input.actionIds;
  if (typeof input.delegateUserId !== "string" || !input.delegateUserId || !Array.isArray(actions) || !actions.length || new Set(actions).size !== actions.length || !actions.every((a) => typeof a === "string" && isPermissionActionV1(a) && isDelegablePermissionActionV1(a))) throw new BadRequestException({ message: "Danh sách action ủy quyền không hợp lệ." });
  const start = Date.parse(String(input.startsAt));
  const end = input.endsAt === null || input.endsAt === undefined ? null : Date.parse(String(input.endsAt));
  if (!Number.isFinite(start) || (end !== null && (!Number.isFinite(end) || start >= end)) || typeof input.reason !== "string" || !input.reason.trim() || input.reason.length > 2000 || !isContextVersionTokenV1(input.contextVersion)) throw new BadRequestException({ message: "Thời hạn, lý do hoặc contextVersion ủy quyền không hợp lệ." });
  return { delegateUserId: input.delegateUserId, actionIds: actions as string[], startsAt: new Date(start).toISOString(), endsAt: end === null ? null : new Date(end).toISOString(), reason: input.reason.trim(), contextVersion: input.contextVersion };
}

export const createDelegationPipe: PipeTransform<unknown, CreateDelegationDto> = { transform: parse };
export const delegationContextPipe: PipeTransform<unknown, DelegationContextDto> = { transform(value: unknown) { if (!value || typeof value !== "object" || !isContextVersionTokenV1((value as Record<string, unknown>).contextVersion)) throw new BadRequestException({ message: "Thiếu contextVersion ủy quyền." }); return value as DelegationContextDto; } };
