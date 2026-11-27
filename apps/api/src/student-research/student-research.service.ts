import { randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../auth/audit-log.service.js";
import { AuthRateLimitService } from "../auth/auth-rate-limit.service.js";
import type { SafeUserContext } from "../auth/auth.types.js";
import { MinioObjectStorageService } from "../infrastructure/minio/minio-object-storage.service.js";
import { PrismaService } from "../infrastructure/prisma/prisma.service.js";
import { assertValidUpload, defaultFileConfig, readMaxUploadBytes } from "../modules/files/file-validation.js";
import { MailService } from "../notifications/mail.service.js";
import { readTransactionClockV1 } from "../permissions/authorization-v1.service.js";
import { isResearchBoardHead, isResearchManagementHead, isResearchManagementStaff } from "../proposals-shared/proposal-access.js";
import { runProposalMutation } from "../proposals-shared/proposal-mutation.js";
import { AWARD_EVIDENCE_PURPOSE, type CreateTopicDto, type DocumentPurpose, type PeriodDto, type StudentProfileDto, type TopicDto, type TopicFilePurpose, type UpdatePeriodDto } from "./student-research.dto.js";

export type StudentResearchUpload = { originalname: string; mimetype: string; size: number; buffer: Buffer };

const PERIOD_ENTITY = "student_research_period";
const TOPIC_ENTITY = "student_research_topic";
const DOCUMENT_EXTENSIONS = [".doc", ".docx", ".pdf"];
const EVIDENCE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];
const STATUS = { pending: "pending_approval", approved: "approved", rejected: "rejected", closed: "closed" } as const;
const PERSON_SELECT = { id: true, displayName: true, username: true, studentProfile: { select: { studentCode: true, className: true } } } as const;
const TOPIC_INCLUDE = { period: true, leader: { select: PERSON_SELECT }, members: { include: { user: { select: PERSON_SELECT } }, orderBy: { createdAt: "asc" } } } as const;

type Period = { id: string; year: number; title: string; submissionDeadline: Date; maxMembers: number; responsibleOfficerUserId: string };
type Person = { id: string; displayName: string; username: string | null; studentProfile?: { studentCode: string; className: string } | null };
type Member = { id: string; userId: string | null; invitedEmail: string | null; user: Person | null };
type Topic = {
  id: string; periodId: string; title: string; summary: string | null; advisorName: string; advisorUnit: string; leaderUserId: string; status: string;
  rejectionReason: string | null; deadlineOverride: Date | null; score: unknown; award: string | null; closedAt: Date | null;
  period: Period; leader: Person; members: Member[];
};
type FileRow = { id: string; relatedEntityId: string; filePurpose: string; originalFileName: string; version: number; sizeBytes: number; createdAt: Date };

const isStudent = (actor: SafeUserContext) => actor.systemRole === "STUDENT_USER";
const isStaff = (actor: SafeUserContext) => isResearchManagementHead(actor) || isResearchBoardHead(actor) || isResearchManagementStaff(actor);
const isOfficer = (actor: SafeUserContext, period: Period) => isResearchManagementStaff(actor) && period.responsibleOfficerUserId === actor.id;
/** TP, TB và CV phụ trách đợt: xem mọi đề tài của đợt, đổi hạn. Chỉ CV phụ trách được duyệt, chấm và đóng. */
const canManage = (actor: SafeUserContext, period: Period) => isResearchManagementHead(actor) || isResearchBoardHead(actor) || isOfficer(actor, period);
const effectiveDeadline = (topic: Topic) => topic.deadlineOverride ?? topic.period.submissionDeadline;

// Thư mời đi tới địa chỉ bất kỳ: mỗi Trưởng nhóm tối đa 5 thư trong 15 phút.
const invitationLimit = new AuthRateLimitService();

