import assert from "node:assert/strict";
import test from "node:test";
import { projectViewerAuthorizationV1 } from "../dist/apps/api/approved-projects/project-capability-v1.js";

const now = new Date();
const project = { id: "project-1", ownerId: "pi", hostOrganizationUnitId: "unit-1", status: "executing", updatedAt: now, aggregateVersion: 1, relationshipVersion: 1 };
const actor = (id, systemRole, scoped = true) => ({ id, username: id, displayName: id, systemRole, unit: "unit", organizationScopes: scoped ? [{ id: "unit-1", code: "UNIT", name: "Unit" }] : [] });
const officer = { officerUserId: "staff", status: "ACTIVE", effectiveFrom: new Date(now.getTime() - 1000), effectiveUntil: null };
const has = (view, action) => view.allowedActions.includes(action);

test("PI can report and request changes but cannot decide them", () => {
  const view = projectViewerAuthorizationV1({ actor: actor("pi", "RESEARCHER_INTERNAL_USER"), project });
  assert(has(view, "project.report.submit"));
  assert(has(view, "project.adjustment.submit"));
  assert(has(view, "project.extension.submit"));
  assert(!has(view, "project.adjustment.approve"));
  assert(!has(view, "project.extension.approve"));
});

test("only GĐ or PGĐ-KH sign a request submitted to routing; CV, TP, TB and PGĐ-TD never decide", () => {
  const request = (requestType, status = "ready_for_head_decision") => ({ requestType, status, requesterId: "pi" });
  for (const role of ["LEADERSHIP_APPROVAL_AUTHORITY", "SCIENCE_DEPUTY_DIRECTOR"]) {
    const view = projectViewerAuthorizationV1({ actor: actor("signer", role, false), project, request: request("adjustment") });
    assert(has(view, "project.adjustment.approve") && has(view, "project.adjustment.reject"), role);
    assert(!has(projectViewerAuthorizationV1({ actor: actor("signer", role), project, request: request("extension", "under_staff_validation") }), "project.extension.approve"), "not before the tờ trình exists");
  }
  const staff = projectViewerAuthorizationV1({ actor: actor("staff", "RESEARCH_MANAGEMENT_STAFF"), project, projectOfficer: officer, request: request("adjustment") });
  assert(!has(staff, "project.adjustment.approve") && !has(staff, "project.adjustment.reject"));
  for (const role of ["RESEARCH_MANAGEMENT_HEAD", "RESEARCH_BOARD_HEAD", "RESEARCH_MANAGEMENT_DEPUTY_HEAD", "RESEARCH_OVERSIGHT_AUTHORITY", "SYSTEM_ADMIN"]) {
    const view = projectViewerAuthorizationV1({ actor: actor("x", role), project, request: request("extension") });
    assert(!has(view, "project.extension.approve") && !has(view, "project.extension.reject"), role);
  }
  const head = projectViewerAuthorizationV1({ actor: actor("head", "RESEARCH_MANAGEMENT_HEAD"), project });
  assert(has(head, "project.read"));
  assert(has(projectViewerAuthorizationV1({ actor: actor("board", "RESEARCH_BOARD_HEAD", false), project }), "project.read"), "TB sees every project");
});

test("unassigned, expired, out-of-scope and participant-management conflicts deny decisions", () => {
  const staff = actor("staff", "RESEARCH_MANAGEMENT_STAFF");
  const withoutAssignment = projectViewerAuthorizationV1({ actor: staff, project });
  assert(!has(withoutAssignment, "project.read"));
  const expired = projectViewerAuthorizationV1({ actor: staff, project, projectOfficer: { ...officer, effectiveUntil: new Date(now.getTime() - 1) } });
  assert(!has(expired, "project.adjustment.approve"));
  const outOfScope = projectViewerAuthorizationV1({ actor: actor("staff", "RESEARCH_MANAGEMENT_STAFF", false), project, projectOfficer: officer });
  assert(!has(outOfScope, "project.adjustment.approve"));
  const conflicted = projectViewerAuthorizationV1({ actor: staff, project, projectOfficer: officer, participant: { isParticipant: true, role: "TOPIC_MEMBER" } });
  assert(!has(conflicted, "project.adjustment.approve"));
});

test("responsible member can contribute evidence but cannot submit or approve", () => {
  const member = projectViewerAuthorizationV1({ actor: actor("member", "RESEARCHER_INTERNAL_USER"), project, participant: { isParticipant: true, role: "TOPIC_MEMBER" }, responsibleMember: true });
  assert(has(member, "project.evidence.contribute"));
  assert(!has(member, "project.report.submit"));
  assert(!has(member, "project.adjustment.submit"));
  assert(!has(member, "project.extension.approve"));
  const unassigned = projectViewerAuthorizationV1({ actor: actor("member", "RESEARCHER_INTERNAL_USER"), project, participant: { isParticipant: true, role: "TOPIC_MEMBER" } });
  assert(!has(unassigned, "project.evidence.contribute"));
});

test("only the requesting PI withdraws an open request while executing or paused", () => {
  const pi = actor("pi", "RESEARCHER_INTERNAL_USER");
  const open = { requestType: "extension", status: "ready_for_head_decision", requesterId: "pi" };
  for (const status of ["executing", "paused"]) {
    const view = projectViewerAuthorizationV1({ actor: pi, project: { ...project, status }, request: open });
    assert(has(view, "project.extension.withdraw"), status);
    assert(!has(view, "project.adjustment.withdraw"), "wrong type");
  }
  assert(has(projectViewerAuthorizationV1({ actor: pi, project, request: { ...open, requestType: "adjustment", status: "under_staff_review" } }), "project.adjustment.withdraw"));
  assert(!has(projectViewerAuthorizationV1({ actor: pi, project: { ...project, status: "preparing" } }), "project.adjustment.withdraw"));
  for (const status of ["approved", "rejected", "withdrawn"]) assert(!has(projectViewerAuthorizationV1({ actor: pi, project, request: { ...open, status } }), "project.extension.withdraw"), status);
  assert(!has(projectViewerAuthorizationV1({ actor: pi, project, request: { ...open, requesterId: "other-pi" } }), "project.extension.withdraw"));
  for (const view of [
    projectViewerAuthorizationV1({ actor: actor("staff", "RESEARCH_MANAGEMENT_STAFF"), project, projectOfficer: officer, request: open }),
    projectViewerAuthorizationV1({ actor: actor("head", "RESEARCH_MANAGEMENT_HEAD"), project, request: open }),
    projectViewerAuthorizationV1({ actor: actor("leader", "LEADERSHIP_APPROVAL_AUTHORITY"), project, request: open }),
    projectViewerAuthorizationV1({ actor: actor("member", "RESEARCHER_INTERNAL_USER"), project, participant: { isParticipant: true, role: "TOPIC_MEMBER" }, request: open })
  ]) {
    assert(!has(view, "project.extension.withdraw"));
    assert(!has(view, "project.adjustment.withdraw"));
  }
});
