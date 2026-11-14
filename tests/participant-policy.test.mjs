import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultParticipantPolicy,
  parseParticipantPolicyValue,
  participantPolicyFor,
  readParticipantPolicy
} from "../dist/apps/api/proposals-shared/participant-policy.js";
import { resolveManagerConflict, resolveReadConflict } from "../dist/apps/api/proposal-evaluations/proposal-evaluation-support.js";
import { advanceApprovalSubmission, resolveApprovalActions } from "../dist/apps/api/proposals-shared/approval-routing.js";
import { projectProposalViewerAuthorizationV1 } from "../dist/apps/api/permissions/proposal-capability-v1.js";
import { ResearchProposalsService } from "../dist/apps/api/research-proposals/research-proposals.service.js";
import { ApprovedProjectsService } from "../dist/apps/api/approved-projects/approved-projects.service.js";
import { projectViewerAuthorizationV1 } from "../dist/apps/api/approved-projects/project-capability-v1.js";
import { AdminConfigService } from "../dist/apps/api/admin/admin-config.service.js";

const prismaWith = (row) => ({ systemParameter: { findUnique: async () => row } });
const configured = {
  RESEARCH_MANAGEMENT_HEAD: { pi: true, view: false, manage: false },
  RESEARCH_BOARD_HEAD: { pi: true, view: true, manage: false },
  RESEARCH_MANAGEMENT_STAFF: { pi: false, view: true, manage: false }
};
const managing = (role) => ({ ...configured, [role]: { ...configured[role], manage: true } });

