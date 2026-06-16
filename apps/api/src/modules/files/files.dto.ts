import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { readCode, readText } from "../../proposals-shared/proposal-validation.js";

export const RESEARCH_PROPOSAL_ENTITY_TYPE = "research_proposal";

export class ListFilesDto {
  relatedEntityType!: string;
  relatedEntityId!: string;
}

export class UploadFileDto extends ListFilesDto {
  filePurpose!: string;
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

export const uploadFilePipe: PipeTransform<unknown, UploadFileDto> = {
  transform(value: unknown) {
    const input = assertRecord(value);
    validateRelatedEntity(input);
    readCode(input.filePurpose, "filePurpose");
    return input as unknown as UploadFileDto;
  }
};

export const listFilesPipe: PipeTransform<unknown, ListFilesDto> = {
  transform(value: unknown) {
    const input = assertRecord(value);
    validateRelatedEntity(input);
    return input as unknown as ListFilesDto;
  }
};
