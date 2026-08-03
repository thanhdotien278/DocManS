import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DELEGATION_GRANT_STATUSES_V1,
  isDelegationGrantV1,
  isDelegablePermissionActionV1
} from "../packages/permissions/src/index.js";
import { resolveProposalDelegationV1 } from "../dist/apps/api/permissions/proposal-delegation-v1.js";

const grant = {
  schemaVersion: "v1",
  grantId: "grant-1",
  grantorUserId: "grantor-1",
  delegateUserId: "delegate-1",
  approverUserId: null,
  targetDomain: "research-proposal",
  targetRecordId: "proposal-1",
  targetOrganizationId: "org-1",
  actionIds: ["proposal.submit"],
  sourceAuthorityVersion: { domain: "research-proposal", recordId: "proposal-1", aggregateVersion: 1, relationshipVersion: 1, conflictVersion: 0, delegationVersion: 0, policyVersion: "v1" },
  startsAt: "2026-08-03T00:00:00.000Z",
  endsAt: null,
  status: "PENDING_APPROVAL",
  approvedAt: null,
  revokedAt: null,
  reason: "Principal investigator is unavailable."
};

describe("delegation V1 contract", () => {
  it("accepts one exact delegable action and rejects non-delegable, unknown, wildcard, and invalid intervals", () => {
    assert.deepEqual(DELEGATION_GRANT_STATUSES_V1, ["PENDING_APPROVAL", "ACTIVE", "REVOKED", "EXPIRED", "REJECTED"]);
    assert.equal(isDelegablePermissionActionV1("proposal.submit"), true);
    assert.equal(isDelegablePermissionActionV1("proposal.review.assign"), false);
    assert.equal(isDelegablePermissionActionV1("proposal.*"), false);
    assert.equal(isDelegationGrantV1(grant), true);
    assert.equal(isDelegationGrantV1({ ...grant, actionIds: ["proposal.review.submit"] }), false);
    assert.equal(isDelegationGrantV1({ ...grant, actionIds: ["proposal.*"] }), false);
    assert.equal(isDelegationGrantV1({ ...grant, startsAt: "2026-08-03T01:00:00.000Z", endsAt: "2026-08-03T01:00:00.000Z" }), false);
  });

  it("only resolves an approved, exact, unrevoked grant whose source authority survives", () => {
    const active = { ...grant, status: "ACTIVE", approverUserId: "staff-1", approvedAt: "2026-08-03T00:00:00.000Z" };
    assert.deepEqual(resolveProposalDelegationV1({ grant: active, delegateUserId: "delegate-1", proposalId: "proposal-1", action: "proposal.submit", asOf: "2026-08-03T00:00:00.000Z", sourceAuthorityActive: true }), { allowed: true });
    assert.equal(resolveProposalDelegationV1({ grant: active, delegateUserId: "delegate-1", proposalId: "other", action: "proposal.submit", asOf: "2026-08-03T00:00:00.000Z", sourceAuthorityActive: true }).code, "DELEGATION_INVALID");
    assert.equal(resolveProposalDelegationV1({ grant: active, delegateUserId: "delegate-1", proposalId: "proposal-1", action: "proposal.submit", asOf: "2026-08-03T00:00:00.000Z", sourceAuthorityActive: false }).code, "DELEGATION_INVALID");
    assert.equal(resolveProposalDelegationV1({ grant: { ...active, endsAt: "2026-08-03T01:00:00.000Z" }, delegateUserId: "delegate-1", proposalId: "proposal-1", action: "proposal.submit", asOf: "2026-08-03T01:00:00.000Z", sourceAuthorityActive: true }).code, "DELEGATION_INVALID");
  });
});
