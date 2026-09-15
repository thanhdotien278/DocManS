import { BadRequestException, type PipeTransform } from "@nestjs/common";
// @ts-ignore: runtime package is JavaScript; repository consumers use its TypeScript source contract.
import { isContextVersionTokenV1, type ContextVersionTokenV1 } from "@rtms/permissions";

export type CreateResearcherProfileDto = {
  fullName: string;
  managementOrganizationUnitId: string;
  profileType?: "INTERNAL" | "EXTERNAL";
  externalAffiliation?: string;
  academicRankCatalogItemId?: string;
  academicDegreeCatalogItemId?: string;
  title?: string;
  position?: string;
  militaryRank?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactNote?: string;
  researchFieldIds: string[];
  expertiseKeywords?: string[];
  publications?: ResearcherProfilePublicationInput[];
  participations?: ResearcherProfileParticipationInput[];
  confirmDuplicate?: boolean;
};

export type ResearcherProfilePublicationInput = {
  id?: string;
  title: string;
  venue?: string | null;
  publicationYear?: number | null;
  doi?: string | null;
  authors?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  notes?: string | null;
};

export type ResearcherProfileParticipationInput = {
  id?: string;
  projectTitle: string;
  participationRole: string;
  level: "ACADEMY_INSTITUTIONAL" | "MINISTRY" | "OTHER";
  startsOn?: string | null;
  endsOn?: string | null;
  status?: "ACTIVE" | "INACTIVE" | "SUPERSEDED";
  notes?: string | null;
  sourceType?: "SELF_REPORTED";
  sourceRecordId?: string | null;
};

export type UpdateResearcherProfileDto = Partial<Omit<CreateResearcherProfileDto, "managementOrganizationUnitId" | "confirmDuplicate" | "externalAffiliation" | "academicRankCatalogItemId" | "academicDegreeCatalogItemId" | "title" | "position" | "militaryRank" | "contactEmail" | "contactPhone" | "contactNote">> & {
  externalAffiliation?: string | null; academicRankCatalogItemId?: string | null; academicDegreeCatalogItemId?: string | null; title?: string | null; position?: string | null; militaryRank?: string | null; contactEmail?: string | null; contactPhone?: string | null; contactNote?: string | null;
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

function updateText(input: Record<string, unknown>, field: string, maxLength: number) {
  if (!(field in input)) return undefined;
  const value = input[field];
  if (value === null || value === "") return null;
  return text(input, field, maxLength);
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
  if (!Array.isArray(value) || value.length > 64 || value.some((item) => typeof item !== "string" || item.length > 160)) invalid(["expertiseKeywords"]);
  const result = [...new Set((value as string[]).map((item) => item.normalize("NFC").trim()).filter(Boolean))];
  return result;
}

function profileType(input: Record<string, unknown>) {
  if (input.profileType === undefined) return undefined;
  if (input.profileType !== "INTERNAL" && input.profileType !== "EXTERNAL") invalid(["profileType"]);
  return input.profileType as "INTERNAL" | "EXTERNAL";
}

function optionalDate(input: Record<string, unknown>, field: string) {
  if (!(field in input)) return undefined;
  const value = input[field];
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) invalid([field]);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) invalid([field]);
  return value;
}

function publications(input: Record<string, unknown>) {
  if (input.publications === undefined) return undefined;
  if (!Array.isArray(input.publications) || input.publications.length > 100) invalid(["publications"]);
  return (input.publications as unknown[]).map((value) => publication(value));
}

function publication(value: unknown): ResearcherProfilePublicationInput {
  const input = record(value);
  const title = text(input, "title", 500, true)!;
  const year = input.publicationYear === undefined || input.publicationYear === null || input.publicationYear === "" ? null : input.publicationYear;
  if (year !== null && (typeof year !== "number" || !Number.isInteger(year) || year < 1800 || year > 2200)) invalid(["publicationYear"]);
  const status = input.status === undefined ? "ACTIVE" : input.status;
  if (status !== "ACTIVE" && status !== "INACTIVE") invalid(["status"]);
  return {
    id: input.id === undefined ? undefined : text(input, "id", 80, true),
    title,
    venue: updateText(input, "venue", 300),
    publicationYear: year as number | null,
    doi: updateText(input, "doi", 240),
    authors: updateText(input, "authors", 1000),
    status,
    notes: updateText(input, "notes", 1000)
  };
}

function participations(input: Record<string, unknown>) {
  if (input.participations === undefined) return undefined;
  if (!Array.isArray(input.participations) || input.participations.length > 100) invalid(["participations"]);
  return (input.participations as unknown[]).map((value) => participation(value));
}