describe("D-041 participant policy", () => {
  it("reads defaults when missing and fails closed to defaults on a broken value", async () => {
    assert.deepEqual(await readParticipantPolicy(prismaWith(null)), defaultParticipantPolicy());
    assert.deepEqual(await readParticipantPolicy(prismaWith({ value: "{not json" })), defaultParticipantPolicy());
    assert.deepEqual(await readParticipantPolicy(prismaWith({ value: JSON.stringify({ ...configured, RESEARCH_BOARD_HEAD: { pi: "yes", view: true } }) })), defaultParticipantPolicy());
    assert.deepEqual(await readParticipantPolicy({ systemParameter: { findUnique: async () => { throw new Error("db down"); } } }), defaultParticipantPolicy());
    assert.deepEqual(await readParticipantPolicy(prismaWith({ value: JSON.stringify(configured) })), configured);
  });

  it("rejects incomplete or unknown-role input on write", () => {
    assert.throws(() => parseParticipantPolicyValue({ RESEARCH_BOARD_HEAD: { pi: true, view: true } }), /PARTICIPANT_POLICY_INVALID|Thiếu/);
    assert.throws(() => parseParticipantPolicyValue({ ...configured, RESEARCH_MANAGEMENT_DEPUTY_HEAD: { pi: true, view: true } }));
    assert.throws(() => parseParticipantPolicyValue({ ...configured, RESEARCH_MANAGEMENT_HEAD: { pi: true, view: false, manage: true, approve: true } }));
    // Ghi mới luôn đủ ba khóa.
    assert.throws(() => parseParticipantPolicyValue({ ...configured, RESEARCH_MANAGEMENT_HEAD: { pi: true, view: false } }), /PARTICIPANT_POLICY_INVALID|ba giá trị/);
  });

  it("reads a part-1 config without manage as manage=false instead of falling back to defaults", async () => {
    const legacy = Object.fromEntries(Object.entries(configured).map(([role, { pi, view }]) => [role, { pi, view }]));
    assert.deepEqual(await readParticipantPolicy(prismaWith({ value: JSON.stringify(legacy) })), configured);
  });

  it("applies only to TP/TB/CV; every other role keeps the default", () => {
    assert.deepEqual(participantPolicyFor({ systemRole: "RESEARCH_MANAGEMENT_STAFF" }, configured), { pi: false, view: true, manage: false });
    assert.deepEqual(participantPolicyFor({ systemRole: "RESEARCH_MANAGEMENT_DEPUTY_HEAD" }, managing("RESEARCH_MANAGEMENT_HEAD")), { pi: true, view: false, manage: false });
    assert.deepEqual(participantPolicyFor({ systemRole: "LEADERSHIP_APPROVAL_AUTHORITY" }, managing("RESEARCH_MANAGEMENT_HEAD")), { pi: true, view: false, manage: false });
    assert.deepEqual(participantPolicyFor({ systemRole: "RESEARCH_BOARD_HEAD" }, undefined), { pi: true, view: false, manage: false });
    // "Phụ trách" kéo theo "Xem".
    assert.deepEqual(participantPolicyFor({ systemRole: "RESEARCH_MANAGEMENT_HEAD" }, managing("RESEARCH_MANAGEMENT_HEAD")), { pi: true, view: true, manage: true });
  });

  it("manager conflict waives participation only with manage, audits the waiver, and still blocks reviewer conflicts", async () => {
    const participationConflict = { conflicted: true, role: "TOPIC_MEMBER", reasonCode: "participation", reason: "x", viewerMessage: "x" };
    const clean = { isAssignedReviewer: false, hasPersistedReview: false, unresolved: false };
    const resolvers = (review) => ({
      participation: { evaluateConflict: async () => participationConflict },
      reviewAccess: { resolveForProposal: async () => ({ isAssignedReviewer: false }), resolveConflictForProposal: async () => review }
    });
    const tx = (policy) => {
      const audits = [];
      return { audits, systemParameter: { findUnique: async () => ({ value: JSON.stringify(policy) }) }, auditLog: { create: async ({ data }) => { audits.push(data); return { ...data, id: "a", timestamp: new Date(0) }; } } };
    };
    const tb = { id: "tb-1", username: "tb", systemRole: "RESEARCH_BOARD_HEAD" };

    const off = tx(configured);
    assert.equal((await resolveManagerConflict(off, resolvers(clean), tb, "p-1", "save-evaluation-summary")).conflicted, true);
    assert.equal(off.audits.length, 0);

    const on = tx(managing("RESEARCH_BOARD_HEAD"));
    assert.equal((await resolveManagerConflict(on, resolvers(clean), tb, "p-1", "save-evaluation-summary")).conflicted, false);
    assert.deepEqual(on.audits.map((row) => [row.action, row.actorId, row.targetEntity, row.targetEntityId, row.afterFacts.operation]), [["participant-waiver-used", "tb-1", "research-proposal", "p-1", "save-evaluation-summary"]]);
    // Nhánh hiển thị (không truyền thao tác) không ghi audit.
    assert.equal((await resolveManagerConflict(on, resolvers(clean), tb, "p-1")).conflicted, false);
    assert.equal(on.audits.length, 1);
    // Đã phản biện hoặc lịch sử phản biện không xác định vẫn chặn.
    assert.equal((await resolveManagerConflict(on, resolvers({ ...clean, hasPersistedReview: true }), tb, "p-1", "x")).conflicted, true);
    assert.equal((await resolveManagerConflict(on, resolvers({ ...clean, unresolved: true }), tb, "p-1", "x")).conflicted, true);
    // GĐ ngoài TP/TB/CV: không bao giờ được miễn.
    assert.equal((await resolveManagerConflict(on, resolvers(clean), { id: "gd", systemRole: "LEADERSHIP_APPROVAL_AUTHORITY" }, "p-1", "x")).conflicted, true);
    assert.equal(on.audits.length, 1);
  });

  it("approval routing applies manage per role: TP member processes the step, self-review still blocked", async () => {
    const row = { id: "s-1", kind: "PROJECT_ADJUSTMENT", subjectType: "project", subjectId: "prj-1", subjectRef: "r-1", stage: "HEAD_REVIEW", status: "PENDING", submittedById: "cv-1", authorRole: "RESEARCH_MANAGEMENT_STAFF", signer: "DIRECTOR", title: "Tờ trình" };
    const tx = (policy, submission = row) => ({
      systemParameter: { findUnique: async () => ({ value: JSON.stringify(policy) }) },
      approvedProjectMember: { findFirst: async ({ where }) => (where.userId === "tp-1" ? { id: "m-1" } : null) },
      approvalSubmission: { findUnique: async () => submission },
      auditLog: { create: async ({ data }) => ({ ...data, id: "a", timestamp: new Date(0) }) }
    });
    const tp = { id: "tp-1", username: "tp", systemRole: "RESEARCH_MANAGEMENT_HEAD" };
    assert.deepEqual(await resolveApprovalActions(tx(configured), tp, row), { advance: false, return: false });
    assert.deepEqual(await resolveApprovalActions(tx(managing("RESEARCH_MANAGEMENT_HEAD")), tp, row), { advance: true, return: true });
    // Vẫn cấm tự rà soát tờ trình do mình lập.
    const own = { ...row, submittedById: "tp-1" };
    await assert.rejects(advanceApprovalSubmission(tx(managing("RESEARCH_MANAGEMENT_HEAD"), own), tp, "s-1", { expectedStage: "HEAD_REVIEW" }), (error) => error.response?.code === "APPROVAL_SELF_REVIEW");
  });

  it("read conflict lifts participation only when view is on; reviewer conflict still blocks", async () => {
    const participationConflict = { conflicted: true, role: "PROPOSAL_PI", reasonCode: "participation", reason: "x", viewerMessage: "x" };
    const resolvers = (review) => ({
      participation: { evaluateConflict: async () => participationConflict },
      reviewAccess: { resolveForProposal: async () => ({ isAssignedReviewer: false }), resolveConflictForProposal: async () => review }
    });
    const clean = { isAssignedReviewer: false, hasPersistedReview: false, unresolved: false };
    assert.equal((await resolveReadConflict(resolvers(clean), "u", "p", false)).conflicted, true);
    assert.equal((await resolveReadConflict(resolvers(clean), "u", "p", true)).conflicted, false);
    assert.equal((await resolveReadConflict(resolvers({ ...clean, hasPersistedReview: true }), "u", "p", true)).conflicted, true);
    assert.equal((await resolveReadConflict(resolvers({ ...clean, unresolved: true }), "u", "p", true)).conflicted, true);
  });

  it("proposal.review.progress.read opens for a participating responsible CV only when view is on", () => {
    const officer = { resolved: true, officer: { officerUserId: "cv-1", effectiveFrom: new Date("2026-07-01T00:00:00.000Z"), effectiveUntil: null } };
    const input = {
      actor: { id: "cv-1", username: "cv", systemRole: "RESEARCH_MANAGEMENT_STAFF", organizationScopes: [{ id: "org-1" }] },
      proposal: {
        id: "proposal-1", hostOrganizationUnitId: "org-1", status: "under_review",
        updatedAt: new Date("2026-07-31T00:00:00.000Z"), authorizationContextUpdatedAt: new Date("2026-07-31T01:00:00.000Z"),
        authorizationRelationshipVersion: 1, authorizationConflictVersion: 1, authorizationDelegationVersion: 0
      },
      participation: { role: "TOPIC_MEMBER", label: "Thành viên", roles: ["TOPIC_MEMBER"], labels: [], isOwner: false, isParticipant: true, relationshipEffectiveFrom: {}, relationshipEffectiveUntil: {} },
      reviewAccess: { isAssignedReviewer: false },
      managementOfficer: officer,
      canRead: true, canEdit: false, canManageFiles: false
    };
    const code = (capability) => capability.blockedActions.find((item) => item.action === "proposal.review.progress.read")?.code;
    assert.equal(code(projectProposalViewerAuthorizationV1(input)), "CONFLICT_DENIED");
    const viewing = projectProposalViewerAuthorizationV1({ ...input, participantView: true });
    assert.ok(viewing.allowedActions.includes("proposal.review.progress.read"));
    // "Xem" chỉ mở đọc: thao tác quản lý vẫn bị chặn do tham gia.
    assert.equal(viewing.blockedActions.find((item) => item.action === "proposal.review.consolidate")?.code, "CONFLICT_DENIED");
    // Không vượt quyền đọc gốc: CV không phụ trách vẫn bị chặn.
    assert.equal(code(projectProposalViewerAuthorizationV1({ ...input, participantView: true, managementOfficer: { resolved: true, officer: null } })), "ACTION_NOT_GRANTED");

    // "Phụ trách": thao tác quản lý không còn chặn do tham gia; chấm điểm vẫn chặn.
    const managingCapability = projectProposalViewerAuthorizationV1({ ...input, participantView: true, participantManage: true, evaluationSummaryStatus: "draft", completenessCheckCompleted: true, allReviewsSubmitted: true });
    assert.ok(managingCapability.allowedActions.includes("proposal.review.consolidate"));
    assert.equal(managingCapability.blockedActions.find((item) => item.action === "proposal.review.submit")?.code, "CONFLICT_DENIED");
    // Xung đột phản biện vẫn chặn khi Phụ trách bật.
    const reviewed = projectProposalViewerAuthorizationV1({ ...input, participantManage: true, reviewAccess: { isAssignedReviewer: false, hasPersistedReview: true }, evaluationSummaryStatus: "draft", completenessCheckCompleted: true, allReviewsSubmitted: true });
    assert.equal(reviewed.blockedActions.find((item) => item.action === "proposal.review.consolidate")?.code, "CONFLICT_DENIED");

    // TP là người tham gia: giao CV phụ trách và mời hội đồng mở khi Phụ trách bật.
    const head = { ...input, actor: { id: "tp-1", username: "tp", systemRole: "RESEARCH_MANAGEMENT_HEAD", organizationScopes: [{ id: "org-1" }] }, completenessCheckCompleted: true, reviewAccess: { isAssignedReviewer: false, hasReviewConflict: false, hasPersistedReview: false } };
    const headCode = (capability, action) => capability.blockedActions.find((item) => item.action === action)?.code;
    for (const action of ["proposal.management-officer.assign", "proposal.review.assign"]) {
      assert.equal(headCode(projectProposalViewerAuthorizationV1(head), action), "CONFLICT_DENIED", action);
      assert.ok(projectProposalViewerAuthorizationV1({ ...head, participantManage: true }).allowedActions.includes(action), action);
    }
  });

  it("project capability: manage lets a participating staff officer operate but never sign", () => {
    const base = {
      project: { id: "prj-1", hostOrganizationUnitId: "org-1", ownerId: "pi-1", status: "executing", updatedAt: new Date(0) },
      participant: { isParticipant: true, role: "TOPIC_MEMBER" }
    };
    const staff = { ...base, actor: { id: "cv-1", username: "cv", systemRole: "RESEARCH_MANAGEMENT_STAFF", organizationScopes: [{ id: "org-1" }] }, projectOfficer: { officerUserId: "cv-1", status: "ACTIVE", effectiveFrom: new Date(0), effectiveUntil: null } };
    assert.ok(!projectViewerAuthorizationV1(staff).allowedActions.includes("project.report.review"));
    assert.ok(projectViewerAuthorizationV1({ ...staff, participantManage: true }).allowedActions.includes("project.report.review"));
    const director = { ...base, actor: { id: "gd-1", username: "gd", systemRole: "LEADERSHIP_APPROVAL_AUTHORITY", organizationScopes: [{ id: "org-1" }] }, participantManage: true };
    const signing = projectViewerAuthorizationV1(director);
    assert.ok(!signing.allowedActions.includes("project.adjustment.approve"));
    assert.ok(!signing.allowedActions.includes("project.extension.approve"));
  });

  it("assignManagementOfficer by a participating TP: denied with manage off, allowed and audited with manage on, denied after reviewing", async () => {
    const policy = (manage) => ({ ...configured, RESEARCH_MANAGEMENT_HEAD: { ...configured.RESEARCH_MANAGEMENT_HEAD, manage } });
    const setup = (manage, review = {}, status = "submitted") => {
      const audits = [];
      const prisma = {
        systemParameter: { findUnique: async () => ({ value: JSON.stringify(policy(manage)) }) },
        auditLog: { create: async ({ data }) => { audits.push(data); return { ...data, id: `a-${audits.length}`, timestamp: new Date(0) }; } },
        researchProposal: { findUnique: async () => ({ id: "p-1", ownerId: "pi-1", title: "Đề xuất", status }), update: async () => ({}) },
        $queryRaw: async () => [{ asOf: new Date("2026-11-08T00:00:00Z") }],
        user: { findUnique: async () => ({ id: "cv-1", status: "active", systemRole: "RESEARCH_MANAGEMENT_STAFF" }), findMany: async () => [] },
        proposalReviewAssignment: { findFirst: async () => null },
        proposalReview: { findFirst: async () => null },
        proposalManagementOfficer: { findMany: async () => [], update: async () => ({}), create: async ({ data }) => ({ id: "o-1", ...data, officer: { displayName: "CV", username: "cv" } }) }
      };
      const participation = { evaluateConflict: async (userId) => userId === "tp-1"
        ? { conflicted: true, role: "TOPIC_MEMBER", reasonCode: "participation", reason: "x", viewerMessage: "x" }
        : { conflicted: false, role: "none", reasonCode: "no-conflict", reason: "", viewerMessage: "" } };
      const reviewAccess = { resolveConflictForProposal: async () => ({ isAssignedReviewer: false, hasPersistedReview: false, unresolved: false, ...review }) };
      const service = new ResearchProposalsService(prisma, { record: async (entry) => { audits.push(entry); } }, participation, reviewAccess, { resolveForProposal: async () => ({ resolved: true, officer: null }) });
      service.transactional = true;
      return { service, audits };
    };
    const tp = { id: "tp-1", username: "tp", systemRole: "RESEARCH_MANAGEMENT_HEAD", organizationScopes: [] };
    const input = { officerUserId: "cv-1", reason: "Giao phụ trách" };
    await assert.rejects(setup(false).service.assignManagementOfficer(tp, "p-1", input), (error) => error.response?.code === "CONFLICT_DENIED");
    const on = setup(true);
    await on.service.assignManagementOfficer(tp, "p-1", input);
    // An unsubmitted draft is not in the workflow yet, so no officer (and no officer read access) is assigned to it.
    await assert.rejects(setup(true, {}, "draft").service.assignManagementOfficer(tp, "p-1", input), (error) => error.response?.code === "WORKFLOW_STATE_DENIED");
    assert.deepEqual(on.audits.filter((row) => row.action === "participant-waiver-used").map((row) => row.afterFacts.operation), ["assign-proposal-management-officer"]);
    await assert.rejects(setup(true, { hasPersistedReview: true }).service.assignManagementOfficer(tp, "p-1", input), (error) => error.response?.code === "CONFLICT_DENIED");
  });

  it("pi=false blocks only new participation: new draft, newly added proposal member, newly added project member", async () => {
    const policyRow = { value: JSON.stringify(configured) }; // CV.pi = false
    const cv = { id: "cv-1", username: "cv", systemRole: "RESEARCH_MANAGEMENT_STAFF", researcherProfileId: "rp-1", organizationScopes: [] };
    const users = { "cv-1": "RESEARCH_MANAGEMENT_STAFF", "tb-1": "RESEARCH_BOARD_HEAD" };
    const prisma = {
      systemParameter: { findUnique: async () => policyRow },
      proposalMember: { findMany: async ({ where }) => where.userId.in.filter((id) => id === "cv-existing").map((userId) => ({ userId })) },
      user: { findMany: async ({ where }) => where.id.in.map((id) => ({ systemRole: users[id] ?? "RESEARCH_MANAGEMENT_STAFF" })) }
    };
    const proposals = new ResearchProposalsService(prisma, {}, {}, {}, {});
    proposals.transactional = true;
    await assert.rejects(proposals.createDraft(cv, {}), (error) => error.response?.code === "ACTION_NOT_GRANTED");
    await assert.rejects(proposals.assertNewMembersMayParticipate("p-1", new Set(["cv-1"])), (error) => error.response?.code === "PARTICIPANT_ROLE_DENIED");
    // CV đã là thành viên đang hiệu lực thì giữ nguyên; TB vẫn được thêm.
    await proposals.assertNewMembersMayParticipate("p-1", new Set(["cv-existing", "tb-1"]));

    const projects = new ApprovedProjectsService(prisma, {});
    await assert.rejects(projects.assertAddedMembersMayParticipate(prisma, { membershipChanges: [{ action: "add", userId: "cv-1" }] }), (error) => error.response?.code === "PARTICIPANT_ROLE_DENIED");
    await projects.assertAddedMembersMayParticipate(prisma, { membershipChanges: [{ action: "add", userId: "tb-1" }, { action: "end", memberId: "m-1" }] });
  });

  it("toProposalResponse lifts the participant hide only for the responsible CV with view on", () => {
    const service = new ResearchProposalsService({}, {}, {}, {}, {});
    const actor = { id: "cv-1", username: "cv", systemRole: "RESEARCH_MANAGEMENT_STAFF", organizationScopes: [{ id: "org-1" }] };
    const proposal = {
      id: "p-1", ownerId: "pi-1", owner: { displayName: "PI" }, intakePeriodId: "i-1", intakePeriod: { title: "Đợt" }, hostOrganizationUnitId: "org-1", title: "Đề xuất",
      status: "under_review", createdAt: new Date(0), updatedAt: new Date(0), authorizationContextUpdatedAt: new Date(0),
      authorizationRelationshipVersion: 1, authorizationConflictVersion: 1, authorizationDelegationVersion: 0
    };
    const participation = { role: "TOPIC_MEMBER", label: "Thành viên", roles: ["TOPIC_MEMBER"], labels: [], isOwner: false, isParticipant: true, relationshipEffectiveFrom: {}, relationshipEffectiveUntil: {} };
    const reviewAccess = { isAssignedReviewer: false, hasReviewConflict: false, hasPersistedReview: false };
    const officerOf = (officerUserId) => ({ resolved: true, officer: { id: "o-1", officerUserId, status: "ACTIVE", effectiveFrom: new Date(0), effectiveUntil: null, assignedById: "tp-1" } });
    const respond = (officer, policy) => service.toProposalResponse(proposal, actor, participation, reviewAccess, true, officer, "draft", null, null, undefined, policy);

    const asOfficer = respond(officerOf("cv-1"), configured);
    assert.ok(asOfficer.reviewWorkflow);
    assert.equal(asOfficer.evaluationSummaryStatus, "draft");
    assert.ok(asOfficer.viewerAuthorization.allowedActions.includes("proposal.review.progress.read"));
    const notOfficer = respond(officerOf("cv-2"), configured);
    assert.equal(notOfficer.reviewWorkflow, undefined);
    assert.equal(notOfficer.evaluationSummaryStatus, undefined);
    assert.equal(respond(officerOf("cv-1"), defaultParticipantPolicy()).reviewWorkflow, undefined);
  });

  it("supplement/completeness guard (D-038): TB without officer and participating responsible CV pass; a reviewer CV is denied", async () => {
    const proposal = { id: "p-1" };
    const service = (officerId, review) => new ResearchProposalsService({}, {}, {},
      { resolveConflictForProposal: async () => ({ isAssignedReviewer: false, hasPersistedReview: false, unresolved: false, ...review }) },
      { isCurrentOfficer: async (_proposalId, userId) => userId === officerId });
    await service(null).assertCanRequestSupplement({ id: "tb-1", systemRole: "RESEARCH_BOARD_HEAD" }, proposal);
    await service("cv-1").assertCanRequestSupplement({ id: "cv-1", systemRole: "RESEARCH_MANAGEMENT_STAFF" }, proposal);
    await assert.rejects(service("cv-1", { hasPersistedReview: true }).assertCanRequestSupplement({ id: "cv-1", systemRole: "RESEARCH_MANAGEMENT_STAFF" }, proposal), (error) => error.response?.code === "CONFLICT_DENIED");
  });

  it("QT update upserts the parsed policy with before/after audit; invalid input writes nothing", async () => {
    const calls = { upserts: [], audits: [] };
    const tx = {
      systemParameter: {
        findUnique: async () => null,
        upsert: async (args) => { calls.upserts.push(args); return { id: "sp-1", value: args.create.value, updatedAt: new Date(0) }; }
      }
    };
    const prisma = { ...tx, $transaction: async (work) => work(tx) };
    const auditLog = { record: async (entry) => { calls.audits.push(entry); } };
    const admin = new AdminConfigService(prisma, auditLog);
    const actor = { id: "qt-1", username: "qt", systemRole: "SYSTEM_ADMIN" };

    const saved = await admin.updateParticipantPolicy(actor, { policy: configured });
    assert.deepEqual(saved.policy, configured);
    assert.equal(calls.upserts.length, 1);
    assert.deepEqual(JSON.parse(calls.upserts[0].create.value), configured);
    assert.equal(calls.audits[0].action, "update-participant-policy-config");
    assert.deepEqual(calls.audits[0].beforeFacts, { policy: defaultParticipantPolicy() });
    assert.deepEqual(calls.audits[0].afterFacts, { policy: configured });

    await assert.rejects(admin.updateParticipantPolicy(actor, { policy: { RESEARCH_BOARD_HEAD: { pi: "yes" } } }), (error) => error.response?.code === "PARTICIPANT_POLICY_INVALID");
    assert.equal(calls.upserts.length, 1);
    assert.equal(calls.audits.length, 1);
  });
});
