import { BadRequestException, type PipeTransform } from "@nestjs/common";
import {
  readBudgetMetadata,
  readMembers,
  readOptionalCode,
  readOptionalDate,
  readOptionalText,
  readText
} from "../proposals-shared/proposal-validation.js";

const PROPOSAL_VALIDATION_MESSAGE = "Dữ liệu hồ sơ đề xuất không hợp lệ.";

export class CreateResearchProposalDraftDto {
  [key: string]: unknown;

  intakePeriodId!: string;
  hostOrganizationUnitId!: string;
  title!: string;
  researchFieldCode?: string;
  proposalTypeCode?: string;
  objectives?: string;
  summary?: string;
  startDate?: string;
  endDate?: string;
  budgetMetadata?: unknown;
  members?: unknown[];
}

export class UpdateResearchProposalDraftDto {
  [key: string]: unknown;

  hostOrganizationUnitId?: string;
  title?: string;
  researchFieldCode?: string;
  proposalTypeCode?: string;
  objectives?: string;
  summary?: string;
  startDate?: string;
  endDate?: string;
  budgetMetadata?: unknown;
  members?: unknown[];
}

export class RequestProposalSupplementDto {
  [key: string]: unknown;

  reason!: string;
  dueDate!: string;
}

export class DelegatedMutationDto {
  [key: string]: unknown;
  delegationId?: string;
  contextVersion?: unknown;
}

function assertRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestException({ message: PROPOSAL_VALIDATION_MESSAGE });
  }

  return value as Record<string, unknown>;
}

export const createResearchProposalDraftPipe: PipeTransform<unknown, CreateResearchProposalDraftDto> = {
  transform(value: unknown) {
    const input = assertRecord(value);
    readText(input.intakePeriodId, "intakePeriodId", 80);
    readText(input.hostOrganizationUnitId, "hostOrganizationUnitId", 80);
    readText(input.title, "title", 260);
    readOptionalCode(input.researchFieldCode, "researchFieldCode");
    readOptionalCode(input.proposalTypeCode, "proposalTypeCode");
    readOptionalText(input.objectives, "objectives", 3000);
    readOptionalText(input.summary, "summary", 3000);
    readOptionalDate(input.startDate, "startDate");
    readOptionalDate(input.endDate, "endDate");
    readBudgetMetadata(input.budgetMetadata);
    readMembers(input.members);

    return input as unknown as CreateResearchProposalDraftDto;
  }
};

export const updateResearchProposalDraftPipe: PipeTransform<unknown, UpdateResearchProposalDraftDto> = {
  transform(value: unknown) {
    const input = assertRecord(value);
    if (input.hostOrganizationUnitId !== undefined) {
      readText(input.hostOrganizationUnitId, "hostOrganizationUnitId", 80);
    }
    if (input.title !== undefined) {
      readText(input.title, "title", 260);
    }
    if (input.researchFieldCode !== undefined) {
      readOptionalCode(input.researchFieldCode, "researchFieldCode");
    }
    if (input.proposalTypeCode !== undefined) {
      readOptionalCode(input.proposalTypeCode, "proposalTypeCode");
    }
    if (input.objectives !== undefined) {
      readOptionalText(input.objectives, "objectives", 3000);
    }
    if (input.summary !== undefined) {
      readOptionalText(input.summary, "summary", 3000);
    }
    if (input.startDate !== undefined) {
      readOptionalDate(input.startDate, "startDate");
    }
    if (input.endDate !== undefined) {
      readOptionalDate(input.endDate, "endDate");
    }
    if (input.budgetMetadata !== undefined) {
      readBudgetMetadata(input.budgetMetadata);
    }
    if (input.members !== undefined) {
      readMembers(input.members);
    }

    return input as UpdateResearchProposalDraftDto;
  }
};

export const requestProposalSupplementPipe: PipeTransform<unknown, RequestProposalSupplementDto> = {
  transform(value: unknown) {
    const input = assertRecord(value);
    readText(input.reason, "reason", 2000);
    readOptionalDate(input.dueDate, "dueDate");
    if (!input.dueDate) {
      throw new BadRequestException({ message: PROPOSAL_VALIDATION_MESSAGE });
    }

    return input as RequestProposalSupplementDto;
  }
};

export const delegatedMutationPipe: PipeTransform<unknown, DelegatedMutationDto> = {
  transform(value: unknown) {
    if (value === undefined || value === null) return {};
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException({ message: "Dữ liệu ủy quyền không hợp lệ." });
    const input = value as Record<string, unknown>;
    if (input.delegationId !== undefined && (typeof input.delegationId !== "string" || !input.delegationId)) throw new BadRequestException({ message: "delegationId không hợp lệ." });
    return input as DelegatedMutationDto;
  }
};
