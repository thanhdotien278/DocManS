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
  provisionAccount?: boolean;
};

export type ResearcherProfilePublicationInput = {
  id?: string;
  title: string;
  venue?: string | null;
  publicationYear?: number | null;
  doi?: string | null;
  authors?: string | null;
  issnIsbn?: string | null;
  classification?: string | null;
  proofUrl?: string | null;
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
  curriculumVitae?: ScientificCurriculumVitae;
  username?: string | null;
  contextVersion: ContextVersionTokenV1;
};

export type ScientificCurriculumVitae = {
  cvSchemaVersion: 1;
  note?: string | null;
  personalInfo?: ScientificCurriculumVitaePersonalInfo;
  educationHistory?: ScientificCurriculumVitaeEducation[];
  workHistory?: ScientificCurriculumVitaeWorkHistory;
  researchExperience?: ScientificCurriculumVitaeResearchExperience;
};

export type ScientificCurriculumVitaePersonalInfo = {
  avatarUrl?: string | null;
  scientistType: "DOMESTIC" | "FOREIGN";
  gender: "Nam" | "Nữ" | "Khác";
  birthDate?: string | null;
  birthPlace?: string | null;
  nationality?: string | null;
  idNumber: string;
  idIssueDate?: string | null;
  idIssuePlace?: string | null;
  englishAcademicTitle?: string | null;
  contactAddress?: string | null;
  organization: string;
  bankAccount?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  smartCaSerial?: string | null;
  shareDataAgreement: boolean;
  languages?: ScientificCurriculumVitaeLanguage[];
};

export type ScientificCurriculumVitaeLanguage = { language: string; proficiency?: string | null; certificate?: string | null };
export type ScientificCurriculumVitaeEducation = { degreeLevel: string; major: string; institution: string; graduationYear?: number | null; trainingMode?: string | null; thesisTitle?: string | null };
export type ScientificCurriculumVitaeWorkHistory = { summary?: string | null; items?: ScientificCurriculumVitaeWorkItem[] };
export type ScientificCurriculumVitaeWorkItem = { period: string; organization: string; position?: string | null; workField?: string | null };
export type ScientificCurriculumVitaeResearchExperience = {
  intellectualProperty?: ScientificCurriculumVitaeIntellectualProperty[];
  awards?: ScientificCurriculumVitaeAward[];
  projects?: ScientificCurriculumVitaeProject[];
};
export type ScientificCurriculumVitaeIntellectualProperty = { title: string; authors?: string | null; issueYear?: number | null; patentNumber?: string | null; issueAgency?: string | null; proofUrl?: string | null; notes?: string | null };
export type ScientificCurriculumVitaeAward = { name: string; awardYear?: number | null; endYear?: number | null; grantingAgency?: string | null; proofUrl?: string | null; notes?: string | null };
export type ScientificCurriculumVitaeProject = { projectTitle: string; managementAgency?: string | null; code?: string | null; role: string; period?: string | null; status?: string | null; notes?: string | null };

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

function optionalUsername(input: Record<string, unknown>) {
  if (!("username" in input)) return undefined;
  const value = input.username;
  if (value === null || value === "") return null;
  if (typeof value !== "string") invalid(["username"]);
  const normalized = value.normalize("NFC").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_.+-]{2,79}$/.test(normalized)) invalid(["username"]);
  return normalized;
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
  if (!Array.isArray(input.publications) || input.publications.length > 200) invalid(["publications"]);
  return (input.publications as unknown[]).map((value, index) => publication(value, `publications.${index}`));
}

function safeUrl(value: string | null | undefined, path: string) {
  if (value != null && !/^(https?:\/\/|\/)/i.test(value)) invalid([path]);
  return value;
}

