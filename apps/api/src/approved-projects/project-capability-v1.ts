// @ts-ignore runtime package is JavaScript; API imports the TypeScript contract.
import type { AuthorizationDecisionCodeV1, PermissionActionV1, ViewerAuthorizationV1, ViewerRelationshipV1 } from "@rtms/permissions";
import type { SafeUserContext } from "../auth/auth.types.js";
import { publicAuthorizationReasonV1 } from "../permissions/authorization-v1.service.js";

export const PROJECT_ACTIONS: PermissionActionV1[] = [
  "project.read", "project.monitor", "project.setup.configure", "project.setup.confirm", "project.officer.assign", "project.officer.revoke",
  "project.report.draft", "project.report.submit", "project.report.review", "project.report.request-supplement", "project.report.accept",
  "project.evidence.contribute",
  "project.adjustment.create", "project.adjustment.edit-draft", "project.adjustment.submit", "project.adjustment.review", "project.adjustment.request-supplement", "project.adjustment.approve", "project.adjustment.reject",
  "project.extension.create", "project.extension.edit-draft", "project.extension.submit", "project.extension.validate", "project.extension.prepare", "project.extension.request-supplement", "project.extension.approve", "project.extension.reject",
  "project.history.read"
];

export const PROJECT_STATUSES = {
  preparing: "preparing",
  executing: "executing",
  paused: "paused",
  pendingAcceptance: "pending_acceptance",
  accepted: "accepted",
  failed: "failed",
  closed: "closed"
} as const;

export type ProjectOfficerFact = {
  officerUserId: string;
  status: string;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
};

export type ProjectCapabilityInput = {
  actor: SafeUserContext;
  project: {
    id: string;
    ownerId: string;
    hostOrganizationUnitId: string;
    status: string;
    updatedAt: Date;
    aggregateVersion?: number;
    relationshipVersion?: number;
    conflictVersion?: number;
    delegationVersion?: number;
  };
  projectOfficer?: ProjectOfficerFact | null;
  participant?: { isParticipant: boolean; role?: string; effectiveFrom?: string; effectiveUntil?: string | null };
  responsibleMember?: boolean;
  request?: { requestType: string; status: string; requesterId: string };
  report?: { status: string; authorId: string };
};

function isHead(actor: SafeUserContext) { return actor.systemRole === "SCIENTIFIC_MANAGEMENT_HEAD"; }
function isStaff(actor: SafeUserContext) { return actor.systemRole === "SCIENTIFIC_MANAGEMENT_STAFF"; }
function isLeadership(actor: SafeUserContext) { return actor.systemRole === "LEADERSHIP_APPROVAL_AUTHORITY"; }
function isOversight(actor: SafeUserContext) { return actor.systemRole === "RESEARCH_OVERSIGHT_AUTHORITY"; }
function inScope(actor: SafeUserContext, project: ProjectCapabilityInput["project"]) { return actor.organizationScopes.some((scope) => scope.id === project.hostOrganizationUnitId); }
function activeOfficer(officer: ProjectOfficerFact | null | undefined, actorId: string, asOf = new Date()) {
  return !!officer && officer.status === "ACTIVE" && officer.officerUserId === actorId && officer.effectiveFrom <= asOf && (officer.effectiveUntil === null || asOf < officer.effectiveUntil);
}
function blocked(code: AuthorizationDecisionCodeV1) { return { code, reason: publicAuthorizationReasonV1(code) }; }

