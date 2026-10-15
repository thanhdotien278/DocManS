import assert from "node:assert/strict";
import test from "node:test";
import { ApprovedProjectsService } from "../dist/apps/api/approved-projects/approved-projects.service.js";
import { projectWithdrawPipe } from "../dist/apps/api/approved-projects/approved-projects.dto.js";
import { projectContextVersion } from "../dist/apps/api/approved-projects/project-capability-v1.js";

const DAY = 86400000;
const past = new Date(Date.now() - 30 * DAY);
const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
const unit = { id: "unit-1", code: "UNIT", name: "Unit", status: "active" };
const scope = { organizationUnitId: unit.id, organizationUnit: unit };
const person = (id, systemRole) => ({ id, username: id, displayName: id, systemRole, status: "active", unit: "u", organizationScopes: [scope] });
const USERS = [person("pi", "RESEARCHER_INTERNAL_USER"), person("member", "RESEARCHER_INTERNAL_USER"), person("staff", "SCIENTIFIC_MANAGEMENT_STAFF"), person("staff2", "SCIENTIFIC_MANAGEMENT_STAFF"), person("head", "SCIENTIFIC_MANAGEMENT_HEAD")];
const actor = (id) => { const user = USERS.find((item) => item.id === id); return { ...user, organizationScopes: [{ id: unit.id, code: unit.code, name: unit.name }] }; };
const code = (expected) => (error) => (error?.response?.code ?? error?.code) === expected;

