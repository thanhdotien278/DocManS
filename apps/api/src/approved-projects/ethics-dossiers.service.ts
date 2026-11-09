import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { notifyUsers } from "../notifications/notification-events.js";
import { readTransactionClockV1 } from "../permissions/authorization-v1.service.js";
import { isRelationshipActiveAt } from "../proposals-shared/proposal-participation.js";
import { ETHICS_DOSSIER_ENTITY_TYPE } from "../modules/files/files.dto.js";
import { ApprovedProjectsService } from "./approved-projects.service.js";
import { projectContextVersion } from "./project-capability-v1.js";

type AnyRecord = Record<string, any>;

export const ETHICS_DOSSIER_DRAFT = "draft";
export const ETHICS_DOSSIER_SUBMITTED = "submitted";
// D-042: tệp bắt buộc; ETHICS_CONSENT được miễn khi mục 4 chọn miễn chấp thuận; ETHICS_OTHER không bắt buộc.
export const ETHICS_REQUIRED_FILES = ["ETHICS_APPLICATION", "ETHICS_PROTOCOL", "ETHICS_DATA_TOOL", "ETHICS_CONSENT"];
export const ETHICS_FILE_PURPOSES = [...ETHICS_REQUIRED_FILES, "ETHICS_OTHER"];
export const ETHICS_SUBJECT_TYPES = ["human", "animal", "biospecimen", "secondary_data"];
export const ETHICS_SECTIONS = ["subjects", "methods", "riskBenefit", "consent", "dataProtection", "commitment"] as const;
type EthicsSection = (typeof ETHICS_SECTIONS)[number];
const TEXT_MAX = 20000;

const EMPTY_SECTIONS = { subjects: { types: [], sampleSize: null, description: "" }, methods: "", riskBenefit: "", consent: { mode: "required", text: "" }, dataProtection: "", commitment: false };

/** Lỗi theo capability: action không liên quan → 403, đúng người nhưng sai trạng thái → 400 (ma trận Story 10.3). */
export function ethicsCapabilityError(capability: AnyRecord, action: string) {
  const blocked = (capability.blockedActions ?? []).find((item: AnyRecord) => item.action === action);
  if (!blocked) return null;
  return blocked.code === "WORKFLOW_STATE_DENIED" ? new BadRequestException({ code: blocked.code, message: blocked.reason }) : new ForbiddenException({ code: blocked.code, message: blocked.reason });
}

export function isPiViewer(capability: AnyRecord) { return (capability.viewerRelationships ?? []).some((item: AnyRecord) => item.type === "TOPIC_PI"); }
/** Mọi thay đổi hồ sơ đổi context đề tài, để client cũ không ghi đè hoặc nộp nội dung đã đổi. */
export async function bumpEthicsProjectContext(tx: any, projectId: string, now: Date) {
  await tx.approvedProject.update({ where: { id: projectId }, data: { aggregateVersion: { increment: 1 }, authorizationContextUpdatedAt: now } });
}

/** D-042: người không phải PI sửa mục 1–5 hoặc tệp thì cam kết của PI hết hiệu lực. */
export async function resetEthicsCommitment(tx: any, dossierId: string) {
  const dossier = await tx.ethicsDossier.findUnique({ where: { id: dossierId }, select: { sections: true } });
  if ((dossier.sections as AnyRecord)?.commitment) await tx.ethicsDossier.update({ where: { id: dossierId }, data: { sections: { ...(dossier.sections as AnyRecord), commitment: false } } });
}

export function isOfficerViewer(capability: AnyRecord) { return (capability.viewerRelationships ?? []).some((item: AnyRecord) => item.type === "PROJECT_MANAGEMENT_OFFICER"); }

function text(value: unknown, field: string) {
  if (typeof value !== "string" || value.length > TEXT_MAX) throw new BadRequestException({ code: "SECTION_INVALID", message: `${field} không hợp lệ.` });
  return value;
}

function exactKeys(value: unknown, keys: string[], field: string): AnyRecord {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((key) => !keys.includes(key))) throw new BadRequestException({ code: "SECTION_INVALID", message: `${field} không hợp lệ.` });
  return value as AnyRecord;
}