function publication(value: unknown, path: string): ResearcherProfilePublicationInput {
  const input = record(value);
  const title = text(input, "title", 1000, true)!;
  const year = input.publicationYear === undefined || input.publicationYear === null || input.publicationYear === "" ? null : input.publicationYear;
  if (year !== null && (typeof year !== "number" || !Number.isInteger(year) || year < 1800 || year > 2200)) invalid(["publicationYear"]);
  const status = input.status === undefined ? "ACTIVE" : input.status;
  if (status !== "ACTIVE" && status !== "INACTIVE") invalid(["status"]);
  return {
    id: input.id === undefined ? undefined : text(input, "id", 80, true),
    title,
    venue: updateText(input, "venue", 1000),
    publicationYear: year as number | null,
    doi: updateText(input, "doi", 1000),
    authors: updateText(input, "authors", 1000),
    issnIsbn: updateText(input, "issnIsbn", 1000),
    classification: updateText(input, "classification", 1000),
    proofUrl: safeUrl(updateText(input, "proofUrl", 1000), `${path}.proofUrl`),
    status,
    notes: updateText(input, "notes", 4000)
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

function provisionAccount(input: Record<string, unknown>) {
  if (input.provisionAccount !== undefined && typeof input.provisionAccount !== "boolean") invalid(["provisionAccount"]);
  return input.provisionAccount === true;
}

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(["body"]);
  return value as Record<string, unknown>;
}

function cvRecord(value: unknown, path: string, allowed: readonly string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid([path]);
  const input = value as Record<string, unknown>;
  const unknown = Object.keys(input).find((key) => !allowed.includes(key));
  if (unknown !== undefined) invalid([`${path}.${unknown}`]);
  return input;
}

function cvText(value: unknown, path: string, maxLength: number, required = false) {
  if (value === undefined || value === null || value === "") {
    if (required) invalid([path]);
    return undefined;
  }
  if (typeof value !== "string") invalid([path]);
  const normalized = (value as string).normalize("NFC").trim();
  if (!normalized || normalized.length > maxLength) invalid([path]);
  return normalized;
}

function cvOptionalText(input: Record<string, unknown>, field: string, path: string, maxLength = 1000) {
  if (!(field in input)) return undefined;
  if (input[field] === null || input[field] === "") return null;
  return cvText(input[field], `${path}.${field}`, maxLength);
}

function cvRequiredText(input: Record<string, unknown>, field: string, path: string, maxLength = 1000) {
  return cvText(input[field], `${path}.${field}`, maxLength, true)!;
}

function cvEnum<T extends string>(value: unknown, path: string, values: readonly T[]) {
  if (typeof value !== "string") invalid([path]);
  const normalized = value.normalize("NFC").trim();
  if (!values.includes(normalized as T)) invalid([path]);
  return normalized as T;
}

function cvDate(input: Record<string, unknown>, field: string, path: string) {
  if (!(field in input)) return undefined;
  const value = input[field];
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) invalid([`${path}.${field}`]);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) invalid([`${path}.${field}`]);
  return value;
}

function cvYear(input: Record<string, unknown>, field: string, path: string, minimum = 1900) {
  if (!(field in input)) return undefined;
  const value = input[field];
  if (value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > 2100) invalid([`${path}.${field}`]);
  return value;
}

function cvBoolean(input: Record<string, unknown>, field: string, path: string, required = false) {
  if (!(field in input)) {
    if (required) invalid([`${path}.${field}`]);
    return undefined;
  }
  if (typeof input[field] !== "boolean") invalid([`${path}.${field}`]);
  return input[field] as boolean;
}

function cvRows<T>(input: Record<string, unknown>, field: string, path: string, parse: (value: unknown, rowPath: string) => T) {
  if (!(field in input)) return undefined;
  const value = input[field];
  if (!Array.isArray(value) || value.length > 200) invalid([path]);
  return (value as unknown[]).map((row, index) => parse(row, `${path}.${index}`));
}

function cvLanguage(value: unknown, path: string): ScientificCurriculumVitaeLanguage {
  const input = cvRecord(value, path, ["language", "proficiency", "certificate"]);
  const result: Record<string, unknown> = { language: cvRequiredText(input, "language", path) };
  for (const field of ["proficiency", "certificate"] as const) {
    const next = cvOptionalText(input, field, path);
    if (next !== undefined) result[field] = next;
  }
  return result as ScientificCurriculumVitaeLanguage;
}