// Generic in-memory table: equality / {in} / {not} filters, {increment} updates, single-key orderBy.
function table(name, rows = []) {
  const match = (row, where = {}) => Object.entries(where).every(([key, value]) => {
    if (key === "requestId_revision") return row.requestId === value.requestId && row.revision === value.revision;
    if (value && typeof value === "object" && !(value instanceof Date)) return "in" in value ? value.in.includes(row[key]) : "not" in value ? row[key] !== value.not : true;
    return row[key] === value;
  });
  const sort = (list, orderBy) => {
    const [key, dir] = Object.entries((Array.isArray(orderBy) ? orderBy[0] : orderBy) ?? {})[0] ?? [];
    return key ? [...list].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * (dir === "desc" ? -1 : 1)) : list;
  };
  const self = {
    rows,
    findMany: async ({ where, orderBy } = {}) => sort(rows.filter((row) => match(row, where)), orderBy).map((row) => ({ ...row })),
    findFirst: async (args = {}) => (await self.findMany(args))[0] ?? null,
    findUnique: async ({ where }) => { const row = rows.find((item) => match(item, where)); return row ? { ...row } : null; },
    create: async ({ data }) => { const row = { id: `${name}-${rows.length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data }; rows.push(row); return { ...row }; },
    createMany: async ({ data }) => { for (const item of data) await self.create({ data: item }); return { count: data.length }; },
    update: async ({ where, data }) => {
      const row = rows.find((item) => match(item, where));
      if (!row) throw new Error(`${name} not found`);
      for (const [key, value] of Object.entries(data)) row[key] = value && typeof value === "object" && "increment" in value ? (row[key] ?? 0) + value.increment : value;
      return { ...row };
    },
    count: async ({ where }) => rows.filter((row) => match(row, where)).length
  };
  return self;
}

function world({ status = "executing", milestones, checkpoints } = {}) {
  const db = {};
  for (const name of ["approvedProjectMember", "projectManagementOfficer", "projectMilestone", "projectCheckpoint", "projectReportRevision", "projectReportEvidence", "projectRequest", "projectRequestRevision", "projectRequestEvidence", "projectRequestHistory", "projectHistory", "fileRecord", "proposalReviewAssignment", "proposalReview"]) db[name] = table(name);
  db.user = table("user", USERS.map((user) => ({ ...user })));
  db.auditLog = table("auditLog");
  const auditCreate = db.auditLog.create;
  db.auditLog.create = async (args) => ({ ...(await auditCreate(args)), timestamp: new Date() });
  const projects = table("approvedProject", [{ id: "p1", proposalId: "prop-1", hostOrganizationUnitId: unit.id, title: "T", status, updatedAt: past, aggregateVersion: 1, relationshipVersion: 1, conflictVersion: 0, delegationVersion: 0,
    startDate: new Date("2026-01-01T00:00:00Z"), endDate: new Date("2030-01-01T00:00:00Z"), scopeSnapshot: { title: "T", summary: "S" }, planSnapshot: { startDate: "2026-01-01T00:00:00.000Z", endDate: "2030-01-01T00:00:00.000Z" } }]);
  db.approvedProjectMember.rows.push(
    { id: "m-pi", projectId: "p1", userId: "pi", name: "PI", participationRole: "TOPIC_PI", status: "ACTIVE", effectiveFrom: past, effectiveUntil: null, createdAt: past },
    { id: "m-1", projectId: "p1", userId: "member", name: "Member", participationRole: "TOPIC_MEMBER", status: "ACTIVE", effectiveFrom: past, effectiveUntil: null, createdAt: past });
  db.projectManagementOfficer.rows.push({ id: "o-1", projectId: "p1", officerUserId: "staff", status: "ACTIVE", effectiveFrom: past, effectiveUntil: null, reason: "Phân công ban đầu", createdAt: past });
  db.projectMilestone.rows.push(...(milestones ?? [
    { id: "ms-1", projectId: "p1", title: "Mốc 1", description: null, dueDate: new Date("2029-01-01T00:00:00Z"), isImportant: true, position: 0, responsibleMemberId: "m-1", status: "open" },
    { id: "ms-2", projectId: "p1", title: "Mốc 2", description: null, dueDate: new Date("2029-06-01T00:00:00Z"), isImportant: true, position: 1, responsibleMemberId: null, status: "open" }]));
  db.projectCheckpoint.rows.push(...(checkpoints ?? [
    { id: "cp-1", projectId: "p1", milestoneId: "ms-1", title: "Kỳ 1", dueDate: new Date("2028-01-01T00:00:00Z"), status: "open" },
    { id: "cp-2", projectId: "p1", milestoneId: "ms-2", title: "Kỳ 2", dueDate: new Date("2029-06-01T00:00:00Z"), status: "open" }]));
  const of = (tableName, key, id) => db[tableName].rows.filter((row) => row[key] === id).map((row) => ({ ...row }));
  const report = (row) => ({ ...row, evidence: of("projectReportEvidence", "reportRevisionId", row.id), checkpoint: db.projectCheckpoint.rows.find((item) => item.id === row.checkpointId) ?? null });
  const request = (row) => ({ ...row, revisions: of("projectRequestRevision", "requestId", row.id).sort((a, b) => b.revision - a.revision), evidence: of("projectRequestEvidence", "requestId", row.id) });
  db.approvedProject = { ...projects, findUnique: async ({ where }) => {
    const row = projects.rows.find((item) => item.id === where.id);
    if (!row) return null;
    return { ...row, members: of("approvedProjectMember", "projectId", row.id), managementOfficers: of("projectManagementOfficer", "projectId", row.id), milestones: of("projectMilestone", "projectId", row.id), checkpoints: of("projectCheckpoint", "projectId", row.id),
      reports: db.projectReportRevision.rows.filter((item) => item.projectId === row.id).map(report).sort((a, b) => b.revision - a.revision), requests: db.projectRequest.rows.filter((item) => item.projectId === row.id).map(request), history: of("projectHistory", "projectId", row.id) };
  } };
  const findReport = db.projectReportRevision.findUnique;
  db.projectReportRevision.findUnique = async (args) => { const row = await findReport(args); return row ? report(row) : null; };
  const findRequest = db.projectRequest.findUnique;
  db.projectRequest.findUnique = async (args) => { const row = await findRequest(args); return row ? request(row) : null; };
  db.$queryRaw = async () => [{ asOf: new Date() }];
  db.$transaction = async (work) => work(db);
  const service = new ApprovedProjectsService(db, { record: async () => undefined });
  const ctx = async () => projectContextVersion(await db.approvedProject.findUnique({ where: { id: "p1" } }));
  const project = () => projects.rows[0];
  return { db, service, ctx, project };
}

async function extensionReady(w, requestedEndDate = "2030-06-01") {
  const draft = await w.service.createExtension(actor("pi"), "p1", { proposedValues: { requestedEndDate }, reason: "Cần thêm thời gian", contextVersion: await w.ctx() });
  await w.service.submitRequest(actor("pi"), "p1", "extension", { requestId: draft.id, contextVersion: await w.ctx() });
  await w.service.validateExtension(actor("staff"), "p1", { requestId: draft.id, contextVersion: await w.ctx() });
  await w.service.prepareExtension(actor("staff"), "p1", { requestId: draft.id, note: "Đủ hồ sơ", contextVersion: await w.ctx() });
  return draft.id;
}

async function adjustmentReady(w, proposedValues) {
  const draft = await w.service.createAdjustment(actor("pi"), "p1", { proposedValues, reason: "Điều chỉnh", contextVersion: await w.ctx() });
  await w.service.submitRequest(actor("pi"), "p1", "adjustment", { requestId: draft.id, contextVersion: await w.ctx() });
  await w.service.reviewAdjustment(actor("staff"), "p1", { requestId: draft.id, contextVersion: await w.ctx() });
  return draft.id;
}

async function reportDraft(w, checkpointId = "cp-1", progressResults = "Hoàn thành nội dung kỳ 1") {
  return w.service.createReportDraft(actor("pi"), "p1", { checkpointId, reportingPeriodStart: new Date("2027-01-01T00:00:00Z"), reportingPeriodEnd: new Date("2027-06-30T00:00:00Z"), progressResults, contextVersion: await w.ctx() });
}

async function reportUnderReview(w, checkpointId = "cp-1") {
  const draft = await reportDraft(w, checkpointId);
  await w.service.submitReport(actor("pi"), "p1", { reportId: draft.id, contextVersion: await w.ctx() });
  await w.service.reviewReport(actor("staff"), "p1", { reportId: draft.id, contextVersion: await w.ctx() });
  return draft.id;
}

test("Head approves an extension: end date and plan snapshot move together; reject leaves them", async () => {
  const w = world();
  const id = await extensionReady(w);
  const decided = await w.service.decideRequest(actor("head"), "p1", "extension", "approve", { requestId: id, contextVersion: await w.ctx() });
  assert.equal(decided.status, "approved");
  assert.equal(w.project().endDate.toISOString(), "2030-06-01T00:00:00.000Z");
  assert.equal(w.project().planSnapshot.endDate, "2030-06-01T00:00:00.000Z");
  assert.equal(w.project().aggregateVersion, 2);

  const r = world();
  const rejected = await extensionReady(r);
  await assert.rejects(r.service.decideRequest(actor("head"), "p1", "extension", "reject", { requestId: rejected, contextVersion: await r.ctx() }));
  await r.service.decideRequest(actor("head"), "p1", "extension", "reject", { requestId: rejected, reason: "Chưa đủ căn cứ", contextVersion: await r.ctx() });
  assert.equal(r.project().endDate.toISOString(), "2030-01-01T00:00:00.000Z");
  assert.equal(r.project().planSnapshot.endDate, "2030-01-01T00:00:00.000Z");
});

test("Staff approves an adjustment that reassigns a milestone and ends its old member; reject changes nothing", async () => {
  const w = world();
  const id = await adjustmentReady(w, { scope: { title: "Tên mới" }, milestoneChanges: [{ id: "ms-1", responsibleMemberId: "m-pi" }], membershipChanges: [{ action: "end", memberId: "m-1" }] });
  await w.service.decideRequest(actor("staff"), "p1", "adjustment", "approve", { requestId: id, contextVersion: await w.ctx() });
  assert.equal(w.project().title, "Tên mới");
  assert.equal(w.project().scopeSnapshot.title, "Tên mới");
  assert.equal(w.db.projectMilestone.rows.find((row) => row.id === "ms-1").responsibleMemberId, "m-pi");
  assert.equal(w.db.approvedProjectMember.rows.find((row) => row.id === "m-1").status, "ENDED");
  assert.equal(w.project().relationshipVersion, 2);

  const r = world();
  const rejected = await adjustmentReady(r, { scope: { title: "Tên mới" } });
  await r.service.decideRequest(actor("staff"), "p1", "adjustment", "reject", { requestId: rejected, reason: "Không phù hợp", contextVersion: await r.ctx() });
  assert.equal(r.project().title, "T");
  assert.deepEqual(r.project().scopeSnapshot, { title: "T", summary: "S" });
});

test("a deciding officer who is a project member is denied; a Head member is not granted", async () => {
  const w = world();
  const id = await adjustmentReady(w, { scope: { summary: "Mới" } });
  w.db.approvedProjectMember.rows.push({ id: "m-staff", projectId: "p1", userId: "staff", name: "Staff", participationRole: "TOPIC_MEMBER", status: "ACTIVE", effectiveFrom: past, effectiveUntil: null });
  await assert.rejects(w.service.decideRequest(actor("staff"), "p1", "adjustment", "approve", { requestId: id, contextVersion: await w.ctx() }), code("CONFLICT_DENIED"));

  const h = world();
  const ext = await extensionReady(h);
  h.db.approvedProjectMember.rows.push({ id: "m-head", projectId: "p1", userId: "head", name: "Head", participationRole: "TOPIC_MEMBER", status: "ACTIVE", effectiveFrom: past, effectiveUntil: null });
  await assert.rejects(h.service.decideRequest(actor("head"), "p1", "extension", "approve", { requestId: ext, contextVersion: await h.ctx() }), code("ACTION_NOT_GRANTED"));
});

test("report submit and accept completes the checkpoint and its milestone; an empty report cannot be submitted", async () => {
  const w = world();
  const id = await reportUnderReview(w);
  await w.service.acceptReport(actor("staff"), "p1", { reportId: id, contextVersion: await w.ctx() });
  assert.equal(w.db.projectReportRevision.rows.find((row) => row.id === id).status, "accepted");
  assert.equal(w.db.projectCheckpoint.rows.find((row) => row.id === "cp-1").status, "completed");
  assert.equal(w.db.projectMilestone.rows.find((row) => row.id === "ms-1").status, "completed");

  const e = world();
  const empty = await reportDraft(e, "cp-1", "   ");
  await assert.rejects(e.service.submitReport(actor("pi"), "p1", { reportId: empty.id, contextVersion: await e.ctx() }), /Cần nhập kết quả/);
});

test("D1: unrelated changes do not stale a request; a change to its baseline does", async () => {
  const w = world();
  const ext = await extensionReady(w);
  const report = await reportUnderReview(w, "cp-2");
  await w.service.acceptReport(actor("staff"), "p1", { reportId: report, contextVersion: await w.ctx() });
  assert.equal((await w.service.decideRequest(actor("head"), "p1", "extension", "approve", { requestId: ext, contextVersion: await w.ctx() })).status, "approved");

  const a = world();
  const adj = await adjustmentReady(a, { milestoneChanges: [{ id: "ms-1", title: "Mốc 1 mới" }] });
  await a.service.assignOfficer(actor("head"), "p1", { officerUserId: "staff2", reason: "Thay chuyên viên", contextVersion: await a.ctx() });
  assert.equal((await a.service.decideRequest(actor("staff2"), "p1", "adjustment", "approve", { requestId: adj, contextVersion: await a.ctx() })).status, "approved");

  const s = world();
  const stale = await extensionReady(s);
  Object.assign(s.project(), { endDate: new Date("2030-03-01T00:00:00Z"), aggregateVersion: 5 });
  await assert.rejects(s.service.decideRequest(actor("head"), "p1", "extension", "approve", { requestId: stale, contextVersion: await s.ctx() }), code("CONTEXT_VERSION_MISMATCH"));

  const m = world();
  const touched = await adjustmentReady(m, { milestoneChanges: [{ id: "ms-1", title: "Mốc 1 mới" }] });
  m.db.projectMilestone.rows.find((row) => row.id === "ms-1").dueDate = new Date("2028-12-01T00:00:00Z");
  await assert.rejects(m.service.decideRequest(actor("staff"), "p1", "adjustment", "approve", { requestId: touched, contextVersion: await m.ctx() }), code("CONTEXT_VERSION_MISMATCH"));

  const d = world();
  const draft = await d.service.createExtension(actor("pi"), "p1", { proposedValues: { requestedEndDate: "2030-06-01" }, reason: "x", contextVersion: await d.ctx() });
  d.project().endDate = new Date("2030-02-01T00:00:00Z");
  await assert.rejects(d.service.submitRequest(actor("pi"), "p1", "extension", { requestId: draft.id, contextVersion: await d.ctx() }), (error) => code("CONTEXT_VERSION_MISMATCH")(error) && /sửa bản nháp hoặc rút yêu cầu/.test(error.response.message));
});

test("editing a request draft re-captures the baseline and writes history and audit", async () => {
  const w = world();
  const draft = await w.service.createExtension(actor("pi"), "p1", { proposedValues: { requestedEndDate: "2030-06-01" }, reason: "x", contextVersion: await w.ctx() });
  w.project().endDate = new Date("2030-02-01T00:00:00Z");
  const edited = await w.service.editRequestDraft(actor("pi"), "p1", "extension", { requestId: draft.id, proposedValues: { requestedEndDate: "2030-07-01" }, reason: "y", contextVersion: await w.ctx() });
  assert.equal(new Date(edited.currentValues.endDate).toISOString(), "2030-02-01T00:00:00.000Z");
  assert.ok(w.db.projectHistory.rows.some((row) => row.action === "project.extension.edit-draft" && row.requestId === draft.id));
  assert.ok(w.db.auditLog.rows.some((row) => row.action === "edit-project-extension-draft"));
  assert.equal((await w.service.submitRequest(actor("pi"), "p1", "extension", { requestId: draft.id, contextVersion: await w.ctx() })).status, "submitted");
});

test("D3: a supplement correction supersedes the returned revision exactly once", async () => {
  const w = world();
  const id = await reportUnderReview(w);
  await w.service.requestReportSupplement(actor("staff"), "p1", { reportId: id, reason: "Thiếu số liệu", responseDeadline: new Date(Date.now() + 7 * DAY), contextVersion: await w.ctx() });
  const pi = await w.service.getProject(actor("pi"), "p1");
  assert.equal(pi.reports.find((row) => row.id === id).reviewReason, "Thiếu số liệu");
  const correction = await w.service.updateReportDraft(actor("pi"), "p1", { reportId: id, progressResults: "Đã bổ sung số liệu", contextVersion: await w.ctx() });
  assert.equal(correction.supersedesReportId, id);
  assert.equal(w.db.projectReportRevision.rows.find((row) => row.id === id).status, "superseded");
  assert.ok(w.db.auditLog.rows.some((row) => row.action === "edit-project-report-draft" && row.targetEntityId === correction.id));
  await assert.rejects(w.service.updateReportDraft(actor("pi"), "p1", { reportId: id, progressResults: "lần 2", contextVersion: await w.ctx() }), code("WORKFLOW_STATE_DENIED"));
  assert.equal((await w.service.submitReport(actor("pi"), "p1", { reportId: correction.id, contextVersion: await w.ctx() })).status, "submitted");
  assert.equal(w.db.projectReportRevision.rows.filter((row) => row.status === "draft").length, 0);
});

test("changing a draft's checkpoint moves its deadline", async () => {
  const w = world();
  const draft = await reportDraft(w, "cp-1");
  const moved = await w.service.updateReportDraft(actor("pi"), "p1", { reportId: draft.id, checkpointId: "cp-2", contextVersion: await w.ctx() });
  assert.equal(moved.deadline.toISOString(), "2029-06-01T00:00:00.000Z");
  const general = await w.service.updateReportDraft(actor("pi"), "p1", { reportId: draft.id, checkpointId: null, contextVersion: await w.ctx() });
  assert.equal(general.checkpointId, null);
  assert.equal(general.deadline.getTime(), w.db.approvedProject.rows[0].endDate.getTime());
});

test("withdraw works while paused and the withdraw pipe requires a reason", async () => {
  const w = world();
  const draft = await w.service.createExtension(actor("pi"), "p1", { proposedValues: { requestedEndDate: "2030-06-01" }, reason: "x", contextVersion: await w.ctx() });
  w.project().status = "paused";
  assert.equal((await w.service.withdrawRequest(actor("pi"), "p1", "extension", { requestId: draft.id, reason: "Không cần", contextVersion: await w.ctx() })).status, "withdrawn");
  assert.throws(() => projectWithdrawPipe.transform({ contextVersion: {} }));
  assert.equal(projectWithdrawPipe.transform({ reason: " Lý do ", contextVersion: {} }).reason, "Lý do");
});

test("overdue starts after the due day, ignores submitted checkpoints and only flags active projects", async () => {
  const flags = async (dueDate, { status = "executing", submitted = false } = {}) => {
    const w = world({ status, milestones: [], checkpoints: [{ id: "cp-x", projectId: "p1", milestoneId: null, title: "X", dueDate, status: "open" }] });
    if (submitted) w.db.projectReportRevision.rows.push({ id: "rep-x", projectId: "p1", checkpointId: "cp-x", revision: 1, status: "submitted", authorId: "pi" });
    const view = await w.service.getProject(actor("head"), "p1");
    return { overdue: view.overdue, approaching: view.approaching };
  };
  assert.deepEqual(await flags(today), { overdue: false, approaching: true });
  assert.deepEqual(await flags(new Date(today.getTime() - DAY)), { overdue: true, approaching: false });
  assert.deepEqual(await flags(new Date(today.getTime() - DAY), { submitted: true }), { overdue: false, approaching: false });
  assert.deepEqual(await flags(new Date(today.getTime() - DAY), { status: "closed" }), { overdue: false, approaching: false });
  assert.deepEqual(await flags(today, { status: "closed" }), { overdue: false, approaching: false });
});

test("setup needs at least one milestone or checkpoint, bounded by the project period", async () => {
  const w = world({ status: "preparing", milestones: [], checkpoints: [] });
  await assert.rejects(w.service.confirmSetup(actor("staff"), "p1", { contextVersion: await w.ctx() }), code("WORKFLOW_STATE_DENIED"));
  await assert.rejects(w.service.configureSetup(actor("staff"), "p1", { milestones: [], checkpoints: [{ title: "Sau hạn", dueDate: "2030-02-01" }], contextVersion: await w.ctx() }), code("EXTENSION_REQUIRED"));
  await assert.rejects(w.service.configureSetup(actor("staff"), "p1", { milestones: [], checkpoints: [{ title: "Trước khi bắt đầu", dueDate: "2025-12-01" }], contextVersion: await w.ctx() }), /thời gian đề tài/);
  await w.service.configureSetup(actor("staff"), "p1", { milestones: [], checkpoints: [{ title: "Kỳ 1", dueDate: "2027-01-01" }], contextVersion: await w.ctx() });
  assert.equal((await w.service.confirmSetup(actor("staff"), "p1", { contextVersion: await w.ctx() })).status, "executing");
});

test("each request and report carries the viewer's own allowed actions", async () => {
  const w = world();
  const report = await reportUnderReview(w);
  const draft = await w.service.createAdjustment(actor("pi"), "p1", { proposedValues: { scope: { summary: "Mới" } }, reason: "x", contextVersion: await w.ctx() });
  const pi = await w.service.getProject(actor("pi"), "p1");
  assert.deepEqual(pi.requests[0].allowedActions, ["project.adjustment.edit-draft", "project.adjustment.submit", "project.adjustment.withdraw"]);
  assert.deepEqual(pi.reports.find((row) => row.id === report).allowedActions, []);
  await w.service.submitRequest(actor("pi"), "p1", "adjustment", { requestId: draft.id, contextVersion: await w.ctx() });
  const staff = await w.service.getProject(actor("staff"), "p1");
  assert.deepEqual(staff.requests[0].allowedActions, ["project.adjustment.request-supplement", "project.adjustment.review"]);
  assert.deepEqual(staff.reports.find((row) => row.id === report).allowedActions, ["project.report.accept", "project.report.request-supplement"]);
  const head = await w.service.getProject(actor("head"), "p1");
  assert.deepEqual(head.requests[0].allowedActions, []);
  assert.ok(head.viewerAuthorization.allowedActions.includes("project.extension.request-supplement"));
  // The PI's submit and correction buttons depend only on these per-report actions.
  await w.service.requestReportSupplement(actor("staff"), "p1", { reportId: report, reason: "Bổ sung", responseDeadline: "2027-07-15", contextVersion: await w.ctx() });
  const own = await reportDraft(w);
  const piAgain = await w.service.getProject(actor("pi"), "p1");
  assert.deepEqual(piAgain.reports.find((row) => row.id === own.id).allowedActions, ["project.report.draft", "project.report.submit"]);
  assert.deepEqual(piAgain.reports.find((row) => row.id === report).allowedActions, ["project.report.draft"]);
});

test("revoking the officer keeps the assignment reason on the officer row", async () => {
  const w = world();
  await w.service.revokeOfficer(actor("head"), "p1", { reason: "Thu hồi", contextVersion: await w.ctx() });
  const row = w.db.projectManagementOfficer.rows.find((item) => item.id === "o-1");
  assert.equal(row.status, "REVOKED");
  assert.equal(row.reason, "Phân công ban đầu");
  assert.ok(w.db.projectHistory.rows.some((item) => item.action === "project.officer.revoke" && item.reason === "Thu hồi"));
});
