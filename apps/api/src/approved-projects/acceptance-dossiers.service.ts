import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { notifyUsers } from "../notifications/notification-events.js";
import { readTransactionClockV1 } from "../permissions/authorization-v1.service.js";
import { ACCEPTANCE_DOSSIER_ENTITY_TYPE } from "../modules/files/files.dto.js";
import { ApprovedProjectsService } from "./approved-projects.service.js";
import { ethicsCapabilityError as capabilityError } from "./ethics-dossiers.service.js";
import { PROJECT_STATUSES, projectContextVersion, TERMINAL_REQUEST_STATUSES } from "./project-capability-v1.js";

type AnyRecord = Record<string, any>;

export const ACCEPTANCE_DOSSIER_DRAFT = "draft";
export const ACCEPTANCE_DOSSIER_SUBMITTED = "submitted";
export const ACCEPTANCE_REQUIRED_FILES = ["ACCEPTANCE_FINAL_REPORT", "ACCEPTANCE_PRODUCT_EVIDENCE"];
export const ACCEPTANCE_CONTRIBUTION = "ACCEPTANCE_CONTRIBUTION";
export const ACCEPTANCE_FILE_PURPOSES = [...ACCEPTANCE_REQUIRED_FILES, "ACCEPTANCE_OTHER", ACCEPTANCE_CONTRIBUTION];
export const ACCEPTANCE_SECTIONS = ["results", "products", "summary", "milestoneNotes"] as const;
type AcceptanceSection = (typeof ACCEPTANCE_SECTIONS)[number];
const TEXT_MAX = 20000;
const PRODUCTS_MAX = 100;

const EMPTY_SECTIONS = { results: "", products: [], summary: "", milestoneNotes: {} };

function invalid(field: string): never { throw new BadRequestException({ code: "SECTION_INVALID", message: `${field} không hợp lệ.` }); }
function text(value: unknown, field: string, max = TEXT_MAX) {
  if (typeof value !== "string" || value.length > max) invalid(field);
  return value as string;
}
function plainObject(value: unknown, field: string): AnyRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(field);
  return value as AnyRecord;
}

/** Mỗi lần thay nguyên một mục; khóa `milestoneNotes` phải là id mốc của chính đề tài. */
export function readAcceptanceSection(section: unknown, value: unknown, milestoneIds: string[]): { section: AcceptanceSection; value: unknown } {
  if (!ACCEPTANCE_SECTIONS.includes(section as AcceptanceSection)) invalid("Mục hồ sơ");
  const key = section as AcceptanceSection;
  if (key === "products") {
    if (!Array.isArray(value) || value.length > PRODUCTS_MAX) invalid("Danh sách sản phẩm");
    return { section: key, value: (value as unknown[]).map((item) => {
      const product = plainObject(item, "Sản phẩm");
      if (Object.keys(product).some((field) => !["name", "type", "description"].includes(field))) invalid("Sản phẩm");
      const name = text(product.name, "Tên sản phẩm", 500).trim();
      if (!name) invalid("Tên sản phẩm");
      return { name, type: text(product.type ?? "", "Loại sản phẩm", 200), description: text(product.description ?? "", "Mô tả sản phẩm") };
    }) };
  }
  if (key === "milestoneNotes") {
    const notes = plainObject(value, "Giải trình mốc");
    for (const [id, note] of Object.entries(notes)) {
      if (!milestoneIds.includes(id)) invalid("Mốc giải trình");
      text(note, "Giải trình mốc");
    }
    return { section: key, value: notes };
  }
  return { section: key, value: text(value, "Nội dung mục") };
}

/** Đối chiếu mốc do server tính từ `ProjectMilestone`, kèm giải trình của PI. */
export function milestoneReconciliation(project: AnyRecord, sections: AnyRecord) {
  return (project.milestones ?? []).map((milestone: AnyRecord) => ({
    milestoneId: milestone.id, title: milestone.title, dueDate: milestone.dueDate?.toISOString?.().slice(0, 10) ?? null, status: milestone.status, note: sections.milestoneNotes?.[milestone.id] ?? null
  }));
}