function cvPersonalInfo(input: Record<string, unknown>) {
  const path = "curriculumVitae.personalInfo";
  const value = input.personalInfo;
  const personal = cvRecord(value, path, ["avatarUrl", "scientistType", "gender", "birthDate", "birthPlace", "nationality", "idNumber", "idIssueDate", "idIssuePlace", "englishAcademicTitle", "contactAddress", "organization", "bankAccount", "bankName", "bankBranch", "smartCaSerial", "shareDataAgreement", "languages"]);
  const result: Record<string, unknown> = {
    scientistType: cvEnum(personal.scientistType, `${path}.scientistType`, ["DOMESTIC", "FOREIGN"]),
    gender: cvEnum(personal.gender, `${path}.gender`, ["Nam", "Nữ", "Khác"]),
    idNumber: cvRequiredText(personal, "idNumber", path),
    organization: cvRequiredText(personal, "organization", path),
    shareDataAgreement: cvBoolean(personal, "shareDataAgreement", path, true)
  };
  const textFields: Array<[string, number]> = [["avatarUrl", 2048], ["birthPlace", 1000], ["nationality", 1000], ["idIssuePlace", 1000], ["englishAcademicTitle", 1000], ["contactAddress", 1000], ["bankAccount", 1000], ["bankName", 1000], ["bankBranch", 1000], ["smartCaSerial", 1000]];
  for (const [field, maxLength] of textFields) {
    const next = cvOptionalText(personal, field, path, maxLength);
    if (next !== undefined) result[field] = field === "avatarUrl" ? safeUrl(next, `${path}.${field}`) : next;
  }
  const birthDate = cvDate(personal, "birthDate", path);
  if (birthDate !== undefined) result.birthDate = birthDate;
  const idIssueDate = cvDate(personal, "idIssueDate", path);
  if (idIssueDate !== undefined) result.idIssueDate = idIssueDate;
  const languages = cvRows(personal, "languages", `${path}.languages`, cvLanguage);
  if (languages !== undefined) result.languages = languages;
  return result as ScientificCurriculumVitaePersonalInfo;
}

function cvEducation(value: unknown, path: string): ScientificCurriculumVitaeEducation {
  const input = cvRecord(value, path, ["degreeLevel", "major", "institution", "graduationYear", "trainingMode", "thesisTitle"]);
  const result: Record<string, unknown> = {
    degreeLevel: cvRequiredText(input, "degreeLevel", path),
    major: cvRequiredText(input, "major", path),
    institution: cvRequiredText(input, "institution", path)
  };
  const graduationYear = cvYear(input, "graduationYear", path, 1950);
  if (graduationYear !== undefined) result.graduationYear = graduationYear;
  // shortcut: the contract names degreeLevel/trainingMode as enums without listing members; enforce their bounded string shape until it does.
  const trainingMode = cvOptionalText(input, "trainingMode", path);
  if (trainingMode !== undefined) result.trainingMode = trainingMode;
  const thesisTitle = cvOptionalText(input, "thesisTitle", path);
  if (thesisTitle !== undefined) result.thesisTitle = thesisTitle;
  return result as ScientificCurriculumVitaeEducation;
}

function cvWorkItem(value: unknown, path: string): ScientificCurriculumVitaeWorkItem {
  const input = cvRecord(value, path, ["period", "organization", "position", "workField"]);
  const result: Record<string, unknown> = { period: cvRequiredText(input, "period", path), organization: cvRequiredText(input, "organization", path) };
  for (const field of ["position", "workField"] as const) {
    const next = cvOptionalText(input, field, path);
    if (next !== undefined) result[field] = next;
  }
  return result as ScientificCurriculumVitaeWorkItem;
}

function cvWorkHistory(input: Record<string, unknown>) {
  const path = "curriculumVitae.workHistory";
  const value = input.workHistory;
  const work = cvRecord(value, path, ["summary", "items"]);
  const result: Record<string, unknown> = {};
  const summary = cvOptionalText(work, "summary", path, 4000);
  if (summary !== undefined) result.summary = summary;
  const items = cvRows(work, "items", `${path}.items`, cvWorkItem);
  if (items !== undefined) result.items = items;
  return result as ScientificCurriculumVitaeWorkHistory;
}

function cvIntellectualProperty(value: unknown, path: string): ScientificCurriculumVitaeIntellectualProperty {
  const input = cvRecord(value, path, ["title", "authors", "issueYear", "patentNumber", "issueAgency", "proofUrl", "notes"]);
  const result: Record<string, unknown> = { title: cvRequiredText(input, "title", path) };
  for (const field of ["authors", "patentNumber", "issueAgency", "proofUrl"] as const) {
    const next = cvOptionalText(input, field, path);
    if (next !== undefined) result[field] = field === "proofUrl" ? safeUrl(next, `${path}.${field}`) : next;
  }
  const issueYear = cvYear(input, "issueYear", path);
  if (issueYear !== undefined) result.issueYear = issueYear;
  const notes = cvOptionalText(input, "notes", path, 4000);
  if (notes !== undefined) result.notes = notes;
  return result as ScientificCurriculumVitaeIntellectualProperty;
}

