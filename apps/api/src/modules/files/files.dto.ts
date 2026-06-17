import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { readCode, readText } from "../../proposals-shared/proposal-validation.js";

export const RESEARCH_PROPOSAL_ENTITY_TYPE = "research_proposal";

export class ListFilesDto {
  relatedEntityType!: string;
  relatedEntityId!: string;
}

export class UploadFileDto extends ListFilesDto {
  filePurpose!: string;
  originalFileName?: string;
  description?: string | null;
}

export class UpdateFileDto {
  description!: string | null;
}

function assertRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestException({ message: "Dữ liệu tệp không hợp lệ." });
  }
  return value as Record<string, unknown>;
}

function validateRelatedEntity(input: Record<string, unknown>) {
  const relatedEntityType = readCode(input.relatedEntityType, "relatedEntityType");
  if (relatedEntityType !== RESEARCH_PROPOSAL_ENTITY_TYPE) {
    throw new BadRequestException({ message: "Loại thực thể liên kết chưa được hỗ trợ." });
  }
  readText(input.relatedEntityId, "relatedEntityId", 80);
}

function readOptionalDescription(value: unknown) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }
  return readText(value, "description", 500);
}

export const uploadFilePipe: PipeTransform<unknown, UploadFileDto> = {
  transform(value: unknown) {
    const input = assertRecord(value);
    validateRelatedEntity(input);
    readCode(input.filePurpose, "filePurpose");
    return {
      ...input,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      filePurpose: input.filePurpose,
      originalFileName: input.originalFileName === undefined ? undefined : readText(input.originalFileName, "originalFileName", 255),
      description: readOptionalDescription(input.description)
    } as UploadFileDto;
  }
};

export const listFilesPipe: PipeTransform<unknown, ListFilesDto> = {
  transform(value: unknown) {
    const input = assertRecord(value);
    validateRelatedEntity(input);
    return input as unknown as ListFilesDto;
  }
};

export const updateFilePipe: PipeTransform<unknown, UpdateFileDto> = {
  transform(value: unknown) {
    const input = assertRecord(value);
    if (!Object.hasOwn(input, "description")) {
      throw new BadRequestException({ message: "Chưa có metadata tệp cần cập nhật." });
    }
    return {
      description: readOptionalDescription(input.description) ?? null
    };
  }
};
