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

test("current assigned Staff decides adjustment, Head decides extension, Leadership decides neither", () => {
  const staff = projectViewerAuthorizationV1({ actor: actor("staff", "SCIENTIFIC_MANAGEMENT_STAFF"), project, projectOfficer: officer, request: { requestType: "adjustment", status: "under_staff_review", requesterId: "pi" } });
  assert(has(staff, "project.adjustment.approve"));
  assert(!has(staff, "project.extension.approve"));
  const head = projectViewerAuthorizationV1({ actor: actor("head", "SCIENTIFIC_MANAGEMENT_HEAD"), project, request: { requestType: "extension", status: "ready_for_head_decision", requesterId: "pi" } });
  assert(has(head, "project.extension.approve"));
  assert(!has(head, "project.adjustment.approve"));
  const leader = projectViewerAuthorizationV1({ actor: actor("leader", "LEADERSHIP_APPROVAL_AUTHORITY"), project });
  assert(has(leader, "project.monitor"));
  assert(!has(leader, "project.adjustment.approve"));
  assert(!has(leader, "project.extension.approve"));
});

test("unassigned, expired, out-of-scope and participant-management conflicts deny decisions", () => {
  const staff = actor("staff", "SCIENTIFIC_MANAGEMENT_STAFF");
  const withoutAssignment = projectViewerAuthorizationV1({ actor: staff, project });
  assert(!has(withoutAssignment, "project.read"));
  const expired = projectViewerAuthorizationV1({ actor: staff, project, projectOfficer: { ...officer, effectiveUntil: new Date(now.getTime() - 1) } });
  assert(!has(expired, "project.adjustment.approve"));
  const outOfScope = projectViewerAuthorizationV1({ actor: actor("staff", "SCIENTIFIC_MANAGEMENT_STAFF", false), project, projectOfficer: officer });
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
