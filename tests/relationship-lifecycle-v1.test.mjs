import { describe, it } from "node:test";
import assert from "node:assert/strict";
import participation from "../dist/apps/api/proposals-shared/proposal-participation.js";
import capability from "../dist/apps/api/permissions/proposal-capability-v1.js";
import reviewAccess from "../dist/apps/api/proposals-shared/proposal-review-access.js";
import { isSourceRelationshipFactV1 } from "@rtms/permissions";

const { isRelationshipActiveAt, resolveProposalParticipation } = participation;
const { projectProposalViewerAuthorizationV1 } = capability;
const { resolveProposalReviewAccess } = reviewAccess;

describe("Story 1.9 proposal relationship lifecycle", () => {
  const asOf = new Date("2026-07-31T09:00:00.000Z");

  it("uses a UTC half-open interval and ACTIVE status", () => {
    const startsAt = new Date("2026-07-31T09:00:00.000Z");
    const endsAt = new Date("2026-07-31T10:00:00.000Z");

    assert.equal(isRelationshipActiveAt({ status: "ACTIVE", effectiveFrom: startsAt, effectiveUntil: endsAt }, asOf), true);
    assert.equal(isRelationshipActiveAt({ status: "ACTIVE", effectiveFrom: startsAt, effectiveUntil: endsAt }, endsAt), false);
    assert.equal(isRelationshipActiveAt({ status: "SUSPENDED", effectiveFrom: startsAt, effectiveUntil: null }, asOf), false);
  });

  it("does not let expired, suspended, or revoked secretary rows grant participation", () => {
    const participation = resolveProposalParticipation({
      userId: "secretary",
      asOf,
      proposal: { ownerId: "owner", createdAt: new Date("2026-07-01T00:00:00.000Z") },
      members: [
        { userId: "secretary", participationRole: "secretary", status: "ENDED", effectiveFrom: new Date("2026-07-01T00:00:00.000Z"), effectiveUntil: asOf },
        { userId: "secretary", participationRole: "secretary", status: "SUSPENDED", effectiveFrom: new Date("2026-07-01T00:00:00.000Z"), effectiveUntil: null }
      ]
    });

    assert.equal(participation.role, "none");
    assert.deepEqual(participation.roles, []);
  });

  it("validates source-owned facts and stops review access at the exact end instant", () => {
    const contextVersion = {
      domain: "proposal", recordId: "proposal-1", aggregateVersion: 1, relationshipVersion: 2,
      conflictVersion: 3, delegationVersion: 0, policyVersion: "v1"
    };
    const fact = {
      type: "PROPOSAL_SCIENTIFIC_SECRETARY", actorUserId: "secretary", domain: "proposal", recordId: "proposal-1",
      status: "ACTIVE", effectiveFrom: "2026-07-31T08:00:00.000Z", effectiveUntil: "2026-07-31T09:00:00.000Z", contextVersion
    };
    assert.equal(isSourceRelationshipFactV1(fact), true);
    assert.equal(isSourceRelationshipFactV1({ ...fact, effectiveUntil: fact.effectiveFrom }), false);

    const assignment = { id: "assignment-1", status: "assigned", assignedAt: asOf, effectiveFrom: new Date("2026-07-31T08:00:00.000Z"), effectiveUntil: asOf };
    assert.equal(resolveProposalReviewAccess([assignment], new Date("2026-07-31T08:59:59.999Z")).isAssignedReviewer, true);
    assert.equal(resolveProposalReviewAccess([assignment], asOf).isAssignedReviewer, false);
  });

  it("keeps a staff secretary blocked from reviewer assignment and all decision actions", () => {
    const decision = projectProposalViewerAuthorizationV1({
      actor: { id: "secretary", systemRole: "SCIENTIFIC_MANAGEMENT_STAFF" },
      proposal: {
        id: "proposal-1", hostOrganizationUnitId: "org-1", status: "submitted", updatedAt: asOf,
        authorizationContextUpdatedAt: asOf, authorizationRelationshipVersion: 1, authorizationConflictVersion: 1
      },
      participation: {
        role: "secretary", label: "Thư ký", roles: ["secretary"], labels: ["Thư ký"], isOwner: false,
        isParticipant: true, relationshipEffectiveFrom: { secretary: asOf.toISOString() }
      },
      canRead: true, canEdit: false, canManageFiles: true
    });

    assert.equal(decision.allowedActions.includes("file.upload"), true);
    assert.equal(decision.blockedActions.find((item) => item.action === "proposal.review.assign")?.code, "CONFLICT_DENIED");
    assert.equal(decision.blockedActions.find((item) => item.action === "proposal.decision.approve")?.code, "CONFLICT_DENIED");
    assert.equal(decision.blockedActions.find((item) => item.action === "proposal.decision.reject")?.code, "CONFLICT_DENIED");
  });
});
