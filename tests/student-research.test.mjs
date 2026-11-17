import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AuditLogService } from "../dist/apps/api/auth/audit-log.service.js";
import { participantPolicyFor } from "../dist/apps/api/proposals-shared/participant-policy.js";
import { isInternalResearcherEligible } from "../dist/apps/api/proposals-shared/proposal-access.js";
import { closeTopicPipe, createPeriodPipe, studentProfilePipe } from "../dist/apps/api/student-research/student-research.dto.js";
import { StudentResearchService } from "../dist/apps/api/student-research/student-research.service.js";
import { fileBytes } from "./helpers/file-bytes.mjs";

const DAY = 24 * 60 * 60 * 1000;
const user = (id, systemRole, extra = {}) => ({ id, username: id, usernameKey: id, displayName: id, status: "active", systemRole, unit: "", credentialEmail: `${id}@hvqy.vn`, organizationScopes: [], ...extra });

// Fake Prisma trong bộ nhớ, chỉ đủ cho các truy vấn của StudentResearchService.
function createWorld() {
  const db = {
    clock: new Date("2026-11-17T03:00:00Z"),
    users: [user("tp", "RESEARCH_MANAGEMENT_HEAD"), user("tb", "RESEARCH_BOARD_HEAD"), user("cv1", "RESEARCH_MANAGEMENT_STAFF"), user("cv2", "RESEARCH_MANAGEMENT_STAFF"), user("ncv", "RESEARCHER_INTERNAL_USER"),
      ...["sv1", "sv2", "sv3", "sv4", "sv5"].map((id) => user(id, "STUDENT_USER"))],
    // sv1–sv4 đã đủ hồ sơ; sv5 vừa đăng ký nên chưa có hồ sơ. Mọi sinh viên đều có Hệ chính.
    studentProfiles: ["sv1", "sv2", "sv3", "sv4"].map((userId) => ({ id: `profile-${userId}`, userId, studentCode: userId.toUpperCase(), className: "DH55A", phone: "0912345678", previousSemesterScore: 8 })),
    scopes: ["sv1", "sv2", "sv3", "sv4", "sv5"].map((userId) => ({ userId, organizationUnitId: "he-1", isPrimary: true })),
    periods: [], topics: [], members: [], files: [], audits: [], sent: []
  };
  let sequence = 0;
  const id = (prefix) => `${prefix}-${++sequence}`;
  const person = (userId) => db.users.find((row) => row.id === userId) ?? null;
  const hydrate = (topic) => topic && { ...topic, period: db.periods.find((period) => period.id === topic.periodId), leader: person(topic.leaderUserId), members: db.members.filter((member) => member.topicId === topic.id).map((member) => ({ ...member, user: person(member.userId) })) };
  const addMember = (data) => {
    if (db.members.some((member) => member.periodId === data.periodId && ((data.userId && member.userId === data.userId) || (data.invitedEmail && member.invitedEmail === data.invitedEmail)))) throw Object.assign(new Error("unique"), { code: "P2002" });
    const member = { id: id("member"), userId: null, invitedEmail: null, ...data };
    db.members.push(member);
    return member;
  };
  const fileMatches = (file, where) => Object.entries(where).every(([key, value]) => key === "OR" ? value.some((clause) => fileMatches(file, clause)) : value && typeof value === "object" && "in" in value ? value.in.includes(file[key]) : file[key] === value);
  const prisma = {
    // Rollback như giao dịch thật để bước lỗi giữa chừng không để lại dữ liệu.
    async $transaction(work) {
      const snapshot = structuredClone({ periods: db.periods, topics: db.topics, members: db.members, files: db.files });
      try { return await work(prisma); } catch (error) { Object.assign(db, snapshot); throw error; }
    },
    async $queryRaw() { return [{ asOf: db.clock }]; },
    systemParameter: { async findUnique() { return null; } },
    auditLog: { async create({ data }) { db.audits.push(data); return { id: id("audit"), ...data, timestamp: db.clock }; } },
    user: {
      async findUnique({ where }) { return person(where.id); },
      async findFirst({ where }) { return db.users.find((row) => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null; },
      async findMany({ where }) { return db.users.filter((row) => Object.entries(where).every(([key, value]) => row[key] === value)); }
    },
    studentProfile: {
      async findUnique({ where }) { return db.studentProfiles.find((profile) => profile.userId === where.userId) ?? null; },
      async upsert({ where, create, update }) {
        if (db.studentProfiles.some((profile) => profile.studentCode === (update.studentCode ?? create.studentCode) && profile.userId !== where.userId)) throw Object.assign(new Error("unique"), { code: "P2002" });
        const existing = db.studentProfiles.find((profile) => profile.userId === where.userId);
        if (existing) return Object.assign(existing, update);
        const row = { id: id("profile"), ...create };
        db.studentProfiles.push(row);
        return row;
      }
    },
    userOrganizationScope: { async findFirst({ where }) { return db.scopes.find((scope) => scope.userId === where.userId && scope.isPrimary === where.isPrimary) ?? null; } },
    studentResearchPeriod: {
      async create({ data }) { if (db.periods.some((period) => period.year === data.year)) throw Object.assign(new Error("unique"), { code: "P2002" }); const period = { id: id("period"), ...data }; db.periods.push(period); return period; },
      async findUnique({ where }) { return db.periods.find((period) => period.id === where.id) ?? null; },
      async findMany() { return db.periods.map((period) => ({ ...period, responsibleOfficer: person(period.responsibleOfficerUserId) })); },
      async update({ where, data }) { return Object.assign(db.periods.find((period) => period.id === where.id), Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))); }
    },
    studentResearchTopic: {
      async create({ data }) {
        const { members, ...columns } = data;
        const topic = { id: id("topic"), status: "pending_approval", rejectionReason: null, deadlineOverride: null, score: null, award: null, closedAt: null, summary: null, ...columns };
        addMember({ topicId: topic.id, ...members.create });
        db.topics.push(topic);
        return topic;
      },
      async findUnique({ where }) { return hydrate(db.topics.find((topic) => topic.id === where.id)) ?? null; },
      async findMany({ where }) { return db.topics.filter((topic) => where.members ? db.members.some((member) => member.topicId === topic.id && member.userId === where.members.some.userId) : where.periodId.in.includes(topic.periodId)).map(hydrate); },
      async update({ where, data }) { return Object.assign(db.topics.find((topic) => topic.id === where.id), data); }
    },
    studentResearchTopicMember: {
      async create({ data }) { return addMember(data); },
      async delete({ where }) { db.members = db.members.filter((member) => member.id !== where.id); }
    },
    fileRecord: {
      async findFirst({ where, orderBy }) { const hits = db.files.filter((file) => fileMatches(file, where)); return (orderBy ? hits.sort((a, b) => b.version - a.version) : hits)[0] ?? null; },
      async findMany({ where }) { return db.files.filter((file) => fileMatches(file, where)); },
      async updateMany({ where, data }) { const hits = db.files.filter((file) => fileMatches(file, where)); hits.forEach((file) => Object.assign(file, data)); return { count: hits.length }; },
      async create({ data }) { const file = { deletedAt: null, createdAt: db.clock, ...data }; db.files.push(file); return file; }
    }
  };
  const objects = new Map();
  const storage = { async putObject(input) { objects.set(input.objectKey, input.content); }, async getObject(key) { return objects.get(key); }, async deleteObject(key) { objects.delete(key); } };
  const mail = { configuration: () => ({ loginUrl: "http://localhost:3000/login" }), async sendText(input) { db.sent.push(input); } };
  const service = new StudentResearchService(prisma, new AuditLogService(prisma), storage, mail);
  const as = (userId) => ({ ...person(userId) });
  return { db, service, as, objects };
}