function cvAward(value: unknown, path: string): ScientificCurriculumVitaeAward {
  const input = cvRecord(value, path, ["name", "awardYear", "endYear", "grantingAgency", "proofUrl", "notes"]);
  const result: Record<string, unknown> = { name: cvRequiredText(input, "name", path) };
  for (const field of ["grantingAgency", "proofUrl"] as const) {
    const next = cvOptionalText(input, field, path);
    if (next !== undefined) result[field] = field === "proofUrl" ? safeUrl(next, `${path}.${field}`) : next;
  }
  for (const field of ["awardYear", "endYear"] as const) {
    const year = cvYear(input, field, path);
    if (year !== undefined) result[field] = year;
  }
  const notes = cvOptionalText(input, "notes", path, 4000);
  if (notes !== undefined) result.notes = notes;
  return result as ScientificCurriculumVitaeAward;
}

function cvProject(value: unknown, path: string): ScientificCurriculumVitaeProject {
  const input = cvRecord(value, path, ["projectTitle", "managementAgency", "code", "role", "period", "status", "notes"]);
  const result: Record<string, unknown> = { projectTitle: cvRequiredText(input, "projectTitle", path), role: cvRequiredText(input, "role", path) };
  for (const field of ["managementAgency", "code", "period", "status"] as const) {
    const next = cvOptionalText(input, field, path);
    if (next !== undefined) result[field] = next;
  }
  const notes = cvOptionalText(input, "notes", path, 4000);
  if (notes !== undefined) result.notes = notes;
  return result as ScientificCurriculumVitaeProject;
}

function cvResearchExperience(input: Record<string, unknown>) {
  const path = "curriculumVitae.researchExperience";
  const value = input.researchExperience;
  const research = cvRecord(value, path, ["intellectualProperty", "awards", "projects"]);
  const result: Record<string, unknown> = {};
  const intellectualProperty = cvRows(research, "intellectualProperty", `${path}.intellectualProperty`, cvIntellectualProperty);
  if (intellectualProperty !== undefined) result.intellectualProperty = intellectualProperty;
  const awards = cvRows(research, "awards", `${path}.awards`, cvAward);
  if (awards !== undefined) result.awards = awards;
  const projects = cvRows(research, "projects", `${path}.projects`, cvProject);
  if (projects !== undefined) result.projects = projects;
  return result as ScientificCurriculumVitaeResearchExperience;
}

function optionalCurriculumVitae(input: Record<string, unknown>) {
  if (!("curriculumVitae" in input)) return undefined;
  const value = input.curriculumVitae;
  const path = "curriculumVitae";
  const cv = cvRecord(value, path, ["cvSchemaVersion", "note", "personalInfo", "educationHistory", "workHistory", "researchExperience"]);
  if (cv.cvSchemaVersion !== 1) invalid([`${path}.cvSchemaVersion`]);
  const result: Record<string, unknown> = { cvSchemaVersion: 1 };
  const note = cvOptionalText(cv, "note", path, 4000);
  if (note !== undefined) result.note = note;
  for (const [field, parse] of [["personalInfo", cvPersonalInfo], ["workHistory", cvWorkHistory], ["researchExperience", cvResearchExperience]] as const) {
    if (field in cv) result[field] = parse(cv);
  }
  if ("educationHistory" in cv) {
    const rows = cvRows(cv, "educationHistory", `${path}.educationHistory`, cvEducation);
    result.educationHistory = rows;
  }
  if (Buffer.byteLength(JSON.stringify(result), "utf8") > 256 * 1024) invalid([path]);
  return result as ScientificCurriculumVitae;
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
      confirmDuplicate: confirmDuplicate(input),
      provisionAccount: provisionAccount(input)
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
    if (input.curriculumVitae !== undefined) result.curriculumVitae = optionalCurriculumVitae(input);
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
    const allowed = new Set(["contextVersion", "fullName", "externalAffiliation", "academicRankCatalogItemId", "academicDegreeCatalogItemId", "title", "position", "militaryRank", "contactEmail", "contactPhone", "contactNote", "researchFieldIds", "expertiseKeywords", "publications", "participations", "curriculumVitae", "username"]);
    if (Object.keys(input).some((key) => !allowed.has(key))) invalid(["administrativeFields"]);
    const profileKeys = Object.keys(input).filter((key) => key !== "contextVersion" && key !== "username");
    const base = profileKeys.length ? updateResearcherProfilePipe.transform(input, { type: "body" }) : researcherProfileMutationPipe.transform(input, { type: "body" });
    return { ...base, username: optionalUsername(input) };
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
