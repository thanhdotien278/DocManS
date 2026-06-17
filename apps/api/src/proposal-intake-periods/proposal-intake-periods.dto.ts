import { BadRequestException, type PipeTransform } from "@nestjs/common";
import {
  readCode,
  readDate,
  readOptionalText,
  readRequiredPackage,
  readText
} from "../proposals-shared/proposal-validation.js";

const INTAKE_PERIOD_VALIDATION_MESSAGE = "Dữ liệu đợt tiếp nhận không hợp lệ.";

export class ListProposalIntakePeriodsQueryDto {
  [key: string]: unknown;

  status?: string;
}

export class CreateProposalIntakePeriodDto {
  [key: string]: unknown;

  code!: string;
  title!: string;
  description?: string;
  startsAt!: string;
  endsAt!: string;
  applicableOrganizationUnitId?: string;
  requiredPackage!: unknown[];
}

export class UpdateProposalIntakePeriodDto {
  [key: string]: unknown;

  code?: string;
  title?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  applicableOrganizationUnitId?: string;
  requiredPackage?: unknown[];
}

function assertRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestException({ message: INTAKE_PERIOD_VALIDATION_MESSAGE });
  }

  return value as Record<string, unknown>;
}

export const listProposalIntakePeriodsQueryPipe: PipeTransform<unknown, ListProposalIntakePeriodsQueryDto> = {
  transform(value: unknown) {
    const input = assertRecord(value);
    if (input.status !== undefined) {
      readOptionalText(input.status, "status", 40);
    }

    return input as ListProposalIntakePeriodsQueryDto;
  }
};

export const createProposalIntakePeriodPipe: PipeTransform<unknown, CreateProposalIntakePeriodDto> = {
  transform(value: unknown) {
    const input = assertRecord(value);
    readCode(input.code, "code");
    readText(input.title, "title", 220);
    readOptionalText(input.description, "description", 1000);
    readDate(input.startsAt, "startsAt");
    readDate(input.endsAt, "endsAt");
    readOptionalText(input.applicableOrganizationUnitId, "applicableOrganizationUnitId", 80);
    readRequiredPackage(input.requiredPackage);

    return input as unknown as CreateProposalIntakePeriodDto;
  }
};

export const updateProposalIntakePeriodPipe: PipeTransform<unknown, UpdateProposalIntakePeriodDto> = {
  transform(value: unknown) {
    const input = assertRecord(value);
    if (input.code !== undefined) {
      readCode(input.code, "code");
    }
    if (input.title !== undefined) {
      readText(input.title, "title", 220);
    }
    if (input.description !== undefined) {
      readOptionalText(input.description, "description", 1000);
    }
    if (input.startsAt !== undefined) {
      readDate(input.startsAt, "startsAt");
    }
    if (input.endsAt !== undefined) {
      readDate(input.endsAt, "endsAt");
    }
    if (input.applicableOrganizationUnitId !== undefined) {
      readOptionalText(input.applicableOrganizationUnitId, "applicableOrganizationUnitId", 80);
    }
    if (input.requiredPackage !== undefined) {
      readRequiredPackage(input.requiredPackage);
    }

    return input as UpdateProposalIntakePeriodDto;
  }
};