export function readEthicsSection(section: unknown, value: unknown): { section: EthicsSection; value: unknown } {
  if (!ETHICS_SECTIONS.includes(section as EthicsSection)) throw new BadRequestException({ code: "SECTION_INVALID", message: "Mục hồ sơ không hợp lệ." });
  const key = section as EthicsSection;
  if (key === "commitment") {
    if (typeof value !== "boolean") throw new BadRequestException({ code: "SECTION_INVALID", message: "Cam kết không hợp lệ." });
    return { section: key, value };
  }
  if (key === "subjects") {
    const input = exactKeys(value, ["types", "sampleSize", "description"], "Đối tượng nghiên cứu");
    const types = input.types ?? [];
    if (!Array.isArray(types) || types.some((item) => !ETHICS_SUBJECT_TYPES.includes(item)) || new Set(types).size !== types.length) throw new BadRequestException({ code: "SECTION_INVALID", message: "Loại đối tượng nghiên cứu không hợp lệ." });
    const sampleSize = input.sampleSize ?? null;
    if (sampleSize !== null && (!Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > 10_000_000)) throw new BadRequestException({ code: "SECTION_INVALID", message: "Cỡ mẫu không hợp lệ." });
    return { section: key, value: { types, sampleSize, description: text(input.description ?? "", "Mô tả đối tượng") } };
  }
  if (key === "consent") {
    const input = exactKeys(value, ["mode", "text"], "Quy trình chấp thuận");
    if (!["required", "waived"].includes(input.mode)) throw new BadRequestException({ code: "SECTION_INVALID", message: "Hình thức chấp thuận không hợp lệ." });
    return { section: key, value: { mode: input.mode, text: text(input.text ?? "", "Nội dung chấp thuận") } };
  }
  return { section: key, value: text(value, "Nội dung mục") };
}

/** Đủ 6 mục, mục 1 có đối tượng, mục 6 đã tích, đủ tệp bắt buộc (D-042). */
export function ethicsDossierReadiness(sections: AnyRecord, files: Array<{ filePurpose: string }>) {
  const filled = (value: unknown) => typeof value === "string" && value.trim().length > 0;
  const missingSections = [
    !(sections.subjects?.types?.length && filled(sections.subjects?.description)) && "subjects",
    !filled(sections.methods) && "methods",
    !filled(sections.riskBenefit) && "riskBenefit",
    !filled(sections.consent?.text) && "consent",
    !filled(sections.dataProtection) && "dataProtection",
    sections.commitment !== true && "commitment"
  ].filter(Boolean) as string[];
  const present = new Set(files.map((file) => file.filePurpose));
  const required = sections.consent?.mode === "waived" ? ETHICS_REQUIRED_FILES.filter((code) => code !== "ETHICS_CONSENT") : ETHICS_REQUIRED_FILES;
  const missingFiles = required.filter((code) => !present.has(code));
  return { ready: !missingSections.length && !missingFiles.length, missingSections, missingFiles };
}

@Injectable()
export class EthicsDossiersService {
  constructor(private readonly prisma: PrismaService, private readonly projects: ApprovedProjectsService) {}

  async getDossier(actor: SafeUserContext, projectId: string) {
    return this.view(this.prisma, actor, projectId);
  }