export function projectViewerAuthorizationV1(input: ProjectCapabilityInput): ViewerAuthorizationV1 {
  const scoped = inScope(input.actor, input.project);
  const officerFact = input.projectOfficer && activeOfficer(input.projectOfficer, input.actor.id) ? input.projectOfficer : null;
  const hasOfficer = officerFact !== null;
  const participant = input.participant?.isParticipant === true;
  const isPi = input.project.ownerId === input.actor.id && scoped;
  const canRead = scoped && (isPi || participant || isHead(input.actor) || isLeadership(input.actor) || isOversight(input.actor) || (isStaff(input.actor) && hasOfficer));
  const canMonitor = scoped && (isHead(input.actor) || isLeadership(input.actor) || isOversight(input.actor) || hasOfficer || isPi || participant);
  const canOperate = scoped && isStaff(input.actor) && hasOfficer && !participant && !isPi;
  const canHeadDecide = scoped && isHead(input.actor) && !participant && !isPi;
  const canPi = isPi && input.project.status === PROJECT_STATUSES.executing;
  const statusesForExecution = [PROJECT_STATUSES.executing, PROJECT_STATUSES.paused];
  const inExecution = statusesForExecution.includes(input.project.status as typeof PROJECT_STATUSES.executing | typeof PROJECT_STATUSES.paused);

  const blockedActions: Array<{ action: PermissionActionV1; code: AuthorizationDecisionCodeV1; reason: string }> = [];
  const allowedActions: PermissionActionV1[] = [];
  for (const action of PROJECT_ACTIONS) {
    const denial = projectActionDenial(action, { ...input, scoped, officer: hasOfficer, participantActive: participant, isPi, canRead, canMonitor, canOperate, canHeadDecide, canPi, inExecution });
    if (denial) blockedActions.push({ action, ...denial });
    else allowedActions.push(action);
  }

  const viewerRelationships: ViewerRelationshipV1[] = [];
  if (isPi) viewerRelationships.push({ type: "TOPIC_PI", status: "ACTIVE", effectiveFrom: input.participant?.effectiveFrom ?? input.project.updatedAt.toISOString(), effectiveUntil: input.participant?.effectiveUntil ?? null });
  if (participant && input.participant?.role) viewerRelationships.push({ type: input.participant.role === "TOPIC_SECRETARY" ? "TOPIC_SECRETARY" : "TOPIC_MEMBER", status: "ACTIVE", effectiveFrom: input.participant.effectiveFrom ?? input.project.updatedAt.toISOString(), effectiveUntil: input.participant.effectiveUntil ?? null });
  if (officerFact) viewerRelationships.push({ type: "PROJECT_MANAGEMENT_OFFICER", status: "ACTIVE", effectiveFrom: officerFact.effectiveFrom.toISOString(), effectiveUntil: officerFact.effectiveUntil?.toISOString() ?? null });
  viewerRelationships.sort((left, right) => left.type.localeCompare(right.type));

  return {
    schemaVersion: "v1",
    systemRole: input.actor.systemRole,
    viewerRelationships,
    allowedActions: allowedActions.sort(),
    blockedActions: blockedActions.sort((left, right) => left.action.localeCompare(right.action)),
    policyVersion: "v1",
    evaluatedAsOf: new Date().toISOString(),
    contextVersion: {
      domain: "approved-project",
      recordId: input.project.id,
      aggregateVersion: input.project.aggregateVersion ?? input.project.updatedAt.getTime(),
      relationshipVersion: input.project.relationshipVersion ?? 0,
      conflictVersion: input.project.conflictVersion ?? 0,
      delegationVersion: input.project.delegationVersion ?? 0,
      policyVersion: "v1"
    },
    accessReasons: [isPi ? "TOPIC_PI" : "", participant ? (input.participant?.role ?? "TOPIC_MEMBER") : "", hasOfficer ? "PROJECT_MANAGEMENT_OFFICER" : "", isHead(input.actor) ? "SCIENTIFIC_MANAGEMENT_HEAD_OVERSIGHT" : "", isLeadership(input.actor) ? "LEADERSHIP_APPROVAL_AUTHORITY_OVERSIGHT" : "", isOversight(input.actor) ? "RESEARCH_OVERSIGHT_AUTHORITY_OVERSIGHT" : ""].filter(Boolean)
  };
}