const PROFILE_INCOMPLETE = { code: "STUDENT_PROFILE_INCOMPLETE", message: "Hãy hoàn thiện hồ sơ sinh viên (mã sinh viên, lớp, số điện thoại, điểm tổng kết) trước khi đăng ký hoặc tham gia đề tài." };

function forbid(message: string): never {
  throw new ForbiddenException({ message });
}

@Injectable()
export class StudentResearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly storage: MinioObjectStorageService = new MinioObjectStorageService(),
    private readonly mailService?: MailService
  ) {}

  /** Hàng StudentProfile chỉ tồn tại khi đã nhập đủ bốn trường nên có hàng = hồ sơ đầy đủ. */
  async getProfile(actor: SafeUserContext) {
    if (!isStudent(actor)) forbid("Chỉ tài khoản Sinh viên có hồ sơ sinh viên.");
    const [user, profile] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: actor.id }, select: { displayName: true, unit: true } }),
      this.prisma.studentProfile.findUnique({ where: { userId: actor.id } })
    ]);
    return {
      fullName: user?.displayName ?? actor.displayName, unit: user?.unit ?? "", complete: Boolean(profile),
      studentCode: profile?.studentCode ?? "", className: profile?.className ?? "", phone: profile?.phone ?? "",
      previousSemesterScore: profile ? Number(profile.previousSemesterScore) : null
    };
  }

  async saveProfile(actor: SafeUserContext, input: StudentProfileDto) {
    if (!isStudent(actor)) forbid("Chỉ tài khoản Sinh viên có hồ sơ sinh viên.");
    await this.mutate(actor, "Mã sinh viên đã được sử dụng.", async (tx, current) => {
      const scope = await tx.userOrganizationScope.findFirst({ where: { userId: current.id, isPrimary: true } });
      if (!scope) throw new BadRequestException({ message: "Tài khoản chưa có Hệ quản lý." });
      const saved = await tx.studentProfile.upsert({ where: { userId: current.id }, create: { ...input, userId: current.id, organizationUnitId: scope.organizationUnitId }, update: input });
      await this.audit(tx, current, "update-student-profile", "student-profile", saved.id, { studentCode: input.studentCode });
    });
    return this.getProfile(actor);
  }

  async overview(actor: SafeUserContext) {
    const student = isStudent(actor);
    if (!student && !isStaff(actor)) forbid("Bạn không có quyền xem Sinh viên NCKH.");
    const periods = (await this.prisma.studentResearchPeriod.findMany({ orderBy: { year: "desc" }, include: { responsibleOfficer: { select: { id: true, displayName: true } } } })) as Array<Period & { responsibleOfficer: { id: string; displayName: string } }>;
    const topics = (await this.prisma.studentResearchTopic.findMany({
      where: student ? { members: { some: { userId: actor.id } } } : { periodId: { in: periods.filter((period) => canManage(actor, period)).map((period) => period.id) } },
      include: TOPIC_INCLUDE,
      orderBy: { createdAt: "asc" }
    })) as unknown as Topic[];
    const files = (await this.prisma.fileRecord.findMany({
      where: { status: "active", deletedAt: null, OR: [{ relatedEntityType: PERIOD_ENTITY, relatedEntityId: { in: periods.map((period) => period.id) } }, { relatedEntityType: TOPIC_ENTITY, relatedEntityId: { in: topics.map((topic) => topic.id) } }] },
      orderBy: { createdAt: "asc" }
    })) as FileRow[];
    const filesOf = (id: string) => files.filter((file) => file.relatedEntityId === id).map((file) => ({ id: file.id, purpose: file.filePurpose, fileName: file.originalFileName, version: file.version, sizeBytes: file.sizeBytes, uploadedAt: file.createdAt.toISOString() }));
    const now = new Date();
    return {
      profileComplete: student ? Boolean(await this.prisma.studentProfile.findUnique({ where: { userId: actor.id }, select: { id: true } })) : true,
      canCreatePeriod: isResearchManagementStaff(actor),
      canChooseOfficer: isResearchManagementHead(actor),
      periods: periods.map((period) => ({
        id: period.id, year: period.year, title: period.title, submissionDeadline: period.submissionDeadline.toISOString(), maxMembers: period.maxMembers,
        responsibleOfficer: period.responsibleOfficer, templates: filesOf(period.id),
        canManage: !student && canManage(actor, period), canEdit: isOfficer(actor, period),
        canRegister: student && now <= period.submissionDeadline && !topics.some((topic) => topic.periodId === period.id)
      })),
      topics: topics.map((topic) => this.toTopic(actor, topic, filesOf(topic.id), now))
    };
  }

  private toTopic(actor: SafeUserContext, topic: Topic, files: unknown[], now: Date) {
    const leader = topic.leaderUserId === actor.id;
    const open = now <= effectiveDeadline(topic);
    const editable = leader && open && (topic.status === STATUS.pending || topic.status === STATUS.rejected);
    const officer = isOfficer(actor, topic.period);
    const person = (user: Person) => ({ id: user.id, displayName: user.displayName, username: user.username, studentCode: user.studentProfile?.studentCode ?? null, className: user.studentProfile?.className ?? null });
    return {
      id: topic.id, periodId: topic.periodId, year: topic.period.year, title: topic.title, summary: topic.summary, advisorName: topic.advisorName, advisorUnit: topic.advisorUnit,
      status: topic.status, rejectionReason: topic.rejectionReason, deadline: effectiveDeadline(topic).toISOString(), deadlineOverride: topic.deadlineOverride?.toISOString() ?? null, locked: !open,
      score: topic.score === null ? null : Number(topic.score), award: topic.award, closedAt: topic.closedAt?.toISOString() ?? null,
      leader: person(topic.leader),
      members: topic.members.map((member) => ({ id: member.id, isLeader: member.userId === topic.leaderUserId, canLeave: !leader && member.userId === actor.id && topic.status !== STATUS.closed, invitedEmail: member.invitedEmail, user: member.user ? person(member.user) : null })),
      files,
      capabilities: {
        canEdit: editable, canManageMembers: editable,
        canUploadRegistrationForm: leader && open && topic.status !== STATUS.closed,
        canUploadReports: leader && open && topic.status === STATUS.approved,
        canUploadEvidence: (leader || officer) && topic.status === STATUS.closed && Boolean(topic.award),
        canDecide: officer && topic.status === STATUS.pending,
        canClose: officer && topic.status === STATUS.approved,
        canChangeDeadline: canManage(actor, topic.period) && topic.status !== STATUS.closed
      }
    };
  }

  /** Mọi thay đổi chạy trong giao dịch Serializable; tệp đã đưa lên MinIO bị xoá nếu giao dịch thất bại. */
  private async mutate<T>(actor: SafeUserContext, conflictMessage: string, work: (tx: PrismaService, actor: SafeUserContext, uploadedKeys: string[]) => Promise<T>): Promise<T> {
    const uploadedKeys: string[] = [];
    try {
      return await runProposalMutation(this.prisma, actor, null, undefined, (tx, currentActor) => work(tx, currentActor, uploadedKeys));
    } catch (error) {
      await Promise.allSettled(uploadedKeys.map((key) => this.storage.deleteObject(key)));
      if ((error as { code?: string }).code === "P2002") throw new ConflictException({ message: conflictMessage });
      throw error;
    }
  }

  private async lockPeriod(tx: PrismaService, periodId: string) {
    await tx.$queryRaw`SELECT id FROM student_research_periods WHERE id = ${periodId} FOR UPDATE`;
    const period = (await tx.studentResearchPeriod.findUnique({ where: { id: periodId } })) as Period | null;
    if (!period) throw new NotFoundException({ message: "Không tìm thấy đợt Sinh viên NCKH." });
    return period;
  }

  private async lockTopic(tx: PrismaService, topicId: string) {
    await tx.$queryRaw`SELECT id FROM student_research_topics WHERE id = ${topicId} FOR UPDATE`;
    const topic = (await tx.studentResearchTopic.findUnique({ where: { id: topicId }, include: TOPIC_INCLUDE })) as unknown as Topic | null;
    if (!topic) throw new NotFoundException({ message: "Không tìm thấy đề tài." });
    return topic;
  }

  /** Đề tài do Trưởng nhóm sửa: còn trong hạn và ở trạng thái chờ duyệt hoặc bị từ chối. */
  private async lockEditableTopic(tx: PrismaService, actor: SafeUserContext, topicId: string) {
    const topic = await this.lockTopic(tx, topicId);
    await this.assertEditable(tx, actor, topic);
    return topic;
  }

  private async assertEditable(tx: PrismaService, actor: SafeUserContext, topic: Topic) {
    if (topic.leaderUserId !== actor.id) forbid("Chỉ Trưởng nhóm được thay đổi đề tài.");
    if (topic.status !== STATUS.pending && topic.status !== STATUS.rejected) throw new ConflictException({ message: "Đề tài đã được duyệt nên không sửa được thông tin đăng ký và thành viên." });
    await this.assertBeforeDeadline(tx, effectiveDeadline(topic));
  }

  private async assertBeforeDeadline(tx: PrismaService, deadline: Date) {
    if ((await readTransactionClockV1(tx)) > deadline) throw new ConflictException({ code: "DEADLINE_PASSED", message: "Đã quá hạn cuối. Liên hệ chuyên viên phụ trách để được mở khoá." });
  }

  private async storeFile(tx: PrismaService, actor: SafeUserContext, uploadedKeys: string[], entity: { type: string; id: string }, purpose: string, file: StudentResearchUpload | undefined, extensions: string[], replace: boolean) {
    if (!file) throw new BadRequestException({ message: "Chưa chọn tệp tải lên." });
    const config = defaultFileConfig();
    assertValidUpload({ fileName: file.originalname, mimeType: file.mimetype, sizeBytes: file.size, content: file.buffer }, { ...config, allowedExtensions: extensions, maxFileSizeBytes: await readMaxUploadBytes(tx, config.maxFileSizeBytes) });
    const where = { relatedEntityType: entity.type, relatedEntityId: entity.id, documentType: purpose };
    const latest = await tx.fileRecord.findFirst({ where, orderBy: { version: "desc" }, select: { version: true } });
    // Thay tệp: bản cũ giữ lại ở trạng thái đã xoá để còn lịch sử phiên bản.
    if (replace) await tx.fileRecord.updateMany({ where: { ...where, status: "active" }, data: { status: "deleted", deletedAt: new Date() } });
    const id = randomUUID();
    const objectKey = `student-research/${entity.id}/${id}`;
    await this.storage.putObject({ objectKey, content: file.buffer, mimeType: file.mimetype, sizeBytes: file.size });
    uploadedKeys.push(objectKey);
    await tx.fileRecord.create({ data: {
      id, relatedEntityType: entity.type, relatedEntityId: entity.id, filePurpose: purpose, documentType: purpose, version: (latest?.version ?? 0) + 1,
      originalFileName: file.originalname, mimeType: file.mimetype, sizeBytes: file.size,
      storageBucket: config.bucketName ?? "rtms-files", storageObjectKey: objectKey, uploadedById: actor.id, status: "active"
    } });
    return id;
  }

  private audit(tx: PrismaService, actor: SafeUserContext, action: string, targetEntity: string, targetEntityId: string, afterFacts?: Record<string, unknown>, reason?: string) {
    return new AuditLogService(tx).record({ action, result: "success", actorId: actor.id, targetEntity, targetEntityId, username: actor.username, afterFacts, reason } as never);
  }

  // ---- Đợt ----

  async officerCandidates(actor: SafeUserContext) {
    if (!isResearchManagementHead(actor)) forbid("Chỉ trưởng phòng được chọn chuyên viên phụ trách đợt.");
    return this.prisma.user.findMany({ where: { status: "active", systemRole: "RESEARCH_MANAGEMENT_STAFF" }, select: { id: true, displayName: true }, orderBy: { displayName: "asc" } });
  }

  async createPeriod(actor: SafeUserContext, input: PeriodDto) {
    return this.mutate(actor, "Năm này đã có đợt Sinh viên NCKH.", async (tx, current) => {
      if (!isResearchManagementStaff(current)) forbid("Chỉ chuyên viên được lập đợt Sinh viên NCKH.");
      // CV lập đợt là CV phụ trách; TP có thể giao lại.
      const period = await tx.studentResearchPeriod.create({ data: { ...input, responsibleOfficerUserId: current.id, responsibleOfficerAssignedById: current.id } });
      await this.audit(tx, current, "create-student-research-period", "student-research-period", period.id, { year: input.year, maxMembers: input.maxMembers, submissionDeadline: input.submissionDeadline.toISOString() });
      return { id: period.id };
    });
  }

  async updatePeriod(actor: SafeUserContext, periodId: string, input: UpdatePeriodDto) {
    return this.mutate(actor, "Không cập nhật được đợt.", async (tx, current) => {
      const period = await this.lockPeriod(tx, periodId);
      if (!canManage(current, period)) forbid("Bạn không phụ trách đợt này.");
      const { responsibleOfficerUserId, title, maxMembers, submissionDeadline } = input;
      // TP/TB chỉ đổi hạn; tên đợt và số thành viên do CV phụ trách quản lý.
      if ((title !== undefined || maxMembers !== undefined) && !isOfficer(current, period)) forbid("Chỉ chuyên viên phụ trách được sửa thông tin đợt.");
      const officer: Record<string, unknown> = {};
      if (responsibleOfficerUserId !== undefined && responsibleOfficerUserId !== period.responsibleOfficerUserId) {
        if (!isResearchManagementHead(current)) forbid("Chỉ trưởng phòng được chọn chuyên viên phụ trách đợt.");
        if (!(await tx.user.findFirst({ where: { id: responsibleOfficerUserId, status: "active", systemRole: "RESEARCH_MANAGEMENT_STAFF" } }))) throw new BadRequestException({ message: "Chuyên viên phụ trách không hợp lệ." });
        Object.assign(officer, { responsibleOfficerUserId, responsibleOfficerAssignedById: current.id, responsibleOfficerAssignedAt: new Date() });
      }
      await tx.studentResearchPeriod.update({ where: { id: periodId }, data: { title, maxMembers, submissionDeadline, ...officer } });
      await this.audit(tx, current, "update-student-research-period", "student-research-period", periodId, { title, maxMembers, submissionDeadline: submissionDeadline?.toISOString(), ...officer });
      return { id: periodId };
    });
  }

  async uploadTemplate(actor: SafeUserContext, periodId: string, purpose: DocumentPurpose, file?: StudentResearchUpload) {
    return this.mutate(actor, "Không tải được văn bản mẫu.", async (tx, current, keys) => {
      const period = await this.lockPeriod(tx, periodId);
      if (!isOfficer(current, period)) forbid("Chỉ chuyên viên phụ trách được tải văn bản mẫu của đợt.");
      const id = await this.storeFile(tx, current, keys, { type: PERIOD_ENTITY, id: periodId }, purpose, file, DOCUMENT_EXTENSIONS, true);
      await this.audit(tx, current, "upload-student-research-template", "file-record", id, { periodId, purpose });
      return { id };
    });
  }

  // ---- Đề tài ----

  async createTopic(actor: SafeUserContext, input: CreateTopicDto, file?: StudentResearchUpload) {
    return this.mutate(actor, "Bạn đã tham gia một đề tài trong đợt này.", async (tx, current, keys) => {
      if (!isStudent(current)) forbid("Chỉ tài khoản Sinh viên được đăng ký đề tài.");
      if (!(await tx.studentProfile.findUnique({ where: { userId: current.id }, select: { id: true } }))) throw new ConflictException(PROFILE_INCOMPLETE);
      const { periodId, ...fields } = input;
      const period = await this.lockPeriod(tx, periodId);
      await this.assertBeforeDeadline(tx, period.submissionDeadline);
      const topic = await tx.studentResearchTopic.create({ data: { ...fields, periodId, leaderUserId: current.id, members: { create: { periodId, userId: current.id } } } });
      await this.storeFile(tx, current, keys, { type: TOPIC_ENTITY, id: topic.id }, "REGISTRATION_FORM", file, DOCUMENT_EXTENSIONS, true);
      await this.audit(tx, current, "create-student-research-topic", "student-research-topic", topic.id, { periodId, title: fields.title });
      return { id: topic.id };
    });
  }

  /** Sửa đề tài bị từ chối cũng là gửi lại cho CV duyệt. */
  async updateTopic(actor: SafeUserContext, topicId: string, input: TopicDto) {
    return this.mutate(actor, "Không cập nhật được đề tài.", async (tx, current) => {
      const topic = await this.lockEditableTopic(tx, current, topicId);
      await tx.studentResearchTopic.update({ where: { id: topicId }, data: { ...input, status: STATUS.pending, rejectionReason: null } });
      await this.audit(tx, current, topic.status === STATUS.rejected ? "resubmit-student-research-topic" : "update-student-research-topic", "student-research-topic", topicId, { title: input.title });
      return { id: topicId };
    });
  }

  async addMember(actor: SafeUserContext, topicId: string, identifier: string) {
    const byEmail = identifier.includes("@");
    const limitKey = `student-research-invite:${actor.id}`;
    if (byEmail) invitationLimit.assertCanAttempt(limitKey, Date.now(), "Bạn đã gửi quá nhiều lời mời. Vui lòng thử lại sau 15 phút.");
    const result = await this.mutate(actor, "Sinh viên này đã tham gia hoặc đã được mời vào một đề tài trong đợt.", async (tx, current) => {
      const topic = await this.lockEditableTopic(tx, current, topicId);
      if (topic.members.length >= topic.period.maxMembers) throw new ConflictException({ message: `Nhóm đã đủ ${topic.period.maxMembers} thành viên (tính cả Trưởng nhóm và lời mời).` });
      const user = await tx.user.findFirst({ where: byEmail ? { credentialEmail: identifier } : { usernameKey: identifier }, select: { id: true, status: true, systemRole: true } });
      // Email chưa có tài khoản (hoặc tài khoản sinh viên chưa xác minh email): mời, tự vào nhóm khi kích hoạt.
      const invite = byEmail && (!user || (user.systemRole === "STUDENT_USER" && user.status === "pending_email_verification"));
      if (!invite && !user) throw new NotFoundException({ message: "Không tìm thấy sinh viên có tên đăng nhập này." });
      if (!invite && (user!.systemRole !== "STUDENT_USER" || user!.status !== "active")) throw new BadRequestException({ message: "Chỉ thêm được tài khoản Sinh viên đang hoạt động." });
      if (!invite && !(await tx.studentProfile.findUnique({ where: { userId: user!.id }, select: { id: true } }))) throw new ConflictException({ ...PROFILE_INCOMPLETE, message: "Sinh viên này chưa hoàn thiện hồ sơ sinh viên nên chưa thêm vào nhóm được." });
      const member = await tx.studentResearchTopicMember.create({ data: { topicId, periodId: topic.periodId, ...(invite ? { invitedEmail: identifier } : { userId: user!.id }) } });
      await this.audit(tx, current, invite ? "invite-student-research-member" : "add-student-research-member", "student-research-topic", topicId, { memberId: member.id });
      return { id: member.id, invite, title: topic.title, leaderName: topic.leader.displayName };
    });
    if (result.invite) invitationLimit.recordFailure(limitKey);
    if (result.invite) await this.sendInvitation(identifier, result.leaderName, result.title);
    return { id: result.id, invited: result.invite };
  }

  /** Best effort: lời mời đã lưu; gửi mail lỗi thì Trưởng nhóm vẫn thấy trạng thái "đã mời" và tự báo cho thành viên. */
  private async sendInvitation(email: string, leaderName: string, title: string) {
    try {
      const registerUrl = new URL("/register", this.mailService!.configuration().loginUrl).toString();
      await this.mailService!.sendText({
        to: email,
        subject: "Lời mời tham gia đề tài Sinh viên NCKH",
        text: `Xin chào,\n\n${leaderName} mời bạn tham gia đề tài nghiên cứu khoa học sinh viên "${title}".\nHãy đăng ký tài khoản loại Sinh viên bằng đúng địa chỉ email này tại ${registerUrl}; sau khi kích hoạt, bạn sẽ tự động vào nhóm.`
      });
    } catch { /* xem ghi chú trên */ }
  }

  async removeMember(actor: SafeUserContext, topicId: string, memberId: string) {
    return this.mutate(actor, "Không xoá được thành viên.", async (tx, current) => {
      const topic = await this.lockTopic(tx, topicId);
      const member = topic.members.find((item) => item.id === memberId);
      // Thành viên tự rời nhóm bất kỳ lúc nào trước khi đề tài đóng (kể cả khi bị thêm vào ngoài ý muốn); còn lại do Trưởng nhóm.
      if (member?.userId && member.userId === current.id && member.userId !== topic.leaderUserId) {
        if (topic.status === STATUS.closed) throw new ConflictException({ message: "Đề tài đã đóng." });
      } else await this.assertEditable(tx, current, topic);
      if (!member) throw new NotFoundException({ message: "Không tìm thấy thành viên." });
      if (member.userId === topic.leaderUserId) throw new BadRequestException({ message: "Không xoá được Trưởng nhóm." });
      await tx.studentResearchTopicMember.delete({ where: { id: memberId } });
      await this.audit(tx, current, "remove-student-research-member", "student-research-topic", topicId, { memberId });
      return { ok: true };
    });
  }

  async decide(actor: SafeUserContext, topicId: string, decision: { approve: true } | { approve: false; reason: string }) {
    return this.mutate(actor, "Không cập nhật được đề tài.", async (tx, current) => {
      const topic = await this.lockTopic(tx, topicId);
      if (!isOfficer(current, topic.period)) forbid("Chỉ chuyên viên phụ trách đợt được duyệt đăng ký đề tài.");
      if (topic.status !== STATUS.pending) throw new ConflictException({ message: "Đề tài không ở trạng thái chờ duyệt." });
      const reason = decision.approve ? null : decision.reason;
      await tx.studentResearchTopic.update({ where: { id: topicId }, data: { status: decision.approve ? STATUS.approved : STATUS.rejected, rejectionReason: reason } });
      await this.audit(tx, current, decision.approve ? "approve-student-research-topic" : "reject-student-research-topic", "student-research-topic", topicId, undefined, reason ?? undefined);
      return { id: topicId };
    });
  }

  /** Mở khoá cho riêng một đề tài bằng hạn riêng; null = quay về hạn chung của đợt. */
  async setTopicDeadline(actor: SafeUserContext, topicId: string, deadlineOverride: Date | null) {
    return this.mutate(actor, "Không cập nhật được hạn.", async (tx, current) => {
      const topic = await this.lockTopic(tx, topicId);
      if (!canManage(current, topic.period)) forbid("Bạn không có quyền đổi hạn của đề tài này.");
      if (topic.status === STATUS.closed) throw new ConflictException({ message: "Đề tài đã đóng." });
      await tx.studentResearchTopic.update({ where: { id: topicId }, data: { deadlineOverride } });
      await this.audit(tx, current, "set-student-research-topic-deadline", "student-research-topic", topicId, { deadlineOverride: deadlineOverride?.toISOString() ?? null });
      return { id: topicId };
    });
  }

  async closeTopic(actor: SafeUserContext, topicId: string, input: { score: number; award: string | null }) {
    return this.mutate(actor, "Không đóng được đề tài.", async (tx, current) => {
      const topic = await this.lockTopic(tx, topicId);
      if (!isOfficer(current, topic.period)) forbid("Chỉ chuyên viên phụ trách đợt được chấm điểm và đóng đề tài.");
      if (topic.status !== STATUS.approved) throw new ConflictException({ message: "Chỉ đóng được đề tài đã duyệt và chưa đóng." });
      await tx.studentResearchTopic.update({ where: { id: topicId }, data: { ...input, status: STATUS.closed, closedAt: new Date(), closedById: current.id } });
      await this.audit(tx, current, "close-student-research-topic", "student-research-topic", topicId, input);
      return { id: topicId };
    });
  }

  async uploadTopicFile(actor: SafeUserContext, topicId: string, purpose: TopicFilePurpose, file?: StudentResearchUpload) {
    return this.mutate(actor, "Không tải được tệp.", async (tx, current, keys) => {
      const topic = await this.lockTopic(tx, topicId);
      const leader = topic.leaderUserId === current.id;
      const evidence = purpose === AWARD_EVIDENCE_PURPOSE;
      if (evidence) {
        if (!leader && !isOfficer(current, topic.period)) forbid("Chỉ Trưởng nhóm hoặc chuyên viên phụ trách được tải minh chứng.");
        if (topic.status !== STATUS.closed || !topic.award) throw new ConflictException({ message: "Chỉ tải minh chứng khi đề tài đã đóng và có giải." });
      } else {
        if (!leader) forbid("Chỉ Trưởng nhóm được tải tài liệu của nhóm.");
        if (topic.status === STATUS.closed) throw new ConflictException({ message: "Đề tài đã đóng." });
        if (purpose !== "REGISTRATION_FORM" && topic.status !== STATUS.approved) throw new ConflictException({ message: "Đề tài cần được duyệt trước khi nộp báo cáo." });
        await this.assertBeforeDeadline(tx, effectiveDeadline(topic));
      }
      const id = await this.storeFile(tx, current, keys, { type: TOPIC_ENTITY, id: topicId }, purpose, file, evidence ? EVIDENCE_EXTENSIONS : DOCUMENT_EXTENSIONS, !evidence);
      await this.audit(tx, current, "upload-student-research-file", "file-record", id, { topicId, purpose });
      return { id };
    });
  }

  // ---- Tải tệp ----

  /** Văn bản mẫu: mọi tài khoản dùng phân hệ. Tài liệu đề tài: thành viên nhóm, TP/TB và CV phụ trách. */
  async download(actor: SafeUserContext, fileId: string) {
    const notFound = () => new NotFoundException({ message: "Không tìm thấy tệp." });
    const file = await this.prisma.fileRecord.findFirst({ where: { id: fileId, relatedEntityType: { in: [PERIOD_ENTITY, TOPIC_ENTITY] }, status: "active", deletedAt: null } });
    if (!file || (!isStudent(actor) && !isStaff(actor))) throw notFound();
    if (file.relatedEntityType === TOPIC_ENTITY) {
      const topic = (await this.prisma.studentResearchTopic.findUnique({ where: { id: file.relatedEntityId }, include: TOPIC_INCLUDE })) as unknown as Topic | null;
      if (!topic || !(topic.members.some((member) => member.userId === actor.id) || (isStaff(actor) && canManage(actor, topic.period)))) throw notFound();
    }
    return { content: await this.storage.getObject(file.storageObjectKey), fileName: file.originalFileName, mimeType: file.mimeType };
  }
}
