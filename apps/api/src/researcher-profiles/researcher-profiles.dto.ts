import { BadRequestException, type PipeTransform } from "@nestjs/common";
// @ts-ignore: runtime package is JavaScript; repository consumers use its TypeScript source contract.
import { isContextVersionTokenV1, type ContextVersionTokenV1 } from "@rtms/permissions";

export type CreateResearcherProfileDto = {
  fullName: string;
  managementOrganizationUnitId: string;
  externalAffiliation?: string;
  academicRankCatalogItemId?: string;
  academicDegreeCatalogItemId?: string;
  title?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactNote?: string;
  researchFieldIds: string[];
  expertiseKeywords?: string[];
  confirmDuplicate?: boolean;
};

export type UpdateResearcherProfileDto = Partial<Omit<CreateResearcherProfileDto, "managementOrganizationUnitId">> & {
  contextVersion: ContextVersionTokenV1;
};

function invalid(fields: string[]): never {
  throw new BadRequestException({
    message: "Dữ liệu hồ sơ nhà khoa học không hợp lệ.",
    errors: fields.map((field) => ({ field, message: `${field} không hợp lệ.` }))
  });
}

function text(input: Record<string, unknown>, field: string, maxLength: number, required = false) {
  const value = input[field];
  if (value === undefined || value === null || value === "") {
    if (required) invalid([field]);
    return undefined;
  }
  if (typeof value !== "string") invalid([field]);
  const normalized = (value as string).normalize("NFC").trim();
  if (!normalized || normalized.length > maxLength) invalid([field]);
  return normalized;
}

function optionalEmail(input: Record<string, unknown>) {
  const value = text(input, "contactEmail", 240);
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) invalid(["contactEmail"]);
  return value;
}

function optionalPhone(input: Record<string, unknown>) {
  const value = text(input, "contactPhone", 40);
  if (value && !/^\+?[0-9 ()-]{7,40}$/.test(value)) invalid(["contactPhone"]);
  return value;
}

function ids(input: Record<string, unknown>, field: string, required: boolean) {
  const value = input[field];
  if (value === undefined && !required) return undefined;
  if (!Array.isArray(value) || (required && value.length === 0) || value.length > 64 || value.some((item) => typeof item !== "string" || !item.trim() || item.length > 80)) invalid([field]);
  return [...new Set((value as string[]).map((item) => item.trim()))];
}

function keywords(input: Record<string, unknown>) {
  const value = input.expertiseKeywords;
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 64 || value.some((item) => typeof item !== "string" || !item.trim() || item.length > 160)) invalid(["expertiseKeywords"]);
  const result = [...new Set((value as string[]).map((item) => item.normalize("NFC").trim()).filter(Boolean))];
  if (result.length === 0) invalid(["expertiseKeywords"]);
  return result;
}

function contextVersion(input: Record<string, unknown>) {
  const value = input.contextVersion;
  if (!isContextVersionTokenV1(value)) invalid(["contextVersion"]);
  return value as ContextVersionTokenV1;
}

function confirmDuplicate(input: Record<string, unknown>) {
  if (input.confirmDuplicate !== undefined && typeof input.confirmDuplicate !== "boolean") invalid(["confirmDuplicate"]);
  return input.confirmDuplicate === true;
}

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(["body"]);
  return value as Record<string, unknown>;
}

export const createResearcherProfilePipe: PipeTransform<unknown, CreateResearcherProfileDto> = {
  transform(value) {
    const input = record(value);
    const managementOrganizationUnitId = text(input, "managementOrganizationUnitId", 80, true)!;
    const fullName = text(input, "fullName", 240, true)!;
    const researchFieldIds = ids(input, "researchFieldIds", true)!;
    return {
      fullName,
      managementOrganizationUnitId,
      externalAffiliation: text(input, "externalAffiliation", 240),
      academicRankCatalogItemId: text(input, "academicRankCatalogItemId", 80),
      academicDegreeCatalogItemId: text(input, "academicDegreeCatalogItemId", 80),
      title: text(input, "title", 240),
      contactEmail: optionalEmail(input),
      contactPhone: optionalPhone(input),
      contactNote: text(input, "contactNote", 500),
      researchFieldIds,
      expertiseKeywords: keywords(input),
      confirmDuplicate: confirmDuplicate(input)
    };
  }
};

export const updateResearcherProfilePipe: PipeTransform<unknown, UpdateResearcherProfileDto> = {
  transform(value) {
    const input = record(value);
    const result: Record<string, unknown> = { contextVersion: contextVersion(input) };
    for (const [field, maxLength] of [["fullName", 240], ["externalAffiliation", 240], ["academicRankCatalogItemId", 80], ["academicDegreeCatalogItemId", 80], ["title", 240], ["contactNote", 500]] as const) {
      if (input[field] !== undefined) result[field] = text(input, field, maxLength);
    }
    if (input.contactEmail !== undefined) result.contactEmail = optionalEmail(input);
    if (input.contactPhone !== undefined) result.contactPhone = optionalPhone(input);
    if (input.researchFieldIds !== undefined) result.researchFieldIds = ids(input, "researchFieldIds", true);
    if (input.expertiseKeywords !== undefined) result.expertiseKeywords = keywords(input);
    if (Object.keys(result).length === 1) invalid(["body"]);
    return result as UpdateResearcherProfileDto;
  }
};

export const researcherProfileMutationPipe: PipeTransform<unknown, { contextVersion: ContextVersionTokenV1 }> = {
  transform(value) {
    const input = record(value);
    return { contextVersion: contextVersion(input) };
  }
};
