import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { readCode, readDate, readOptionalDate, readOptionalText, readText } from "../proposals-shared/proposal-validation.js";

export class ProjectMutationDto { contextVersion?: unknown; }
export class CreateProjectDto extends ProjectMutationDto { proposalId!: string; }
export class AssignProjectOfficerDto extends ProjectMutationDto { officerUserId!: string; reason?: string; }
export class RevokeProjectOfficerDto extends ProjectMutationDto { reason!: string; }
export class ProjectReportDto extends ProjectMutationDto { reportId?: string; checkpointId?: string; reportingPeriodStart?: Date; reportingPeriodEnd?: Date; deadline?: Date; progressResults!: string; issuesRecommendations?: string; milestoneContext?: unknown; evidenceFileIds?: string[]; }
export class ProjectReportReviewDto extends ProjectMutationDto { reportId?: string; reason?: string; responseDeadline?: Date; }
export class ProjectReportSubmissionDto extends ProjectMutationDto { evidenceFileIds?: string[]; }
export class ProjectRequestDto extends ProjectMutationDto { requestId?: string; currentValues?: unknown; proposedValues!: unknown; reason!: string; evidenceFileIds?: string[]; }
export class ProjectDecisionDto extends ProjectMutationDto { reason?: string; note?: string; responseDeadline?: Date; }

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException({ message: "Dữ liệu đề tài không hợp lệ." });
  return value as Record<string, unknown>;
}

function context(input: Record<string, unknown>) {
  const value = input.contextVersion;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { throw new BadRequestException({ message: "Ngữ cảnh phân quyền không hợp lệ." }); }
}

function ids(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 100 || value.some((item) => typeof item !== "string" || !item.trim())) throw new BadRequestException({ message: `${field} không hợp lệ.` });
  return value.map((item) => String(item).trim());
}

export const createProjectPipe: PipeTransform<unknown, CreateProjectDto> = { transform(value) { const input = record(value); return { proposalId: readText(input.proposalId, "proposalId", 80), contextVersion: context(input) }; } };
export const projectMutationPipe: PipeTransform<unknown, ProjectMutationDto> = { transform(value) { const input = record(value ?? {}); return { contextVersion: context(input) }; } };
export const assignProjectOfficerPipe: PipeTransform<unknown, AssignProjectOfficerDto> = { transform(value) { const input = record(value); return { officerUserId: readText(input.officerUserId, "officerUserId", 80), reason: readOptionalText(input.reason, "reason", 1000), contextVersion: context(input) }; } };
export const revokeProjectOfficerPipe: PipeTransform<unknown, RevokeProjectOfficerDto> = { transform(value) { const input = record(value); return { reason: readText(input.reason, "reason", 1000), contextVersion: context(input) }; } };

export const projectReportPipe: PipeTransform<unknown, ProjectReportDto> = { transform(value) {
  const input = record(value);
  const result: ProjectReportDto = {
    reportId: input.reportId === undefined ? undefined : readText(input.reportId, "reportId", 80),
    checkpointId: input.checkpointId === undefined || input.checkpointId === "" ? undefined : readText(input.checkpointId, "checkpointId", 80),
    reportingPeriodStart: readOptionalDate(input.reportingPeriodStart, "reportingPeriodStart"),
    reportingPeriodEnd: readOptionalDate(input.reportingPeriodEnd, "reportingPeriodEnd"),
    deadline: readOptionalDate(input.deadline, "deadline"),
    progressResults: readText(input.progressResults, "progressResults", 10000),
    issuesRecommendations: readOptionalText(input.issuesRecommendations, "issuesRecommendations", 10000),
    milestoneContext: input.milestoneContext,
    evidenceFileIds: ids(input.evidenceFileIds, "evidenceFileIds"),
    contextVersion: context(input)
  };
  if (result.reportingPeriodStart && result.reportingPeriodEnd && result.reportingPeriodEnd <= result.reportingPeriodStart) throw new BadRequestException({ message: "Kỳ báo cáo không hợp lệ." });
  return result;
} };

export const projectReportReviewPipe: PipeTransform<unknown, ProjectReportReviewDto> = { transform(value) { const input = record(value); return { reason: readOptionalText(input.reason, "reason", 2000), responseDeadline: readOptionalDate(input.responseDeadline, "responseDeadline"), contextVersion: context(input) }; } };
export const projectReportSubmissionPipe: PipeTransform<unknown, ProjectReportSubmissionDto> = { transform(value) { const input = record(value); return { evidenceFileIds: ids(input.evidenceFileIds, "evidenceFileIds"), contextVersion: context(input) }; } };

function readJsonObject(value: unknown, field: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException({ message: `${field} không hợp lệ.` });
  return value;
}

export const projectRequestPipe: PipeTransform<unknown, ProjectRequestDto> = { transform(value) {
  const input = record(value);
  return {
    requestId: input.requestId === undefined ? undefined : readText(input.requestId, "requestId", 80),
    currentValues: input.currentValues === undefined ? undefined : readJsonObject(input.currentValues, "currentValues"),
    proposedValues: readJsonObject(input.proposedValues, "proposedValues"),
    reason: readText(input.reason, "reason", 5000),
    evidenceFileIds: ids(input.evidenceFileIds, "evidenceFileIds"),
    contextVersion: context(input)
  };
} };

export const projectDecisionPipe: PipeTransform<unknown, ProjectDecisionDto> = { transform(value) { const input = record(value ?? {}); return { reason: readOptionalText(input.reason, "reason", 2000), note: readOptionalText(input.note, "note", 2000), responseDeadline: readOptionalDate(input.responseDeadline, "responseDeadline"), contextVersion: context(input) }; } };

export function readRequestType(value: unknown) {
  const type = readCode(value, "requestType").toLowerCase();
  if (type !== "adjustment" && type !== "extension") throw new BadRequestException({ message: "requestType chỉ được là adjustment hoặc extension." });
  return type;
}

export function readProjectDate(value: unknown, field: string) { return readDate(value, field); }