function participation(value: unknown): ResearcherProfileParticipationInput {
  const input = record(value);
  const level = input.level;
  if (level !== "ACADEMY_INSTITUTIONAL" && level !== "MINISTRY" && level !== "OTHER") invalid(["level"]);
  const status = input.status === undefined ? "ACTIVE" : input.status;
  if (status !== "ACTIVE" && status !== "INACTIVE") invalid(["status"]);
  if (input.sourceRecordId != null) invalid(["sourceRecordId"]);
  const sourceType = input.sourceType === undefined ? "SELF_REPORTED" : input.sourceType;
  if (sourceType !== "SELF_REPORTED") invalid(["sourceType"]);
  const startsOn = optionalDate(input, "startsOn");
  const endsOn = optionalDate(input, "endsOn");
  if (startsOn && endsOn && startsOn > endsOn) invalid(["endsOn"]);
  return {
    id: input.id === undefined ? undefined : text(input, "id", 80, true),
    projectTitle: text(input, "projectTitle", 500, true)!,
    participationRole: text(input, "participationRole", 240, true)!,
    level,
    startsOn: startsOn as string | null | undefined,
    endsOn: endsOn as string | null | undefined,
    status,
    notes: updateText(input, "notes", 1000),
    sourceType
  };
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
      profileType: profileType(input) ?? "INTERNAL",
      externalAffiliation: text(input, "externalAffiliation", 240),
      academicRankCatalogItemId: text(input, "academicRankCatalogItemId", 80),
      academicDegreeCatalogItemId: text(input, "academicDegreeCatalogItemId", 80),
      title: text(input, "title", 240),
      position: text(input, "position", 240),
      militaryRank: text(input, "militaryRank", 160),
      contactEmail: optionalEmail(input),
      contactPhone: optionalPhone(input),
      contactNote: text(input, "contactNote", 500),
      researchFieldIds,
      expertiseKeywords: keywords(input),
      publications: publications(input),
      participations: participations(input),
      confirmDuplicate: confirmDuplicate(input)
    };
  }
};

export const updateResearcherProfilePipe: PipeTransform<unknown, UpdateResearcherProfileDto> = {
  transform(value) {
    const input = record(value);
    const result: Record<string, unknown> = { contextVersion: contextVersion(input) };
    for (const [field, maxLength] of [["externalAffiliation", 240], ["academicRankCatalogItemId", 80], ["academicDegreeCatalogItemId", 80], ["title", 240], ["position", 240], ["militaryRank", 160], ["contactNote", 500]] as const) {
      if (input[field] !== undefined) result[field] = updateText(input, field, maxLength);
    }
    if (input.fullName !== undefined) result.fullName = text(input, "fullName", 240, true);
    if (input.profileType !== undefined) result.profileType = profileType(input);
    if (input.contactEmail !== undefined) result.contactEmail = input.contactEmail === null || input.contactEmail === "" ? null : optionalEmail(input);
    if (input.contactPhone !== undefined) result.contactPhone = input.contactPhone === null || input.contactPhone === "" ? null : optionalPhone(input);
    if (input.researchFieldIds !== undefined) result.researchFieldIds = ids(input, "researchFieldIds", true);
    if (input.expertiseKeywords !== undefined) result.expertiseKeywords = keywords(input);
    if (input.publications !== undefined) result.publications = publications(input);
    if (input.participations !== undefined) result.participations = participations(input);
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

export const updateMyProfilePipe: PipeTransform<unknown, UpdateResearcherProfileDto> = {
  transform(value) {
    const input = record(value);
    const allowed = new Set(["contextVersion", "fullName", "externalAffiliation", "academicRankCatalogItemId", "academicDegreeCatalogItemId", "title", "position", "militaryRank", "contactEmail", "contactPhone", "contactNote", "researchFieldIds", "expertiseKeywords", "publications", "participations"]);
    if (Object.keys(input).some((key) => !allowed.has(key))) invalid(["administrativeFields"]);
    return updateResearcherProfilePipe.transform(input, { type: "body" });
  }
};

export type ResearcherAccountInput = { contextVersion: ContextVersionTokenV1; username?: string; email?: string; userId?: string; reason?: string };
export const researcherAccountPipe: PipeTransform<unknown, ResearcherAccountInput> = {
  transform(value) {
    const input = record(value);
    const allowed = new Set(["contextVersion", "username", "email", "userId", "reason"]);
    if (Object.keys(input).some((key) => !allowed.has(key))) invalid(["body"]);
    const email = text(input, "email", 240);
    if (email && !/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(email)) invalid(["email"]);
    return { contextVersion: contextVersion(input), username: text(input, "username", 80), email: email?.toLowerCase(), userId: text(input, "userId", 80), reason: text(input, "reason", 500) };
  }
};
