import assert from "node:assert/strict";
import test from "node:test";
import { ApprovedProjectsService } from "../dist/apps/api/approved-projects/approved-projects.service.js";
import { projectContextVersion } from "../dist/apps/api/approved-projects/project-capability-v1.js";

const past = new Date(Date.now() - 86400000);
const unit = { id: "unit-1", code: "UNIT", name: "Unit", status: "active" };
const users = {
  pi: { id: "pi", username: "pi", displayName: "PI", systemRole: "RESEARCHER_INTERNAL_USER", status: "active", unit: "u", organizationScopes: [{ organizationUnit: unit }] },
  "other-pi": { id: "other-pi", username: "other-pi", displayName: "Other PI", systemRole: "RESEARCHER_INTERNAL_USER", status: "active", unit: "u", organizationScopes: [{ organizationUnit: unit }] }
};
const actor = (id) => ({ id, username: id, displayName: id, systemRole: "RESEARCHER_INTERNAL_USER", unit: "u", organizationScopes: [{ id: "unit-1", code: "UNIT", name: "Unit" }] });

// Minimal in-memory Prisma: only the tables ApprovedProjectsService touches for requests.
function fakePrisma(requests, piId = "pi") {
  const store = { requests, revisions: [], requestHistory: [], projectHistory: [], audit: [] };
  const project = { id: "p1", proposalId: "prop-1", hostOrganizationUnitId: "unit-1", status: "executing", updatedAt: past, aggregateVersion: 1, relationshipVersion: 1, conflictVersion: 0, delegationVersion: 0, endDate: new Date("2030-01-01T00:00:00Z"), scopeSnapshot: {}, planSnapshot: {}, milestones: [], checkpoints: [], reports: [], history: [],
    members: [{ id: "m-pi", userId: piId, participationRole: "TOPIC_PI", status: "ACTIVE", effectiveFrom: past, effectiveUntil: null }] };
  const withRelations = (request) => ({ ...request, revisions: store.revisions.filter((item) => item.requestId === request.id), evidence: [] });
  const db = {
    $queryRaw: async () => [{ asOf: new Date() }],
    $transaction: async (work) => work(db),
    user: { findUnique: async ({ where }) => users[where.id] ?? null },
    approvedProject: { findUnique: async () => ({ ...project, requests: store.requests.map(withRelations) }) },
    projectManagementOfficer: { findMany: async () => [] },
    projectRequest: {
      findUnique: async ({ where }) => { const found = store.requests.find((item) => item.id === where.id); return found ? withRelations(found) : null; },
      update: async ({ where, data }) => { const found = store.requests.find((item) => item.id === where.id); Object.assign(found, data); return { ...found }; },
      create: async ({ data }) => { const created = { id: `r-${store.requests.length + 1}`, ...data }; store.requests.push(created); return created; }
    },
    projectRequestRevision: { create: async ({ data }) => { store.revisions.push(data); return data; } },
    projectRequestHistory: { create: async ({ data }) => store.requestHistory.push(data) },
    projectHistory: { create: async ({ data }) => store.projectHistory.push(data) },
    auditLog: { create: async ({ data }) => { store.audit.push(data); return { id: "a", timestamp: new Date(), ...data }; } }
  };
  return { db, store, contextVersion: projectContextVersion(project) };
}

const open = (overrides = {}) => ({ id: "req-1", projectId: "p1", requestType: "extension", status: "supplement_requested", revision: 1, requesterId: "pi", ...overrides });
const service = (db) => new ApprovedProjectsService(db, { record: async () => undefined });
const code = (expected) => (error) => error?.response?.code === expected;

test("requester PI withdraws an open request with history and audit", async () => {
  const { db, store, contextVersion } = fakePrisma([open()]);
  const result = await service(db).withdrawRequest(actor("pi"), "p1", "extension", { requestId: "req-1", reason: "Không cần nữa", contextVersion });
  assert.equal(result.status, "withdrawn");
  for (const row of [store.requestHistory[0], store.projectHistory[0]]) {
    assert.equal(row.action, "project.extension.withdraw");
    assert.equal(row.fromStatus, "supplement_requested");
    assert.equal(row.toStatus, "withdrawn");
    assert.equal(row.reason, "Không cần nữa");
  }
  assert.equal(store.audit[0].action, "project.extension.withdraw");
  assert.equal(store.audit[0].reason, "Không cần nữa");
});

test("withdraw denies a non-requester, a terminal request and a wrong path type", async () => {
  const other = fakePrisma([open({ requesterId: "pi" })], "other-pi");
  await assert.rejects(service(other.db).withdrawRequest(actor("other-pi"), "p1", "extension", { requestId: "req-1", reason: "x", contextVersion: other.contextVersion }), code("ACTION_NOT_GRANTED"));
  for (const status of ["approved", "rejected", "withdrawn"]) {
    const terminal = fakePrisma([open({ status })]);
    await assert.rejects(service(terminal.db).withdrawRequest(actor("pi"), "p1", "extension", { requestId: "req-1", reason: "x", contextVersion: terminal.contextVersion }), code("WORKFLOW_STATE_DENIED"), status);
  }
  const wrongType = fakePrisma([open()]);
  await assert.rejects(service(wrongType.db).withdrawRequest(actor("pi"), "p1", "adjustment", { requestId: "req-1", reason: "x", contextVersion: wrongType.contextVersion }), code("WORKFLOW_STATE_DENIED"));
});

test("a withdrawn request no longer blocks a new one, and the PI payload carries requesterId", async () => {
  const { db, contextVersion } = fakePrisma([open({ status: "withdrawn" })]);
  const created = await service(db).createExtension(actor("pi"), "p1", { proposedValues: { requestedEndDate: "2030-06-01" }, reason: "Yêu cầu mới", contextVersion });
  assert.equal(created.status, "draft");
  const detail = await service(db).getProject(actor("pi"), "p1");
  assert.deepEqual(detail.requests.map((item) => item.requesterId), ["pi", "pi"]);
});