  async createDossier(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.projects.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      await this.authorizeMutation(tx, currentActor, project, "ethics-dossier.create", "create-ethics-dossier");
      const pi = (project.members ?? []).find((member: AnyRecord) => member.participationRole === "TOPIC_PI" && member.userId && isRelationshipActiveAt(member, new Date()));
      if (!pi) throw new BadRequestException({ code: "WORKFLOW_STATE_DENIED", message: "Đề tài chưa có chủ nhiệm hiện hành." });
      const dossier = await tx.ethicsDossier.create({ data: {
        projectId: project.id, applicantUserId: pi.userId, hostOrganizationUnitId: project.hostOrganizationUnitId, status: ETHICS_DOSSIER_DRAFT, sections: EMPTY_SECTIONS,
        sourceContext: { projectContextVersion: projectContextVersion(project), sourceSubmissionEventId: project.sourceSubmissionEventId, sourceDecisionId: project.sourceDecisionId },
        createdById: currentActor.id
      } });
      await bumpEthicsProjectContext(tx, project.id, await readTransactionClockV1(tx));
      const facts = { dossierId: dossier.id, status: dossier.status, version: dossier.version };
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "ethics-dossier.create", toStatus: ETHICS_DOSSIER_DRAFT, reason: "Tạo hồ sơ đạo đức", afterFacts: facts } });
      await new AuditLogService(tx).record({ action: "create-ethics-dossier", result: "success", actorId: currentActor.id, targetEntity: "ethics-dossier", targetEntityId: dossier.id, username: currentActor.username, afterFacts: facts });
      return this.view(tx, currentActor, project.id);
    });
  }

  async updateSection(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    const { section, value } = readEthicsSection(input.section, input.value);
    return this.projects.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      const capability = await this.authorizeMutation(tx, currentActor, project, "ethics-dossier.edit", "edit-ethics-dossier");
      if (section === "commitment" && !isPiViewer(capability)) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chỉ chủ nhiệm đề tài được xác nhận cam kết đạo đức." });
      const dossier = await tx.ethicsDossier.findUnique({ where: { projectId: project.id } });
      const resetCommitment = section !== "commitment" && !isPiViewer(capability);
      const updated = await tx.ethicsDossier.update({ where: { id: dossier.id }, data: { sections: { ...(dossier.sections as AnyRecord), [section]: value, ...(resetCommitment ? { commitment: false } : {}) } } });
      await bumpEthicsProjectContext(tx, project.id, await readTransactionClockV1(tx));
      await new AuditLogService(tx).record({ action: "edit-ethics-dossier-section", result: "success", actorId: currentActor.id, targetEntity: "ethics-dossier", targetEntityId: dossier.id, username: currentActor.username, reason: section, afterFacts: { dossierId: updated.id, status: updated.status, version: updated.version } });
      return this.view(tx, currentActor, project.id);
    });
  }

  async submit(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.projects.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      await this.authorizeMutation(tx, currentActor, project, "ethics-dossier.submit", "submit-ethics-dossier");
      const dossier = await tx.ethicsDossier.findUnique({ where: { projectId: project.id } });
      const files = await this.activeFiles(tx, dossier.id);
      const readiness = ethicsDossierReadiness(dossier.sections as AnyRecord, files);
      if (!readiness.ready) throw new BadRequestException({ code: "READINESS_INCOMPLETE", message: "Hồ sơ đạo đức chưa đủ điều kiện nộp.", missingSections: readiness.missingSections, missingFiles: readiness.missingFiles });
      const now = await readTransactionClockV1(tx);
      const snapshot = {
        version: dossier.version, sections: dossier.sections, files: files.map((file: AnyRecord) => ({ id: file.id, filePurpose: file.filePurpose })),
        projectContextVersion: projectContextVersion(project), sourceSubmissionEventId: project.sourceSubmissionEventId, sourceDecisionId: project.sourceDecisionId
      };
      const updated = await tx.ethicsDossier.update({ where: { id: dossier.id }, data: { status: ETHICS_DOSSIER_SUBMITTED, submittedAt: now, submittedById: currentActor.id } });
      await bumpEthicsProjectContext(tx, project.id, now);
      await tx.ethicsDossierSubmission.create({ data: { dossierId: dossier.id, version: dossier.version, actorId: currentActor.id, snapshot, submittedAt: now } });
      const facts = { dossierId: dossier.id, status: ETHICS_DOSSIER_SUBMITTED, version: dossier.version };
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "ethics-dossier.submit", fromStatus: ETHICS_DOSSIER_DRAFT, toStatus: ETHICS_DOSSIER_SUBMITTED, reason: "Nộp hồ sơ đạo đức", afterFacts: facts } });
      await new AuditLogService(tx).record({ action: "submit-ethics-dossier", result: "success", actorId: currentActor.id, targetEntity: "ethics-dossier", targetEntityId: dossier.id, username: currentActor.username, beforeFacts: { status: ETHICS_DOSSIER_DRAFT }, afterFacts: facts });
      // D-042: báo CV phụ trách; đề tài chưa có CV phụ trách thì báo TB đang hoạt động.
      const officer = await this.projects.currentOfficer(tx, project.id);
      // CV phụ trách tự nộp thì báo PI hiện hành (D-042).
      const activePi = (project.members ?? []).find((member: AnyRecord) => member.participationRole === "TOPIC_PI" && member.userId && isRelationshipActiveAt(member, now))?.userId ?? dossier.applicantUserId;
      const recipients = officer?.officerUserId === currentActor.id ? [activePi] : officer ? [officer.officerUserId] : (await tx.user.findMany({ where: { systemRole: "RESEARCH_BOARD_HEAD", status: "active" }, select: { id: true } })).map((user: AnyRecord) => user.id);
      await notifyUsers(tx, { userIds: recipients, exclude: [currentActor.id], type: "ethics-dossier.submitted", title: "Hồ sơ đạo đức đã được nộp", body: project.title, link: `/projects/${project.id}/ethics-dossier`, sourceType: "ethics_dossier", sourceId: dossier.id, idempotencyKey: `ethics-dossier:${dossier.id}:v${updated.version}` });
      return this.view(tx, currentActor, project.id);
    });
  }

  /** Kiểm tra theo thứ tự: quyền → trùng hồ sơ → trạng thái; CV đi thêm `assertOfficer` (phạm vi, D-041, xung đột phản biện). */
  private async authorizeMutation(tx: any, actor: SafeUserContext, project: AnyRecord, action: string, operation: string) {
    const { capability } = await this.projects.loadAuthorized(tx, actor, project.id);
    const denial = ethicsCapabilityError(capability, action);
    if (denial instanceof ForbiddenException) throw denial;
    if (action === "ethics-dossier.create" && project.ethicsDossier) throw new ConflictException({ code: "ETHICS_DOSSIER_EXISTS", message: "Đề tài đã có hồ sơ đạo đức." });
    if (action !== "ethics-dossier.create" && !project.ethicsDossier) throw new NotFoundException({ message: "Đề tài chưa có hồ sơ đạo đức." });
    if (denial) throw denial;
    if (!isPiViewer(capability) && isOfficerViewer(capability)) await this.projects.assertOfficer(tx, actor, project, operation);
    return capability;
  }

  private activeFiles(tx: any, dossierId: string) {
    return tx.fileRecord.findMany({ where: { relatedEntityType: ETHICS_DOSSIER_ENTITY_TYPE, relatedEntityId: dossierId, status: "active", deletedAt: null }, orderBy: { createdAt: "asc" } });
  }

  private async view(tx: any, actor: SafeUserContext, projectId: string) {
    const { project, capability } = await this.projects.loadAuthorized(tx, actor, projectId);
    const readDenial = ethicsCapabilityError(capability, "ethics-dossier.read");
    if (readDenial) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Không có quyền xem hồ sơ đạo đức." });
    const ethicsActions = (list: AnyRecord[] | string[]) => list.filter((item: AnyRecord | string) => (typeof item === "string" ? item : item.action).startsWith("ethics-dossier."));
    const base = { contextVersion: projectContextVersion(project), allowedActions: ethicsActions(capability.allowedActions), blockedActions: ethicsActions(capability.blockedActions) };
    const dossier = await tx.ethicsDossier.findUnique({ where: { projectId }, include: { applicant: { select: { id: true, displayName: true } }, hostOrganizationUnit: { select: { id: true, code: true, name: true } }, submittedBy: { select: { id: true, displayName: true } }, submissions: { orderBy: { version: "desc" } } } });
    if (!dossier) return { ...base, dossier: null };
    const files = await this.activeFiles(tx, dossier.id);
    const editable = dossier.status === ETHICS_DOSSIER_DRAFT && base.allowedActions.includes("ethics-dossier.edit");
    return {
      ...base,
      dossier: {
        id: dossier.id, projectId: dossier.projectId, status: dossier.status, version: dossier.version, sections: dossier.sections, sourceContext: dossier.sourceContext,
        applicant: dossier.applicant, hostOrganizationUnit: dossier.hostOrganizationUnit, createdAt: dossier.createdAt.toISOString(),
        submittedAt: dossier.submittedAt?.toISOString() ?? null, submittedBy: dossier.submittedBy ?? null,
        readOnly: !editable,
        readiness: ethicsDossierReadiness(dossier.sections, files),
        files: files.map((file: AnyRecord) => ({ id: file.id, filePurpose: file.filePurpose, version: file.version, fileName: file.originalFileName, mimeType: file.mimeType, sizeBytes: file.sizeBytes, uploadedById: file.uploadedById, createdAt: file.createdAt.toISOString(), canDelete: editable })),
        submissions: dossier.submissions.map((row: AnyRecord) => ({ id: row.id, version: row.version, actorId: row.actorId, submittedAt: row.submittedAt.toISOString(), snapshot: row.snapshot }))
      }
    };
  }
}
