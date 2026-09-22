import { BadRequestException, type PipeTransform } from "@nestjs/common";
// @ts-ignore: runtime package is JavaScript; repository consumers use its TypeScript source contract.
import { isContextVersionTokenV1, type ContextVersionTokenV1 } from "@rtms/permissions";
import { REVIEW_RECOMMENDATIONS, type ReviewRecommendation } from "../proposals-shared/proposal-review-access.js";
import { readOptionalDate } from "../proposals-shared/proposal-validation.js";

const EVALUATION_VALIDATION_MESSAGE = "Dữ liệu đánh giá hồ sơ không hợp lệ.";

export class AssignProposalReviewerDto {
  [key: string]: unknown;

  reviewerUserId!: string;
  assignmentRole?: string;
  dueDate?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  contextVersion!: ContextVersionTokenV1;
}

export class SaveProposalReviewDto {
  [key: string]: unknown;

  scoreData?: Record<string, number>;
  comment?: string;
  recommendation?: string;
  contextVersion!: ContextVersionTokenV1;
}

export class SaveEvaluationSummaryDto {
  [key: string]: unknown;

  summary?: string;
  recommendation?: string;
  contextVersion?: ContextVersionTokenV1;
}

export class FinalizeEvaluationSummaryDto {
  [key: string]: unknown;

  contextVersion!: ContextVersionTokenV1;
}

export class ProposalDecisionDto {
  [key: string]: unknown;

  note?: string;
  contextVersion!: ContextVersionTokenV1;
  packageRevision!: number;
  publicSummary?: string;
  requiredFollowUp?: string;
}

/** Revocation requires a nonblank reason, bounded at 2000 characters. */
export class RevokeReviewAssignmentDto {
  [key: string]: unknown;

  note!: string;
  contextVersion!: ContextVersionTokenV1;
}

function assertRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestException({ message: EVALUATION_VALIDATION_MESSAGE });
  }

  return value as Record<string, unknown>;
}

function assertOptionalText(value: unknown, field: string, maxLength: number) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw new BadRequestException({ message: `Trường ${field} không hợp lệ.` });
  }
}

function assertRequiredText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new BadRequestException({ message: `Trường ${field} không hợp lệ.` });
  }
}

function readContextVersion(input: Record<string, unknown>) {
  if (!isContextVersionTokenV1(input.contextVersion)) {
    throw new BadRequestException({ message: "Thiếu hoặc không hợp lệ contextVersion của hồ sơ." });
  }

  return input.contextVersion as ContextVersionTokenV1;
}

export const assignProposalReviewerPipe: PipeTransform<unknown, AssignProposalReviewerDto> = {
  transform(value: unknown) {
    const input = assertRecord(value);
    if (Object.prototype.hasOwnProperty.call(input, "researcherProfileId") || Object.prototype.hasOwnProperty.call(input, "reviewerUsername")) {
      throw new BadRequestException({ message: "Chọn người đánh giá bằng tài khoản." });
    }
    assertRequiredText(input.reviewerUserId, "reviewerUserId", 80);
    assertOptionalText(input.assignmentRole, "assignmentRole", 40);
    assertOptionalText(input.dueDate, "dueDate", 40);
    assertOptionalText(input.effectiveFrom, "effectiveFrom", 40);
    assertOptionalText(input.effectiveUntil, "effectiveUntil", 40);

    if (input.assignmentRole !== undefined && !["reviewer", "committee_member"].includes(String(input.assignmentRole))) {
      throw new BadRequestException({ message: "Vai trò phân công không hợp lệ." });
    }

    readOptionalDate(input.dueDate, "dueDate");
    readOptionalDate(input.effectiveFrom, "effectiveFrom");
    readOptionalDate(input.effectiveUntil, "effectiveUntil");

    return { ...input, contextVersion: readContextVersion(input) } as AssignProposalReviewerDto;
  }
};

