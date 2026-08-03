import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DelegationsService } from "../dist/apps/api/delegations/delegations.service.js";

const proposal = {
  id: "proposal-1",
  ownerId: "grantor-1",
  hostOrganizationUnitId: "org-1",
  updatedAt: new Date("2026-08-03T00:00:00.000Z"),
  authorizationRelationshipVersion: 1,
  authorizationConflictVersion: 0,
  authorizationDelegationVersion: 0
};
const actor = (id, systemRole = "RESEARCHER_INTERNAL_USER") => ({ id, username: id, displayName: id, systemRole, unit: "org-1", organizationScopes: [{ id: "org-1", code: "ORG1", name: "Org 1" }] });
const contextVersion = { domain: "proposal", recordId: proposal.id, aggregateVersion: proposal.updatedAt.getTime(), relationshipVersion: 1, conflictVersion: 0, delegationVersion: 0, policyVersion: "v1" };

function harness(grant = null) {
  const updates = [];
  const tx = {
    $queryRaw: async () => [{ asOf: new Date("2026-08-03T00:00:00.000Z") }],
    researchProposal: {
      findUnique: async () => proposal,
      update: async ({ data }) => { updates.push(data); return proposal; }
    },
    user: { findUnique: async () => ({ id: "delegate-1", status: "active" }) },
    proposalDelegation: {
      create: async ({ data }) => ({ id: "grant-1", ...data, status: "PENDING_APPROVAL" }),
      findUnique: async () => grant,
      update: async ({ data }) => ({ ...grant, ...data })
    }
  };
  const prisma = { $transaction: async (work) => work(tx), researchProposal: tx.researchProposal, proposalDelegation: tx.proposalDelegation };
  const auditRecords = [];
  const audit = { record: async (input) => { auditRecords.push(input); } };
  return { service: new DelegationsService(prisma, audit), updates, auditRecords };
}

describe("Story 1.10 delegation service", () => {
  it("creates a pending proposal.submit grant and never activates it", async () => {
    const { service } = harness();
    const grant = await service.create(actor("grantor-1"), proposal.id, { delegateUserId: "delegate-1", actionIds: ["proposal.submit"], startsAt: "2026-08-03T00:00:00.000Z", endsAt: null, reason: "Submit while PI is away.", contextVersion });
    assert.equal(grant.status, "PENDING_APPROVAL");
  });

  it("denies self-approval before activating a pending grant", async () => {
    const grant = { id: "grant-1", proposalId: proposal.id, grantorUserId: "staff-1", delegateUserId: "delegate-1", status: "PENDING_APPROVAL", proposal, grantor: { status: "active" } };
    const { service, auditRecords } = harness(grant);
    await assert.rejects(() => service.approve(actor("staff-1", "SCIENTIFIC_MANAGEMENT_STAFF"), grant.id, contextVersion), /Không thể phê duyệt/);
    assert.equal(auditRecords[0].result, "failure");
  });

  it("revokes an active grant and increments the delegation context", async () => {
    const grant = { id: "grant-1", proposalId: proposal.id, grantorUserId: "grantor-1", delegateUserId: "delegate-1", status: "ACTIVE", proposal };
    const { service, updates } = harness(grant);
    const revoked = await service.revoke(actor("grantor-1"), grant.id, contextVersion);
    assert.equal(revoked.status, "REVOKED");
    assert.equal(updates.length, 1);
  });
});