/** Readiness theo mục (Story 6.8): mục nội dung, giải trình mốc chưa xong, tệp bắt buộc, yêu cầu/báo cáo đang mở. */
export function acceptanceDossierReadiness(project: AnyRecord, sections: AnyRecord, files: Array<{ filePurpose: string }>) {
  const filled = (value: unknown) => typeof value === "string" && value.trim().length > 0;
  const missingSections = [!filled(sections.results) && "results", !(sections.products?.length > 0) && "products", !filled(sections.summary) && "summary"].filter(Boolean) as string[];
  const missingMilestoneNotes = (project.milestones ?? []).filter((milestone: AnyRecord) => milestone.status !== "completed" && !filled(sections.milestoneNotes?.[milestone.id])).map((milestone: AnyRecord) => milestone.id);
  const present = new Set(files.map((file) => file.filePurpose));
  const missingFiles = ACCEPTANCE_REQUIRED_FILES.filter((code) => !present.has(code));
  const openRequests = (project.requests ?? []).filter((request: AnyRecord) => !TERMINAL_REQUEST_STATUSES.includes(request.status)).map((request: AnyRecord) => request.id);
  const pendingReports = (project.reports ?? []).filter((report: AnyRecord) => ["submitted", "under_review"].includes(report.status)).map((report: AnyRecord) => report.id);
  const ready = ![missingSections, missingMilestoneNotes, missingFiles, openRequests, pendingReports].some((list) => list.length);
  return { ready, missingSections, missingMilestoneNotes, missingFiles, openRequests, pendingReports };
}

@Injectable()
export class AcceptanceDossiersService {
  constructor(private readonly prisma: PrismaService, private readonly projects: ApprovedProjectsService) {}

  async getDossier(actor: SafeUserContext, projectId: string) {
    return this.view(this.prisma, actor, projectId);
  }

