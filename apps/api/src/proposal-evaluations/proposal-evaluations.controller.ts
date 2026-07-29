import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import type { RequestWithCurrentUser } from "../proposals-shared/proposal-types.js";
import { PROPOSAL_DECISIONS, ProposalDecisionsService } from "./proposal-decisions.service.js";
import { ProposalEvaluationSummaryService } from "./proposal-evaluation-summary.service.js";
import {
  assignProposalReviewerPipe,
  proposalDecisionPipe,
  revokeReviewAssignmentPipe,
  saveEvaluationSummaryPipe,
  saveProposalReviewPipe,
  type AssignProposalReviewerDto,
  type ProposalDecisionDto,
  type RevokeReviewAssignmentDto,
  type SaveEvaluationSummaryDto,
  type SaveProposalReviewDto
} from "./proposal-evaluations.dto.js";
import { ProposalReviewAssignmentsService } from "./proposal-review-assignments.service.js";
import { ProposalReviewsService } from "./proposal-reviews.service.js";

/**
 * EP-03 evaluation routes. They share the `research-proposals` base path with
 * `ResearchProposalsController` because they act on the same aggregate; the literal segments below
 * never collide with that controller's `:id` routes.
 */
@Controller("api/v1/research-proposals")
@UseGuards(SessionAuthGuard)
export class ProposalEvaluationsController {
  constructor(
    private readonly assignments: ProposalReviewAssignmentsService,
    private readonly reviews: ProposalReviewsService,
    private readonly summaries: ProposalEvaluationSummaryService,
    private readonly decisions: ProposalDecisionsService
  ) {}

  // ST-3.2 ------------------------------------------------------------------------------------

  /** Two path segments, so it can never be captured by `@Get(":id")` on the proposals controller. */
  @Get("review-assignments/mine")
  async listMyAssignments(@Req() request: RequestWithCurrentUser) {
    return { assignments: await this.assignments.listMyAssignments(request.currentUser!) };
  }

  @Get(":id/review-assignments")
  async listAssignments(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return { assignments: await this.assignments.listAssignments(request.currentUser!, id) };
  }

  @Post(":id/review-assignments")
  async assignReviewer(
    @Req() request: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body(assignProposalReviewerPipe) body: AssignProposalReviewerDto
  ) {
    return { assignment: await this.assignments.assignReviewer(request.currentUser!, id, body) };
  }

  @Post(":id/review-assignments/:assignmentId/revoke")
  async revokeAssignment(
    @Req() request: RequestWithCurrentUser,
    @Param("id") id: string,
    @Param("assignmentId") assignmentId: string,
    @Body(revokeReviewAssignmentPipe) body: RevokeReviewAssignmentDto
  ) {
    return { assignment: await this.assignments.revokeAssignment(request.currentUser!, id, assignmentId, { reason: body.note }) };
  }

  @Get(":id/review-package")
  async getReviewPackage(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return { reviewPackage: await this.assignments.getReviewPackage(request.currentUser!, id) };
  }

  // ST-3.3 ------------------------------------------------------------------------------------

  @Get(":id/my-review")
  async getMyReview(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return { review: await this.reviews.getMyReview(request.currentUser!, id) };
  }

  @Put(":id/my-review")
  async saveMyReview(
    @Req() request: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body(saveProposalReviewPipe) body: SaveProposalReviewDto
  ) {
    return { review: await this.reviews.saveMyReview(request.currentUser!, id, body) };
  }

  @Post(":id/my-review/submit")
  async submitMyReview(
    @Req() request: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body(saveProposalReviewPipe) body: SaveProposalReviewDto
  ) {
    return { review: await this.reviews.submitMyReview(request.currentUser!, id, body) };
  }

  // ST-3.4 ------------------------------------------------------------------------------------

  @Get(":id/review-progress")
  async getReviewProgress(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return { progress: await this.summaries.getReviewProgress(request.currentUser!, id) };
  }

  @Put(":id/evaluation-summary")
  async saveEvaluationSummary(
    @Req() request: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body(saveEvaluationSummaryPipe) body: SaveEvaluationSummaryDto
  ) {
    return this.summaries.saveEvaluationSummary(request.currentUser!, id, body);
  }

  // ST-3.5 ------------------------------------------------------------------------------------

  @Get(":id/decision-package")
  async getDecisionPackage(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return { decisionPackage: await this.decisions.getDecisionPackage(request.currentUser!, id) };
  }

  @Post(":id/approve")
  async approveProposal(
    @Req() request: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body(proposalDecisionPipe) body: ProposalDecisionDto
  ) {
    return this.decisions.decide(request.currentUser!, id, PROPOSAL_DECISIONS.approved, body);
  }

  @Post(":id/reject")
  async rejectProposal(
    @Req() request: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body(proposalDecisionPipe) body: ProposalDecisionDto
  ) {
    return this.decisions.decide(request.currentUser!, id, PROPOSAL_DECISIONS.rejected, body);
  }
}