const upload = (name = "don.docx", mimetype = "application/vnd.openxmlformats-officedocument.wordprocessingml.document") => ({ originalname: name, mimetype, size: 64, buffer: fileBytes(64, name) });
const topicFields = { title: "Đề tài A", summary: null, advisorName: "TS. B", advisorUnit: "Bộ môn C" };
const topicInput = (periodId) => ({ periodId, ...topicFields });

async function setup({ maxMembers = 3 } = {}) {
  const world = createWorld();
  const deadline = new Date(world.db.clock.getTime() + 30 * DAY);
  const { id: periodId } = await world.service.createPeriod(world.as("cv1"), { year: 2026, title: "Sinh viên NCKH 2026", submissionDeadline: deadline, maxMembers });
  const { id: topicId } = await world.service.createTopic(world.as("sv1"), topicInput(periodId), upload());
  const topic = () => world.db.topics.find((row) => row.id === topicId);
  const activeFiles = (purpose) => world.db.files.filter((file) => file.relatedEntityId === topicId && file.filePurpose === purpose && file.status === "active");
  return { ...world, periodId, topicId, topic, activeFiles, deadline };
}

describe("Sinh viên NCKH", () => {
  it("a student cannot create or join ordinary research proposals", () => {
    assert.equal(isInternalResearcherEligible({ systemRole: "STUDENT_USER" }), false);
    assert.deepEqual(participantPolicyFor({ systemRole: "STUDENT_USER" }), { pi: false, view: false, manage: false });
    assert.equal(participantPolicyFor({ systemRole: "RESEARCHER_INTERNAL_USER" }).pi, true);
  });

  it("pipes cap members at 5 and scores at 0–100 with an optional award", () => {
    const period = { year: 2026, title: "Đợt", submissionDeadline: "2026-12-31T16:59:59.999Z", maxMembers: 5 };
    assert.equal(createPeriodPipe.transform(period).maxMembers, 5);
    assert.throws(() => createPeriodPipe.transform({ ...period, maxMembers: 6 }), { name: "BadRequestException" });
    assert.deepEqual(closeTopicPipe.transform({ score: 87.5 }), { score: 87.5, award: null });
    for (const score of [8.2, 55.1, 1.1, 100]) assert.equal(closeTopicPipe.transform({ score }).score, score);
    for (const bad of [{ score: 101 }, { score: 87.555 }, { score: "90" }, { score: 90, award: "GOLD" }]) assert.throws(() => closeTopicPipe.transform(bad), { name: "BadRequestException" });
  });

  it("one period per year, created by a CV who becomes its officer; only TP reassigns", async () => {
    const { service, as, db, periodId } = await setup();
    assert.equal(db.periods[0].responsibleOfficerUserId, "cv1");
    await assert.rejects(() => service.createPeriod(as("cv2"), { year: 2026, title: "x", submissionDeadline: new Date(), maxMembers: 3 }), { status: 409 });
    await assert.rejects(() => service.createPeriod(as("tp"), { year: 2027, title: "x", submissionDeadline: new Date(), maxMembers: 3 }), { status: 403 });
    await assert.rejects(() => service.updatePeriod(as("cv1"), periodId, { responsibleOfficerUserId: "cv2" }), { status: 403 });
    await assert.rejects(() => service.updatePeriod(as("tp"), periodId, { responsibleOfficerUserId: "ncv" }), { status: 400 });
    await service.updatePeriod(as("tp"), periodId, { responsibleOfficerUserId: "cv2" });
    assert.equal(db.periods[0].responsibleOfficerUserId, "cv2");
    await assert.rejects(() => service.uploadTemplate(as("cv1"), periodId, "FULL_REPORT", upload()), { status: 403 });
    await service.uploadTemplate(as("cv2"), periodId, "FULL_REPORT", upload("mau.pdf", "application/pdf"));
  });

  it("a topic needs the registration form, a student leader and an open period; one topic per student per period", async () => {
    const { service, as, db, periodId, topicId } = await setup();
    assert.equal(db.members.length, 1);
    await assert.rejects(() => service.createTopic(as("sv1"), topicInput(periodId), upload()), { status: 409 });
    await assert.rejects(() => service.createTopic(as("sv4"), topicInput(periodId)), { status: 400 });
    await assert.rejects(() => service.createTopic(as("ncv"), topicInput(periodId), upload()), { status: 403 });
    await service.addMember(as("sv1"), topicId, "sv2");
    await assert.rejects(() => service.createTopic(as("sv2"), topicInput(periodId), upload()), { status: 409 });
    db.clock = new Date(db.clock.getTime() + 31 * DAY);
    await assert.rejects(() => service.createTopic(as("sv3"), topicInput(periodId), upload()), { status: 409 });
    assert.equal(db.topics.length, 1);
  });

  it("an incomplete student profile blocks creating or joining a topic until the four fields are saved", async () => {
    const { service, as, db, periodId, topicId } = await setup();
    assert.equal((await service.overview(as("sv5"))).profileComplete, false);
    assert.equal((await service.getProfile(as("sv5"))).complete, false);
    await assert.rejects(() => service.createTopic(as("sv5"), topicInput(periodId), upload()), (error) => error.status === 409 && error.response.code === "STUDENT_PROFILE_INCOMPLETE");
    await assert.rejects(() => service.addMember(as("sv1"), topicId, "sv5"), (error) => error.status === 409 && error.response.code === "STUDENT_PROFILE_INCOMPLETE");
    await assert.rejects(() => service.saveProfile(as("ncv"), studentProfilePipe.transform({ studentCode: "x1", className: "A", phone: "0912345678", previousSemesterScore: 7 })), { status: 403 });

    const saved = await service.saveProfile(as("sv5"), studentProfilePipe.transform({ studentCode: "sv005", className: "DH55B", phone: "0912345678", previousSemesterScore: 7.5 }));
    assert.deepEqual([saved.complete, saved.studentCode, saved.previousSemesterScore], [true, "SV005", 7.5]);
    assert.equal(db.studentProfiles.find((profile) => profile.userId === "sv5").organizationUnitId, "he-1");
    assert.equal((await service.overview(as("sv5"))).profileComplete, true);
    assert.equal((await service.addMember(as("sv1"), topicId, "sv5")).invited, false);
  });

  it("the student profile rejects bad values and a student code already used by someone else", async () => {
    const { service, as } = await setup();
    const valid = { studentCode: "sv001", className: "DH55A", phone: "0912345678", previousSemesterScore: 8.25 };
    assert.equal(studentProfilePipe.transform(valid).studentCode, "SV001");
    for (const bad of [{ studentCode: "" }, { studentCode: "SV 1" }, { className: "" }, { phone: "abc" }, { previousSemesterScore: 10.5 }, { previousSemesterScore: 8.255 }, { previousSemesterScore: "8" }]) assert.throws(() => studentProfilePipe.transform({ ...valid, ...bad }), { name: "BadRequestException" });
    await assert.rejects(() => service.saveProfile(as("sv5"), studentProfilePipe.transform({ ...valid, studentCode: "sv2" })), { status: 409 });
    // Sinh viên sửa lại chính hồ sơ của mình với cùng mã SV thì không bị coi là trùng.
    await service.saveProfile(as("sv2"), studentProfilePipe.transform({ ...valid, studentCode: "sv2" }));
  });

  it("the leader adds students by username or email up to the cap; unknown emails are invited by mail", async () => {
    const { service, as, db, topicId } = await setup({ maxMembers: 3 });
    await assert.rejects(() => service.addMember(as("sv2"), topicId, "sv3"), { status: 403 });
    await assert.rejects(() => service.addMember(as("sv1"), topicId, "nobody"), { status: 404 });
    await assert.rejects(() => service.addMember(as("sv1"), topicId, "ncv"), { status: 400 });
    assert.deepEqual(await service.addMember(as("sv1"), topicId, "sv2@hvqy.vn").then((row) => row.invited), false);
    await assert.rejects(() => service.addMember(as("sv1"), topicId, "sv2"), { status: 409 });
    assert.equal((await service.addMember(as("sv1"), topicId, "ban@gmail.com")).invited, true);
    assert.equal(db.sent[0].to, "ban@gmail.com");
    assert.match(db.sent[0].text, /\/register/);
    await assert.rejects(() => service.addMember(as("sv1"), topicId, "sv3"), { status: 409 });
    const invitation = db.members.find((member) => member.invitedEmail);
    await assert.rejects(() => service.removeMember(as("sv1"), topicId, db.members[0].id), { status: 400 });
    await service.removeMember(as("sv1"), topicId, invitation.id);
    // Thành viên tự rời nhóm được; người ngoài nhóm thì không.
    const joined = db.members.find((member) => member.userId === "sv2");
    await assert.rejects(() => service.removeMember(as("sv4"), topicId, joined.id), { status: 403 });
    await service.removeMember(as("sv2"), topicId, joined.id);
    await service.addMember(as("sv1"), topicId, "sv2");
    await service.addMember(as("sv1"), topicId, "sv3");
    assert.equal(db.members.length, 3);
  });

  it("only the responsible CV approves or rejects; a rejected topic is edited and resubmitted, then members are frozen", async () => {
    const { service, as, topic, topicId } = await setup();
    for (const who of ["cv2", "tp", "tb", "sv1"]) await assert.rejects(() => service.decide(as(who), topicId, { approve: true }), { status: 403 });
    await service.decide(as("cv1"), topicId, { approve: false, reason: "Thiếu mục tiêu" });
    assert.deepEqual([topic().status, topic().rejectionReason], ["rejected", "Thiếu mục tiêu"]);
    await assert.rejects(() => service.decide(as("cv1"), topicId, { approve: true }), { status: 409 });
    await assert.rejects(() => service.updateTopic(as("sv2"), topicId, topicFields), { status: 403 });
    await service.updateTopic(as("sv1"), topicId, { ...topicFields, title: "Đề tài A (sửa)" });
    assert.deepEqual([topic().status, topic().rejectionReason, topic().title], ["pending_approval", null, "Đề tài A (sửa)"]);
    await service.decide(as("cv1"), topicId, { approve: true });
    await assert.rejects(() => service.updateTopic(as("sv1"), topicId, topicFields), { status: 409 });
    await assert.rejects(() => service.addMember(as("sv1"), topicId, "sv2"), { status: 409 });
  });

  it("only the leader uploads DOC/DOCX/PDF; reports wait for approval and a new upload replaces the old one", async () => {
    const { service, as, topicId, activeFiles, db } = await setup();
    await service.addMember(as("sv1"), topicId, "sv2");
    await assert.rejects(() => service.uploadTopicFile(as("sv1"), topicId, "FULL_REPORT", upload()), { status: 409 });
    await service.decide(as("cv1"), topicId, { approve: true });
    for (const who of ["sv2", "cv1", "tp"]) await assert.rejects(() => service.uploadTopicFile(as(who), topicId, "FULL_REPORT", upload()), { status: 403 });
    await assert.rejects(() => service.uploadTopicFile(as("sv1"), topicId, "FULL_REPORT", { originalname: "a.xlsx", mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 64, buffer: fileBytes(64, "a.xlsx") }), { status: 400 });
    await assert.rejects(() => service.uploadTopicFile(as("sv1"), topicId, "FULL_REPORT", { ...upload("a.pdf", "application/pdf"), buffer: Buffer.alloc(64, "x") }), { status: 400 });
    await service.uploadTopicFile(as("sv1"), topicId, "FULL_REPORT", upload("v1.pdf", "application/pdf"));
    await service.uploadTopicFile(as("sv1"), topicId, "FULL_REPORT", upload("v2.docx"));
    await service.uploadTopicFile(as("sv1"), topicId, "REGISTRATION_FORM", upload("don-moi.docx"));
    assert.deepEqual(activeFiles("FULL_REPORT").map((file) => [file.originalFileName, file.version]), [["v2.docx", 2]]);
    assert.deepEqual(activeFiles("REGISTRATION_FORM").map((file) => file.originalFileName), ["don-moi.docx"]);
    assert.equal(db.files.filter((file) => file.status === "deleted").length, 2);
  });

  it("uploads lock after the deadline until TP, TB or the responsible CV extends it", async () => {
    const { service, as, topicId, periodId, db, deadline } = await setup();
    await service.decide(as("cv1"), topicId, { approve: true });
    db.clock = new Date(deadline.getTime() + 1000);
    await assert.rejects(() => service.uploadTopicFile(as("sv1"), topicId, "SUMMARY_REPORT", upload()), { status: 409 });
    const later = new Date(deadline.getTime() + 7 * DAY);
    for (const who of ["cv2", "sv1"]) await assert.rejects(() => service.setTopicDeadline(as(who), topicId, later), { status: 403 });
    await service.setTopicDeadline(as("tb"), topicId, later);
    await service.uploadTopicFile(as("sv1"), topicId, "SUMMARY_REPORT", upload());
    await service.setTopicDeadline(as("cv1"), topicId, null);
    await assert.rejects(() => service.uploadTopicFile(as("sv1"), topicId, "SUMMARY_REPORT", upload()), { status: 409 });
    await assert.rejects(() => service.updatePeriod(as("tp"), periodId, { maxMembers: 2 }), { status: 403 });
    await service.updatePeriod(as("tp"), periodId, { submissionDeadline: later });
    await service.uploadTopicFile(as("sv1"), topicId, "SUMMARY_REPORT", upload());
    // overview đọc giờ hệ thống thật: đưa hạn về quá khứ để xem trạng thái khoá.
    db.periods[0].submissionDeadline = new Date(0);
    const view = (await service.overview(as("sv1"))).topics[0];
    assert.deepEqual([view.locked, view.capabilities.canUploadReports, view.capabilities.canEdit], [true, false, false]);
  });

  it("the responsible CV scores, awards and closes; evidence images come after and documents stay locked", async () => {
    const { service, as, topicId, topic, activeFiles } = await setup();
    const png = { originalname: "giay-khen.png", mimetype: "image/png", size: 64, buffer: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(56)]) };
    await assert.rejects(() => service.closeTopic(as("cv1"), topicId, { score: 90, award: "FIRST" }), { status: 409 });
    await service.decide(as("cv1"), topicId, { approve: true });
    await assert.rejects(() => service.uploadTopicFile(as("sv1"), topicId, "AWARD_EVIDENCE", png), { status: 409 });
    for (const who of ["tp", "tb", "cv2"]) await assert.rejects(() => service.closeTopic(as(who), topicId, { score: 90, award: "FIRST" }), { status: 403 });
    await service.closeTopic(as("cv1"), topicId, { score: 92.5, award: "FIRST" });
    assert.deepEqual([topic().status, topic().score, topic().award, topic().closedById], ["closed", 92.5, "FIRST", "cv1"]);
    await assert.rejects(() => service.uploadTopicFile(as("sv1"), topicId, "FULL_REPORT", upload()), { status: 409 });
    await assert.rejects(() => service.setTopicDeadline(as("tp"), topicId, new Date()), { status: 409 });
    await assert.rejects(() => service.uploadTopicFile(as("sv1"), topicId, "AWARD_EVIDENCE", upload()), { status: 400 });
    await service.uploadTopicFile(as("sv1"), topicId, "AWARD_EVIDENCE", png);
    await service.uploadTopicFile(as("cv1"), topicId, "AWARD_EVIDENCE", { ...png, originalname: "bang-khen.png" });
    await assert.rejects(() => service.uploadTopicFile(as("tp"), topicId, "AWARD_EVIDENCE", png), { status: 403 });
    assert.equal(activeFiles("AWARD_EVIDENCE").length, 2);
  });

  it("students see only their own topic; other CVs see none; downloads follow the same rule", async () => {
    const { service, as, topicId, periodId, db } = await setup();
    await service.addMember(as("sv1"), topicId, "sv2");
    await service.uploadTemplate(as("cv1"), periodId, "REGISTRATION_FORM", upload("mau-don.docx"));
    const [template, form] = [db.files.find((file) => file.relatedEntityId === periodId), db.files.find((file) => file.relatedEntityId === topicId)];
    assert.deepEqual((await service.overview(as("sv2"))).topics.map((topic) => topic.id), [topicId]);
    const outsider = await service.overview(as("sv3"));
    assert.deepEqual([outsider.topics.length, outsider.periods[0].canRegister, outsider.periods[0].templates.length], [0, true, 1]);
    assert.equal((await service.overview(as("sv1"))).periods[0].canRegister, false);
    assert.equal((await service.overview(as("cv2"))).topics.length, 0);
    assert.equal((await service.overview(as("tb"))).topics.length, 1);
    await assert.rejects(() => service.overview(as("ncv")), { status: 403 });
    for (const who of ["sv1", "sv2", "cv1", "tp", "tb"]) assert.equal((await service.download(as(who), form.id)).fileName, "don.docx");
    for (const who of ["sv3", "cv2", "ncv"]) await assert.rejects(() => service.download(as(who), form.id), { status: 404 });
    assert.equal((await service.download(as("sv3"), template.id)).fileName, "mau-don.docx");
  });
});