  async createDossier(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.projects.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      await this.authorizeMutation(tx, currentActor, project, "acceptance-dossier.create");
      const dossier = await tx.acceptanceDossier.create({ data: {
        projectId: project.id, status: ACCEPTANCE_DOSSIER_DRAFT, sections: EMPTY_SECTIONS,
        sourceContext: { projectContextVersion: projectContextVersion(project), sourceSubmissionEventId: project.sourceSubmissionEventId, sourceDecisionId: project.sourceDecisionId },
        createdById: currentActor.id
      } });
      await this.bumpContext(tx, project.id);
      const facts = { dossierId: dossier.id, status: dossier.status, version: dossier.version };
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "acceptance-dossier.create", toStatus: ACCEPTANCE_DOSSIER_DRAFT, reason: "Tạo hồ sơ nghiệm thu", afterFacts: facts } });
      await new AuditLogService(tx).record({ action: "create-acceptance-dossier", result: "success", actorId: currentActor.id, targetEntity: "acceptance-dossier", targetEntityId: dossier.id, username: currentActor.username, afterFacts: facts });
      return this.view(tx, currentActor, project.id);
    });
  }

  async updateSection(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.projects.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      await this.authorizeMutation(tx, currentActor, project, "acceptance-dossier.edit");
      const { section, value } = readAcceptanceSection(input.section, input.value, (project.milestones ?? []).map((milestone: AnyRecord) => milestone.id));
      const dossier = await tx.acceptanceDossier.findUnique({ where: { projectId: project.id } });
      const updated = await tx.acceptanceDossier.update({ where: { id: dossier.id }, data: { sections: { ...(dossier.sections as AnyRecord), [section]: value } } });
      await this.bumpContext(tx, project.id);
      await new AuditLogService(tx).record({ action: "edit-acceptance-dossier-section", result: "success", actorId: currentActor.id, targetEntity: "acceptance-dossier", targetEntityId: dossier.id, username: currentActor.username, reason: section, afterFacts: { dossierId: updated.id, status: updated.status, version: updated.version } });
      return this.view(tx, currentActor, project.id);
    });
  }

  async submit(actor: SafeUserContext, projectId: string, input: AnyRecord) {
    return this.projects.mutate(actor, projectId, input.contextVersion, async (tx, currentActor, project) => {
      await this.authorizeMutation(tx, currentActor, project, "acceptance-dossier.submit");
      const dossier = await tx.acceptanceDossier.findUnique({ where: { projectId: project.id } });
      const files = await this.activeFiles(tx, dossier.id);
      const sections = dossier.sections as AnyRecord;
      const { ready, ...missing } = acceptanceDossierReadiness(project, sections, files);
      if (!ready) throw new BadRequestException({ code: "READINESS_INCOMPLETE", message: "Hồ sơ nghiệm thu chưa đủ điều kiện nộp.", ...missing });
      const now = await readTransactionClockV1(tx);
      const snapshot = {
        version: dossier.version, sections, milestones: milestoneReconciliation(project, sections), files: files.map((file: AnyRecord) => ({ id: file.id, filePurpose: file.filePurpose })),
        projectContextVersion: projectContextVersion(project), sourceSubmissionEventId: project.sourceSubmissionEventId, sourceDecisionId: project.sourceDecisionId
      };
      await tx.acceptanceDossier.update({ where: { id: dossier.id }, data: { status: ACCEPTANCE_DOSSIER_SUBMITTED, submittedAt: now, submittedById: currentActor.id } });
      await tx.approvedProject.update({ where: { id: project.id }, data: { status: PROJECT_STATUSES.pendingAcceptance, aggregateVersion: { increment: 1 }, authorizationContextUpdatedAt: now } });
      await tx.acceptanceDossierSubmission.create({ data: { dossierId: dossier.id, version: dossier.version, actorId: currentActor.id, snapshot, submittedAt: now } });
      const facts = { dossierId: dossier.id, status: ACCEPTANCE_DOSSIER_SUBMITTED, version: dossier.version };
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "acceptance-dossier.submit", fromStatus: ACCEPTANCE_DOSSIER_DRAFT, toStatus: ACCEPTANCE_DOSSIER_SUBMITTED, reason: "Nộp hồ sơ nghiệm thu", afterFacts: facts } });
      await tx.projectHistory.create({ data: { projectId: project.id, actorId: currentActor.id, action: "project.acceptance.submit", fromStatus: PROJECT_STATUSES.executing, toStatus: PROJECT_STATUSES.pendingAcceptance, reason: "Nộp hồ sơ nghiệm thu", beforeFacts: { status: PROJECT_STATUSES.executing }, afterFacts: { status: PROJECT_STATUSES.pendingAcceptance, dossierId: dossier.id } } });
      await new AuditLogService(tx).record({ action: "submit-acceptance-dossier", result: "success", actorId: currentActor.id, targetEntity: "acceptance-dossier", targetEntityId: dossier.id, username: currentActor.username, beforeFacts: { status: ACCEPTANCE_DOSSIER_DRAFT, projectStatus: PROJECT_STATUSES.executing }, afterFacts: { ...facts, projectStatus: PROJECT_STATUSES.pendingAcceptance } });
      // CV phụ trách chuẩn bị hội đồng nghiệm thu; đề tài chưa có CV phụ trách thì báo TB đang hoạt động.
      const officer = await this.projects.currentOfficer(tx, project.id);
      const recipients = officer ? [officer.officerUserId] : (await tx.user.findMany({ where: { systemRole: "RESEARCH_BOARD_HEAD", status: "active" }, select: { id: true } })).map((user: AnyRecord) => user.id);
      await notifyUsers(tx, { userIds: recipients, exclude: [currentActor.id], type: "acceptance-dossier.submitted", title: "Hồ sơ nghiệm thu đã được nộp", body: project.title, link: `/projects/${project.id}/acceptance-dossier`, sourceType: "acceptance_dossier", sourceId: dossier.id, idempotencyKey: `acceptance-dossier:${dossier.id}:v${dossier.version}` });
      return this.view(tx, currentActor, project.id);
    });
  }

  /** Thứ tự: quyền → trùng hồ sơ → trạng thái (cùng cách 10.3). */
  private async authorizeMutation(tx: any, actor: SafeUserContext, project: AnyRecord, action: string) {
    const { capability } = await this.projects.loadAuthorized(tx, actor, project.id);
    const denial = capabilityError(capability, action);
    if (denial instanceof ForbiddenException) throw denial;
    if (action === "acceptance-dossier.create" && project.acceptanceDossier) throw new ConflictException({ code: "ACCEPTANCE_DOSSIER_EXISTS", message: "Đề tài đã có hồ sơ nghiệm thu." });
    if (action !== "acceptance-dossier.create" && !project.acceptanceDossier) throw new NotFoundException({ message: "Đề tài chưa có hồ sơ nghiệm thu." });
    if (denial) throw denial;
  }

  private async bumpContext(tx: any, projectId: string) {
    await tx.approvedProject.update({ where: { id: projectId }, data: { aggregateVersion: { increment: 1 }, authorizationContextUpdatedAt: await readTransactionClockV1(tx) } });
  }

  private activeFiles(tx: any, dossierId: string) {
    return tx.fileRecord.findMany({ where: { relatedEntityType: ACCEPTANCE_DOSSIER_ENTITY_TYPE, relatedEntityId: dossierId, status: "active", deletedAt: null }, orderBy: { createdAt: "asc" } });
  }

  private async view(tx: any, actor: SafeUserContext, projectId: string) {
    const { project, capability } = await this.projects.loadAuthorized(tx, actor, projectId, { dossierReader: true });
    if (capabilityError(capability, "acceptance-dossier.read")) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Không có quyền xem hồ sơ nghiệm thu." });
    const own = (list: Array<AnyRecord | string>) => list.filter((item) => (typeof item === "string" ? item : item.action).startsWith("acceptance-dossier."));
    const base = { contextVersion: projectContextVersion(project), projectStatus: project.status, allowedActions: own(capability.allowedActions), blockedActions: own(capability.blockedActions) };
    const dossier = await tx.acceptanceDossier.findUnique({ where: { projectId }, include: { submittedBy: { select: { id: true, displayName: true } }, submissions: { orderBy: { version: "desc" } } } });
    if (!dossier) return { ...base, dossier: null };
    const files = await this.activeFiles(tx, dossier.id);
    const sections = dossier.sections as AnyRecord;
    const editable = dossier.status === ACCEPTANCE_DOSSIER_DRAFT && base.allowedActions.includes("acceptance-dossier.edit");
    // Cùng luật xóa của files.service: PI xóa mọi tệp, người đóng góp chỉ tệp của mình, và chỉ khi còn nháp.
    const contributes = dossier.status === ACCEPTANCE_DOSSIER_DRAFT && base.allowedActions.includes("acceptance-dossier.contribute");
    return {
      ...base,
      dossier: {
        id: dossier.id, projectId: dossier.projectId, status: dossier.status, version: dossier.version, sections, sourceContext: dossier.sourceContext,
        createdAt: dossier.createdAt.toISOString(), submittedAt: dossier.submittedAt?.toISOString() ?? null, submittedBy: dossier.submittedBy ?? null,
        readOnly: !editable,
        milestones: milestoneReconciliation(project, sections),
        readiness: acceptanceDossierReadiness(project, sections, files),
        files: files.map((file: AnyRecord) => ({ id: file.id, filePurpose: file.filePurpose, version: file.version, fileName: file.originalFileName, mimeType: file.mimeType, sizeBytes: file.sizeBytes, uploadedById: file.uploadedById, createdAt: file.createdAt.toISOString(), canDelete: editable || (contributes && file.uploadedById === actor.id) })),
        submissions: dossier.submissions.map((row: AnyRecord) => ({ id: row.id, version: row.version, actorId: row.actorId, submittedAt: row.submittedAt.toISOString(), snapshot: row.snapshot }))
      }
    };
  }
}