function projectActionDenial(action: PermissionActionV1, input: ProjectCapabilityInput & { scoped: boolean; officer: boolean; participantActive: boolean; isPi: boolean; canRead: boolean; canMonitor: boolean; canOperate: boolean; canHeadDecide: boolean; canPi: boolean; inExecution: boolean }): { code: AuthorizationDecisionCodeV1; reason: string } | null {
  if (action === "project.read" || action === "project.history.read") return input.canRead ? null : blocked("ACTION_NOT_GRANTED");
  if (action === "project.monitor") return input.canMonitor ? null : blocked("ACTION_NOT_GRANTED");
  if (action === "project.setup.configure" || action === "project.setup.confirm") return input.canOperate && input.project.status === PROJECT_STATUSES.preparing ? null : blocked(input.project.status === PROJECT_STATUSES.preparing ? "ACTION_NOT_GRANTED" : "WORKFLOW_STATE_DENIED");
  if (action === "project.officer.assign" || action === "project.officer.revoke") return input.canHeadDecide ? null : blocked("ACTION_NOT_GRANTED");
  if (action === "project.report.draft" || action === "project.report.submit") return input.canPi && input.isPi ? null : blocked(input.inExecution ? "ACTION_NOT_GRANTED" : "WORKFLOW_STATE_DENIED");
  if (action === "project.evidence.contribute") return input.project.status === PROJECT_STATUSES.executing && input.scoped && (input.isPi || (input.participantActive && input.responsibleMember)) ? null : blocked(input.inExecution ? "ACTION_NOT_GRANTED" : "WORKFLOW_STATE_DENIED");
  if (action === "project.report.review") return input.canOperate && (!input.report || ["submitted", "under_review"].includes(input.report.status)) ? null : blocked(input.report && !["submitted", "under_review"].includes(input.report.status) ? "WORKFLOW_STATE_DENIED" : "ACTION_NOT_GRANTED");
  if (action === "project.report.request-supplement") return input.canOperate && (!input.report || ["submitted", "under_review"].includes(input.report.status)) ? null : blocked(input.report && !["submitted", "under_review"].includes(input.report.status) ? "WORKFLOW_STATE_DENIED" : "ACTION_NOT_GRANTED");
  if (action === "project.report.accept") return input.canOperate && (!input.report || input.report.status === "under_review") ? null : blocked(input.report && input.report.status !== "under_review" ? "WORKFLOW_STATE_DENIED" : "ACTION_NOT_GRANTED");
  if (action.startsWith("project.adjustment.")) {
    if (["project.adjustment.create", "project.adjustment.edit-draft", "project.adjustment.submit"].includes(action)) return input.canPi && input.isPi ? null : blocked(input.inExecution ? "ACTION_NOT_GRANTED" : "WORKFLOW_STATE_DENIED");
    if (action === "project.adjustment.review") return input.canOperate && (!input.request || (input.request.requestType === "adjustment" && input.request.status === "submitted")) ? null : blocked(input.request && input.request.requestType === "adjustment" ? "WORKFLOW_STATE_DENIED" : "ACTION_NOT_GRANTED");
    if (action === "project.adjustment.request-supplement") return input.canOperate && (!input.request || (input.request.requestType === "adjustment" && ["submitted", "under_staff_review"].includes(input.request.status))) ? null : blocked(input.request && input.request.requestType === "adjustment" ? "WORKFLOW_STATE_DENIED" : "ACTION_NOT_GRANTED");
    if (action === "project.adjustment.approve" || action === "project.adjustment.reject") return input.canOperate && (!input.request || (input.request.requestType === "adjustment" && input.request.status === "under_staff_review")) ? null : blocked(input.request && input.request.requestType === "adjustment" ? "WORKFLOW_STATE_DENIED" : "ACTION_NOT_GRANTED");
  }
  if (action.startsWith("project.extension.")) {
    if (["project.extension.create", "project.extension.edit-draft", "project.extension.submit"].includes(action)) return input.canPi && input.isPi ? null : blocked(input.inExecution ? "ACTION_NOT_GRANTED" : "WORKFLOW_STATE_DENIED");
    if (action === "project.extension.validate") return input.canOperate && (!input.request || (input.request.requestType === "extension" && input.request.status === "submitted")) ? null : blocked(input.request && input.request.requestType === "extension" ? "WORKFLOW_STATE_DENIED" : "ACTION_NOT_GRANTED");
    if (action === "project.extension.prepare") return input.canOperate && (!input.request || (input.request.requestType === "extension" && input.request.status === "under_staff_validation")) ? null : blocked(input.request && input.request.requestType === "extension" ? "WORKFLOW_STATE_DENIED" : "ACTION_NOT_GRANTED");
    if (action === "project.extension.request-supplement") return (input.canOperate && !!input.request && input.request.requestType === "extension" && ["submitted", "under_staff_validation"].includes(input.request.status)) || (input.canHeadDecide && !!input.request && input.request.requestType === "extension" && input.request.status === "ready_for_head_decision") ? null : blocked(input.request && input.request.requestType === "extension" ? "WORKFLOW_STATE_DENIED" : "ACTION_NOT_GRANTED");
    if (action === "project.extension.approve" || action === "project.extension.reject") return input.canHeadDecide && (!input.request || (input.request.requestType === "extension" && input.request.status === "ready_for_head_decision")) ? null : blocked(input.request && input.request.requestType === "extension" ? "WORKFLOW_STATE_DENIED" : "ACTION_NOT_GRANTED");
  }
  return blocked("ACTION_NOT_GRANTED");
}

export function projectContextVersion(project: Record<string, any>) {
  return {
    domain: "approved-project",
    recordId: project.id,
    aggregateVersion: project.aggregateVersion ?? project.updatedAt.getTime(),
    relationshipVersion: project.relationshipVersion ?? 0,
    conflictVersion: project.conflictVersion ?? 0,
    delegationVersion: project.delegationVersion ?? 0,
    policyVersion: "v1"
  };
}