export const saveProposalReviewPipe: PipeTransform<unknown, SaveProposalReviewDto> = {
  transform(value: unknown) {
    const input = assertRecord(value);
    assertOptionalText(input.comment, "comment", 5000);

    if (input.scoreData !== undefined && input.scoreData !== null) {
      assertRecord(input.scoreData);
    }

    if (input.recommendation !== undefined && input.recommendation !== null && input.recommendation !== "") {
      if (typeof input.recommendation !== "string" || !REVIEW_RECOMMENDATIONS.includes(input.recommendation as ReviewRecommendation)) {
        throw new BadRequestException({ message: "Kết luận đề nghị không hợp lệ." });
      }
    }

    return { ...input, contextVersion: readContextVersion(input) } as SaveProposalReviewDto;
  }
};

export const saveEvaluationSummaryPipe: PipeTransform<unknown, SaveEvaluationSummaryDto> = {
  transform(value: unknown) {
    const input = assertRecord(value);

    if (typeof input.markReady === "boolean" || typeof input.markReady === "string") {
      throw new BadRequestException({ message: "Lưu nháp, chốt và trình phê duyệt là các thao tác riêng biệt." });
    }
    if (typeof input.summary !== "string" || !input.summary.trim()) {
      throw new BadRequestException({ message: "Nhập nội dung tổng hợp kết quả đánh giá." });
    }
    if (typeof input.recommendation !== "string" || !REVIEW_RECOMMENDATIONS.includes(input.recommendation as ReviewRecommendation)) {
      throw new BadRequestException({ message: "Chọn kết luận tổng hợp hợp lệ." });
    }
    if (input.contextVersion !== undefined && !isContextVersionTokenV1(input.contextVersion)) {
      throw new BadRequestException({ message: "Context phiên bản hồ sơ không hợp lệ." });
    }

    return { ...input, contextVersion: readContextVersion(input) } as SaveEvaluationSummaryDto;
  }
};

export const proposalDecisionPipe: PipeTransform<unknown, ProposalDecisionDto> = {
  transform(value: unknown) {
    // The body may omit the optional note, but the current package revision and context token are
    // required for every approve/reject mutation; the reject-needs-a-reason rule stays in the service.
    const input = value === undefined || value === null || value === "" ? {} : assertRecord(value);
    assertOptionalText(input.note, "note", 2000);
    if (!Number.isInteger(input.packageRevision) || Number(input.packageRevision) < 0) {
      throw new BadRequestException({ message: "Thiếu hoặc không hợp lệ phiên bản gói đánh giá." });
    }
    assertOptionalText(input.publicSummary, "publicSummary", 5000);
    assertOptionalText(input.requiredFollowUp, "requiredFollowUp", 5000);
    return { ...input, contextVersion: readContextVersion(input), packageRevision: Number(input.packageRevision) } as ProposalDecisionDto;
  }
};

/** Named separately from the decision pipe so the revoke route does not read as a decision. */
export const revokeReviewAssignmentPipe: PipeTransform<unknown, RevokeReviewAssignmentDto> = {
  transform(value: unknown) {
    const input = value === undefined || value === null || value === "" ? {} : assertRecord(value);
    assertRequiredText(input.note, "note", 2000);
    return { ...input, contextVersion: readContextVersion(input) } as RevokeReviewAssignmentDto;
  }
};

export const submitCompletedPackagePipe: PipeTransform<unknown, { contextVersion: ContextVersionTokenV1 }> = {
  transform(value: unknown) {
    const input = assertRecord(value);
    return { contextVersion: readContextVersion(input) };
  }
};

export const finalizeEvaluationSummaryPipe: PipeTransform<unknown, FinalizeEvaluationSummaryDto> = {
  transform(value: unknown) {
    const input = assertRecord(value);
    return { contextVersion: readContextVersion(input) } as FinalizeEvaluationSummaryDto;
  }
};
