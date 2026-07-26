import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { REVIEW_RECOMMENDATIONS, type ReviewRecommendation } from "../proposals-shared/proposal-review-access.js";

const EVALUATION_VALIDATION_MESSAGE = "Dữ liệu đánh giá hồ sơ không hợp lệ.";

export class AssignProposalReviewerDto {
  [key: string]: unknown;

  reviewerUserId?: string;
  reviewerUsername?: string;
  assignmentRole?: string;
  dueDate?: string;
}

export class SaveProposalReviewDto {
  [key: string]: unknown;

  scoreData?: Record<string, number>;
  comment?: string;
  recommendation?: string;
}

export class SaveEvaluationSummaryDto {
  [key: string]: unknown;

  summary!: string;
  recommendation!: string;
  markReady?: boolean;
}

export class ProposalDecisionDto {
  [key: string]: unknown;

  note?: string;
}

/** Same shape as a decision note: an optional free-text reason, bounded at 2000 characters. */
export class RevokeReviewAssignmentDto {
  [key: string]: unknown;

  note?: string;
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

export const assignProposalReviewerPipe: PipeTransform<unknown, AssignProposalReviewerDto> = {
  transform(value: unknown) {
    const input = assertRecord(value);
    assertOptionalText(input.reviewerUserId, "reviewerUserId", 80);
    assertOptionalText(input.reviewerUsername, "reviewerUsername", 80);
    assertOptionalText(input.assignmentRole, "assignmentRole", 40);
    assertOptionalText(input.dueDate, "dueDate", 40);

    if (!input.reviewerUserId && !input.reviewerUsername) {
      throw new BadRequestException({ message: "Chọn người đánh giá bằng tài khoản hệ thống." });
    }

    return input as AssignProposalReviewerDto;
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

    return input as SaveProposalReviewDto;
  }
};

export const saveEvaluationSummaryPipe: PipeTransform<unknown, SaveEvaluationSummaryDto> = {
  transform(value: unknown) {
    const input = assertRecord(value);

    if (typeof input.summary !== "string" || !input.summary.trim()) {
      throw new BadRequestException({ message: "Nhập nội dung tổng hợp kết quả đánh giá." });
    }

    if (typeof input.recommendation !== "string" || !REVIEW_RECOMMENDATIONS.includes(input.recommendation as ReviewRecommendation)) {
      throw new BadRequestException({ message: "Chọn kết luận tổng hợp hợp lệ." });
    }

    return input as SaveEvaluationSummaryDto;
  }
};

export const proposalDecisionPipe: PipeTransform<unknown, ProposalDecisionDto> = {
  transform(value: unknown) {
    // Approve carries no required body, so an empty payload has to stay valid here and the
    // reject-needs-a-reason rule lives in the service where the decision type is known.
    const input = value === undefined || value === null || value === "" ? {} : assertRecord(value);
    assertOptionalText(input.note, "note", 2000);
    return input as ProposalDecisionDto;
  }
};

/** Named separately from the decision pipe so the revoke route does not read as a decision. */
export const revokeReviewAssignmentPipe: PipeTransform<unknown, RevokeReviewAssignmentDto> = {
  transform(value: unknown) {
    const input = value === undefined || value === null || value === "" ? {} : assertRecord(value);
    assertOptionalText(input.note, "note", 2000);
    return input as RevokeReviewAssignmentDto;
  }
};
