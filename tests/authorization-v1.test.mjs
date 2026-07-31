import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildAuthorizationContextV1,
  evaluateAuthorizationV1,
  readTransactionClockV1,
  runAuthorizedMutationV1
} from "../dist/apps/api/permissions/authorization-v1.service.js";
import { evaluateAuthorizationV1 as evaluateFromExistingPolicySeam } from "../dist/apps/api/permissions/permission-policy.js";
import { isPermissionActionV1 } from "../packages/permissions/src/index.js";

const base = {
  requestId: "request-1",
  correlationId: "correlation-1",
  actor: { userId: "user-1", systemRole: "RESEARCHER_INTERNAL_USER", organizationIds: ["org-1"], accountStatus: "ACTIVE" },
  target: { domain: "research-proposal", recordId: "proposal-1", organizationId: "org-1", aggregateVersion: 2 },
  action: "proposal.read"
};
const dimensions = ["systemRole", "organizationScope", "relationship", "assignment", "delegation", "workflowState", "conflict"];
const resolvers = (overrides = {}) => ({
  ...Object.fromEntries(dimensions.map((dimension) => [dimension, async () => ({ dimension, resolution: "RESOLVED_VALUE", allowed: true, reason: `${dimension} grants.` })])),
  ...overrides
});

describe("Story 1.7 authorization V1", () => {
  it("exposes V1 evaluation through the existing API policy boundary", () => {
    assert.equal(evaluateFromExistingPolicySeam, evaluateAuthorizationV1);
  });

  it("accepts only registered exact V1 action IDs", () => {
    assert.equal(isPermissionActionV1("proposal.read"), true);
    assert.equal(isPermissionActionV1("proposal.*"), false);
    assert.equal(isPermissionActionV1("proposal.read.extra"), false);
  });

  it("uses one transaction-clock asOf for context and every resolver", async () => {
    const asOf = new Date("2026-07-31T00:00:00.000Z");
    const context = buildAuthorizationContextV1(base, asOf);
    const observed = [];
    const decision = await evaluateAuthorizationV1(context, resolvers({
      systemRole: async (input) => {
        observed.push(input);
        return { dimension: "systemRole", resolution: "RESOLVED_VALUE", allowed: true, reason: "Role grants read." };
      },
      relationship: async (input) => {
        observed.push(input);
        return { dimension: "relationship", resolution: "RESOLVED_EMPTY", reason: "No relationship." };
      }
    }));

    assert.equal(decision.code, "ALLOWED");
    assert.equal(context.asOf, asOf.toISOString());
    assert.equal(observed.length, 2);
    assert.ok(observed.every((input) => input.asOf === context.asOf && input.actor === context.actor && input.target === context.target && input.action === context.action));
  });

  it("fails closed for an unregistered action without trusting resolver grants", async () => {
    const context = buildAuthorizationContextV1({ ...base, action: "proposal.unknown" }, new Date("2026-07-31T00:00:00.000Z"));
    const decision = await evaluateAuthorizationV1(context, resolvers());
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "CONTRACT_CODE_UNKNOWN");
  });

  it("does not turn resolved-empty or not-applicable dimensions into a grant", async () => {
    const context = buildAuthorizationContextV1(base, new Date("2026-07-31T00:00:00.000Z"));
    const decision = await evaluateAuthorizationV1(context, resolvers({
      relationship: async () => ({ dimension: "relationship", resolution: "RESOLVED_EMPTY", reason: "No relationship." }),
      delegation: async () => ({ dimension: "delegation", resolution: "NOT_APPLICABLE", reason: "No delegation is needed." }),
      systemRole: async () => ({ dimension: "systemRole", resolution: "RESOLVED_EMPTY", reason: "Role does not grant." }),
      organizationScope: async () => ({ dimension: "organizationScope", resolution: "RESOLVED_EMPTY", reason: "Scope does not grant." }),
      assignment: async () => ({ dimension: "assignment", resolution: "RESOLVED_EMPTY", reason: "Assignment does not grant." }),
      workflowState: async () => ({ dimension: "workflowState", resolution: "RESOLVED_EMPTY", reason: "State does not grant." }),
      conflict: async () => ({ dimension: "conflict", resolution: "RESOLVED_EMPTY", reason: "Conflict does not grant." })
    }));
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "ACTION_NOT_GRANTED");
  });

  it("fails closed for unsafe resolver states and selects the canonical primary denial", async () => {
    const context = buildAuthorizationContextV1(base, new Date("2026-07-31T00:00:00.000Z"));
    const decision = await evaluateAuthorizationV1(context, resolvers({
      organizationScope: async () => ({ dimension: "organizationScope", resolution: "AMBIGUOUS", reason: "Scope is ambiguous." }),
      workflowState: async () => ({ dimension: "workflowState", resolution: "STALE", reason: "State is stale." }),
      conflict: async () => ({ dimension: "conflict", resolution: "RESOLVED_VALUE", allowed: false, code: "CONFLICT_DENIED", reason: "Conflict." })
    }));
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, "CONTEXT_STALE");
    assert.deepEqual(decision.audit.outcomes.map((outcome) => outcome.dimension), dimensions);
    assert.equal(decision.reason, "Ngữ cảnh phân quyền đã cũ. Vui lòng tải lại trước khi thử lại.");
  });

  it("uses canonical precedence for invalid context values and captures a throwing resolver", async () => {
    const context = { ...buildAuthorizationContextV1(base, new Date("2026-07-31T00:00:00.000Z")), schemaVersion: "v2", actor: { ...base.actor, userId: "", accountStatus: "INACTIVE", systemRole: "legacy-role" } };
    const decision = await evaluateAuthorizationV1(context, resolvers({ assignment: async () => { throw new Error("lookup failed"); } }));
    assert.equal(decision.code, "CONTRACT_VERSION_UNSUPPORTED");
    assert.equal(decision.audit.outcomes.find((outcome) => outcome.dimension === "assignment").resolution, "UNRESOLVED");
  });

  it("denies missing actors, inactive accounts, and unknown system roles before resolver grants", async () => {
    const asOf = new Date("2026-07-31T00:00:00.000Z");
    const missingActor = await evaluateAuthorizationV1({ ...buildAuthorizationContextV1(base, asOf), actor: { ...base.actor, userId: "" } }, resolvers());
    const inactive = await evaluateAuthorizationV1({ ...buildAuthorizationContextV1(base, asOf), actor: { ...base.actor, accountStatus: "INACTIVE" } }, resolvers());
    const unknownRole = await evaluateAuthorizationV1({ ...buildAuthorizationContextV1(base, asOf), actor: { ...base.actor, systemRole: "legacy-role" } }, resolvers());
    assert.equal(missingActor.code, "UNAUTHENTICATED");
    assert.equal(inactive.code, "ACCOUNT_INACTIVE");
    assert.equal(unknownRole.code, "CONTRACT_CODE_UNKNOWN");
  });

  it("keeps audit outcomes redaction-safe and includes context versions", async () => {
    const context = buildAuthorizationContextV1(base, new Date("2026-07-31T00:00:00.000Z"));
    const token = { domain: "research-proposal", recordId: "proposal-1", aggregateVersion: 2, relationshipVersion: 1, conflictVersion: 1, delegationVersion: 0, policyVersion: "v1" };
    const decision = await evaluateAuthorizationV1(context, resolvers({
      conflict: async () => ({ dimension: "conflict", resolution: "RESOLVED_VALUE", allowed: false, code: "CONFLICT_DENIED", reason: "Actor is the hidden reviewer." })
    }), [token]);
    assert.deepEqual(decision.audit.contextVersions, [token]);
    assert.doesNotMatch(JSON.stringify(decision.audit), /hidden reviewer/);
  });

  it("never runs a mutation when its context-version token is stale and uses one transaction handle", async () => {
    let mutationCalls = 0;
    const transaction = { id: "tx-1" };
    const result = await runAuthorizedMutationV1({
      transaction,
      expected: [{ domain: "research-proposal", recordId: "proposal-1", aggregateVersion: 1, relationshipVersion: 0, conflictVersion: 0, delegationVersion: 0, policyVersion: "v1" }],
      current: async (tx) => {
        assert.equal(tx, transaction);
        return [{ domain: "research-proposal", recordId: "proposal-1", aggregateVersion: 2, relationshipVersion: 0, conflictVersion: 0, delegationVersion: 0, policyVersion: "v1" }];
      },
      mutate: async (tx) => {
        assert.equal(tx, transaction);
        mutationCalls += 1;
        return "changed";
      }
    });
    assert.equal(result.code, "CONTEXT_VERSION_MISMATCH");
    assert.equal(mutationCalls, 0);
  });

  it("rejects duplicate version-token keys", async () => {
    const token = { domain: "research-proposal", recordId: "proposal-1", aggregateVersion: 1, relationshipVersion: 0, conflictVersion: 0, delegationVersion: 0, policyVersion: "v1" };
    const result = await runAuthorizedMutationV1({ transaction: {}, expected: [token, token], current: async () => [token, token], mutate: async () => "changed" });
    assert.equal(result.code, "CONTEXT_VERSION_MISMATCH");
  });

  it("reads the authorization instant once from the transaction clock", async () => {
    let calls = 0;
    const asOf = await readTransactionClockV1({ async $queryRaw() { calls += 1; return [{ asOf: new Date("2026-07-31T00:00:00.000Z") }]; } });
    assert.equal(calls, 1);
    assert.equal(asOf.toISOString(), "2026-07-31T00:00:00.000Z");
  });
});
