import { test } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import { proposalDecisionPipe } from "../dist/apps/api/proposal-evaluations/proposal-evaluations.dto.js";
import { ProposalDecisionsService, PROPOSAL_DECISIONS } from "../dist/apps/api/proposal-evaluations/proposal-decisions.service.js";
import { ProposalEvaluationSummaryService } from "../dist/apps/api/proposal-evaluations/proposal-evaluation-summary.service.js";
import { ProposalReviewsService } from "../dist/apps/api/proposal-evaluations/proposal-reviews.service.js";
import { findCurrentSubmissionEvidence } from "../dist/apps/api/proposal-evaluations/proposal-evaluation-support.js";
import { ResearchProposalsService } from "../dist/apps/api/research-proposals/research-proposals.service.js";

const proposal = {
  id: "proposal-1",
  submittedAt: new Date(1),
  updatedAt: new Date(2),
  authorizationRelationshipVersion: 3,
  authorizationConflictVersion: 4,
  authorizationDelegationVersion: 5
};

const contextVersion = {
  domain: "proposal",
  recordId: proposal.id,
  aggregateVersion: 2,
  relationshipVersion: 3,
  conflictVersion: 4,
  delegationVersion: 5,
  policyVersion: "v1"
};

test("golden-flow evidence binds evaluation to the latest current submission", async () => {
  let query;
  const snapshots = { members: [], attachments: [], requiredPackage: [] };
  const prisma = {
    proposalSubmissionEvent: {
      findMany: async (input) => {
        query = input;
        return [
          { id: "old", submittedAt: new Date(0), toStatus: "submitted", snapshot: { ...snapshots, title: "old" } },
          { id: "current", submittedAt: new Date(2), toStatus: "resubmitted", snapshot: { ...snapshots, title: "current" } }
        ]
          .filter((event) => event.submittedAt >= input.where.submittedAt.gte && input.where.toStatus.in.includes(event.toStatus))
          .sort((left, right) => right.submittedAt - left.submittedAt);
      }
    }
  };
  const evidence = await findCurrentSubmissionEvidence(prisma, proposal);
  assert.equal(evidence.eventId, "current");
  assert.deepEqual(evidence.snapshot, { ...snapshots, title: "current" });
  assert.deepEqual(query.where.toStatus.in, ["submitted", "resubmitted"]);
  assert.deepEqual(query.orderBy, { submittedAt: "desc" });
  await assert.rejects(
    () => findCurrentSubmissionEvidence({ proposalSubmissionEvent: { findMany: async () => [] } }, proposal),
    (error) => error.getResponse?.().code === "CONTEXT_UNRESOLVED"
  );
});

test("decision mutation requires a package revision and keeps terminal outcomes canonical", () => {
  assert.equal(PROPOSAL_DECISIONS.approved, "approved");
  assert.equal(PROPOSAL_DECISIONS.rejected, "rejected");
  assert.throws(() => proposalDecisionPipe.transform({ contextVersion }), BadRequestException);
  const input = proposalDecisionPipe.transform({ contextVersion, packageRevision: 2 });
  assert.equal(input.packageRevision, 2);
  assert.throws(() => ProposalDecisionsService.prototype.readNote.call({}, "", { required: true }), BadRequestException);
});

test("locked submitted reviews cannot be edited and readiness still requires the full roster", () => {
  assert.throws(() => ProposalReviewsService.prototype.assertReviewIsOpen.call({}, { status: "submitted" }), BadRequestException);
  const service = new ProposalEvaluationSummaryService();
  const assignments = [
    ...Array.from({ length: 2 }, (_, index) => ({ id: `r${index}`, reviewerUserId: `r${index}`, assignmentRole: "reviewer", status: "completed" })),
    ...Array.from({ length: 3 }, (_, index) => ({ id: `c${index}`, reviewerUserId: `c${index}`, assignmentRole: "committee_member", status: "completed" }))
  ];
  const reviews = assignments.map((assignment) => ({ assignmentId: assignment.id, status: "submitted", totalScore: 80 }));
  assert.equal(service.summarizeProgress(assignments, reviews).allReviewsSubmitted, true);
  assert.equal(service.summarizeProgress(assignments, reviews.slice(0, -1)).allReviewsSubmitted, false);
  assert.equal(service.summarizeProgress(assignments, [...reviews, { assignmentId: "revoked", status: "submitted", totalScore: 0 }]).averageTotalScore, 80);
});

test("leadership decision queue is server-filtered by authority scope and workflow", async () => {
  let where;
  const service = new ResearchProposalsService(
    { researchProposal: { findMany: async (input) => { where = input.where; return []; } } },
    {},
    { resolveForProposals: async () => new Map() },
    { resolveForProposals: async () => new Map() },
    {}
  );
  service.projectProposalList = async (_actor, records) => records;
  await assert.rejects(() => service.listDecisionQueue({ systemRole: "SCIENTIFIC_MANAGEMENT_STAFF", organizationScopes: [{ id: "unit-1" }] }), /lãnh đạo/i);
  await service.listDecisionQueue({ systemRole: "LEADERSHIP_APPROVAL_AUTHORITY", organizationScopes: [{ id: "unit-1" }] });
  assert.deepEqual(where.hostOrganizationUnitId, { in: ["unit-1"] });
  assert.deepEqual(where.status.in, ["ready_for_approval", "approved", "rejected"]);
});
