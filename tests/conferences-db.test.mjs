import "dotenv/config";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { createMigratedDatabase } from "./helpers/disposable-database.mjs";
import { PrismaService } from "../dist/apps/api/infrastructure/prisma/prisma.service.js";
import { AuditLogService } from "../dist/apps/api/auth/audit-log.service.js";
import { AuthStore } from "../dist/apps/api/auth/auth.store.js";
import { PasswordService } from "../dist/apps/api/auth/password.service.js";
import { NotificationsService } from "../dist/apps/api/notifications/notifications.service.js";
import { ConferencesService } from "../dist/apps/api/conferences/conferences.service.js";
import { ConferenceInvitationsService } from "../dist/apps/api/conferences/conference-invitations.service.js";
import { ConferencePapersService } from "../dist/apps/api/conferences/conference-papers.service.js";
import { ConferenceProgramService } from "../dist/apps/api/conferences/conference-program.service.js";

// Hội nghị khoa học Đợt 1 trên PostgreSQL thật: Trưởng phòng tạo và giao chuyên viên; chuyên viên mời, gửi thư;
// khách mời nhận lời (tạo tài khoản nội bộ theo đơn vị hoặc tài khoản ngoài), nộp tóm tắt và toàn văn trước hạn;
// chuyên viên yêu cầu sửa; đóng nhận bài.

let database;
let db;
let authStore;
let notifications;
let conferences;
let invitations;
let papers;
let program;
let orgA;
let orgB;
let head;
let officer;
let otherStaff;
let researcher;
let leader;
let sequence = 0;
const sentMail = [];
const objects = new Map();

const unique = (prefix) => `${prefix}-${process.pid}-${++sequence}`;
const daysFromNow = (days) => new Date(Date.now() + days * 86400000).toISOString();
const ctx = { ip: "203.0.113.7", userAgent: "test" };
const tokenFrom = (html) => decodeURIComponent(/token=([^"&\s<]+)/.exec(html)[1]);
const pdf = (text) => { const buffer = Buffer.from(`%PDF-1.4 ${text}`); return { originalname: "bao-cao.pdf", mimetype: "application/pdf", size: buffer.length, buffer }; };

async function createUser(role, org, email) {
  const name = unique(role.toLowerCase().replace(/_/g, "-"));
  const user = await db.user.create({
    data: {
      username: name, usernameKey: name, displayName: name, passwordHash: "not-used", status: "active", systemRole: role, unit: org?.name ?? "Ngoài", credentialEmail: email ?? null,
      ...(org ? { organizationScopes: { create: [{ organizationUnitId: org.id, isPrimary: true }] } } : {})
    }
  });
  return authStore.toSafeUser(await authStore.findUserById(user.id));
}

async function newConference(overrides = {}) {
  const result = await conferences.create(head, {
    title: unique("Hội nghị KH"), description: null, level: "academy", hostOrganizationUnitId: orgA.id, location: "Hội trường A",
    startsAt: new Date(daysFromNow(60)), endsAt: new Date(daysFromNow(61)), responseDeadline: null,
    abstractDeadline: new Date(daysFromNow(20)), fullPaperDeadline: new Date(daysFromNow(40)), ...overrides
  });
  return result.conference;
}

const version = async (actor, id) => (await conferences.detail(actor, id)).conference.version;

describe("Scientific conferences on real PostgreSQL", () => {
  before(async () => {
    process.env.APP_BASE_URL = "https://docmans.test";
    database = await createMigratedDatabase("conferences");
    const originalUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = database.url;
    db = new PrismaService();
    process.env.DATABASE_URL = originalUrl;
    await db.$connect();
    authStore = new AuthStore(db);
    const audit = new AuditLogService(db);
    notifications = new NotificationsService(db);
    const mail = { sendMail: async (to, subject, html) => { sentMail.push({ to, subject, html }); return { messageId: String(sentMail.length) }; } };
    const storage = {
      putObject: async ({ objectKey, content }) => { objects.set(objectKey, Buffer.from(content)); },
      getObject: async (objectKey) => { if (!objects.has(objectKey)) throw new Error("missing"); return objects.get(objectKey); },
      deleteObject: async (objectKey) => { objects.delete(objectKey); }
    };
    conferences = new ConferencesService(db, audit);
    invitations = new ConferenceInvitationsService(db, audit, new PasswordService(), mail, notifications);
    papers = new ConferencePapersService(db, audit, storage, notifications, { allowedExtensions: [".pdf", ".docx"], maxFileSizeBytes: 1_000_000 });
    program = new ConferenceProgramService(db, audit, storage, { allowedExtensions: [".pdf", ".docx"], maxFileSizeBytes: 1_000_000 });

    orgA = await db.organizationUnit.create({ data: { code: unique("HN-A"), name: "Phòng KHQS" } });
    orgB = await db.organizationUnit.create({ data: { code: unique("HN-B"), name: "Khoa Nội" } });
    head = await createUser("RESEARCH_MANAGEMENT_HEAD", orgA);
    officer = await createUser("RESEARCH_MANAGEMENT_STAFF", orgA, `${unique("officer")}@hvqy.test`);
    otherStaff = await createUser("RESEARCH_MANAGEMENT_STAFF", orgA);
    researcher = await createUser("RESEARCHER_INTERNAL_USER", orgB, `${unique("researcher")}@hvqy.test`);
    leader = await createUser("LEADERSHIP_APPROVAL_AUTHORITY", orgB);
  });

  after(async () => {
    await db?.$disconnect();
    await database?.drop();
  });

  it("runs the whole phase-1 flow: create, assign, invite, accept with account creation, submit, revise, close", async () => {
    await assert.rejects(conferences.create(officer, { title: "x", level: "academy", hostOrganizationUnitId: orgA.id, location: "A", startsAt: new Date(), endsAt: new Date(), abstractDeadline: new Date(), fullPaperDeadline: new Date() }), /Trưởng phòng/);
    const created = await newConference();
    assert.match(created.code, /^HN-\d{4}-\d{3}$/);
    assert.equal(created.status, "draft");
    await assert.rejects(conferences.detail(leader, created.id), /Không tìm thấy/, "lãnh đạo không thấy bản nháp");

    const assigned = (await conferences.assignOfficer(head, created.id, { version: created.version, userId: officer.id })).conference;
    assert.equal(assigned.status, "preparing");
    assert.equal(assigned.officer.id, officer.id);
    await assert.rejects(conferences.detail(otherStaff, created.id), /Không tìm thấy/, "chuyên viên khác không xem được");
    assert.equal((await conferences.detail(leader, created.id)).mode, "management");

    const externalEmail = `${unique("ext")}@benhvien.test`;
    const internalEmail = `${unique("int")}@hvqy.test`;
    const delegateEmail = `${unique("del")}@benhvien.test`;
    await assert.rejects(invitations.addInvitations(head, created.id, [{ kind: "delegate", fullName: "x", email: "x@x.vn" }]), /chuyên viên phụ trách/);
    await assert.rejects(invitations.addInvitations(officer, created.id, [{ kind: "delegate", userId: officer.id }]), /Chuyên viên phụ trách không thể là khách mời/);
    await invitations.addInvitations(officer, created.id, [
      { kind: "speaker", userId: researcher.id },
      { kind: "speaker", fullName: "PGS Ngoài", academicTitle: "PGS.TS", email: externalEmail, isInternal: false, externalOrganization: "Bệnh viện X" },
      { kind: "speaker", fullName: "ThS Nội bộ", email: internalEmail, isInternal: true, organizationUnitId: orgA.id },
      { kind: "delegate", fullName: "Đại biểu", email: delegateEmail, isInternal: false }
    ]);
    await assert.rejects(invitations.addInvitations(officer, created.id, [{ kind: "delegate", fullName: "Lặp", email: externalEmail }]), /đã có trong danh sách/);
    // Nhận lời sẽ tạo tài khoản nội bộ của đơn vị: chuyên viên chỉ chọn được đơn vị trong phạm vi của mình.
    await assert.rejects(invitations.addInvitations(officer, created.id, [{ kind: "delegate", fullName: "Ngoài phạm vi", email: `${unique("scope")}@x.vn`, isInternal: true, organizationUnitId: orgB.id }]), /không thuộc phạm vi/);
    assert.deepEqual((await invitations.organizationUnits(officer, created.id)).map((unit) => unit.id), [orgA.id]);
    await assert.rejects(conferences.assignOfficer(head, created.id, { version: await version(head, created.id), userId: researcher.id }), /chuyên viên QLKH/);

    let detail = (await conferences.detail(officer, created.id)).conference;
    const byEmail = (email) => detail.invitations.find((item) => item.email === email);
    assert.equal(detail.invitations.length, 4);
    const result = await invitations.sendMailing(officer, created.id, { kind: "invitation", invitationIds: detail.invitations.map((item) => item.id) });
    assert.deepEqual({ recipients: result.recipients, sent: result.sent, failed: result.failed }, { recipients: 4, sent: 4, failed: 0 });
    detail = (await conferences.detail(officer, created.id)).conference;
    assert.equal(detail.status, "inviting", "thư mời đầu tiên mở giai đoạn mời và nhận bài");
    assert.equal(sentMail.filter((mail) => [externalEmail, internalEmail, delegateEmail].includes(mail.to)).length, 3, "người chưa có tài khoản nhận email");
    assert.ok(await db.userNotification.findFirst({ where: { userId: researcher.id, type: "conference" } }), "người có tài khoản nhận thông báo");
    const mailTo = (email) => sentMail.filter((mail) => mail.to === email).at(-1);
    assert.match(mailTo(externalEmail).html, /Hội trường A/);
    assert.match(mailTo(externalEmail).html, /Hạn nộp tóm tắt/);
    assert.doesNotMatch(mailTo(delegateEmail).html, /Hạn nộp tóm tắt/);

    // Đường link công khai: tra cứu, mã sai, nhận lời tạo tài khoản ngoài, dùng lại mã bị từ chối.
    const externalToken = tokenFrom(mailTo(externalEmail).html);
    const lookup = await invitations.publicLookup(externalToken, ctx);
    assert.equal(lookup.invitation.fullName, "PGS Ngoài");
    assert.equal(lookup.conference.location, "Hội trường A");
    await assert.rejects(invitations.publicLookup("x".repeat(43), ctx), /không hợp lệ/);
    const accepted = await invitations.publicRespond({ token: externalToken, decision: "accept" }, ctx);
    assert.equal(accepted.account, "created");
    assert.match(accepted.activationPath, /^\/password-reset#mode=activation&token=/);
    const externalUser = await db.user.findUnique({ where: { credentialEmail: externalEmail }, include: { organizationScopes: true } });
    assert.equal(externalUser.systemRole, "EXTERNAL_RESEARCHER_USER");
    assert.equal(externalUser.status, "pending_activation");
    assert.equal(externalUser.organizationScopes.length, 0);
    await assert.rejects(invitations.publicRespond({ token: externalToken, decision: "accept" }, ctx), /không hợp lệ|đã được dùng/);

    const internalUser = await (async () => {
      await invitations.publicRespond({ token: tokenFrom(mailTo(internalEmail).html), decision: "accept" }, ctx);
      return db.user.findUnique({ where: { credentialEmail: internalEmail }, include: { organizationScopes: true } });
    })();
    assert.equal(internalUser.systemRole, "RESEARCHER_INTERNAL_USER", "người trong Học viện được tài khoản nội bộ");
    assert.deepEqual(internalUser.organizationScopes.map((scope) => scope.organizationUnitId), [orgA.id]);

    const declined = await invitations.publicRespond({ token: tokenFrom(mailTo(delegateEmail).html), decision: "decline", reason: "Bận công tác" }, ctx);
    assert.equal(declined.account, null);
    assert.equal(await db.user.findUnique({ where: { credentialEmail: delegateEmail } }), null, "từ chối không tạo tài khoản");

    // Người có tài khoản nhận lời trong hệ thống, rồi nộp tóm tắt và toàn văn ngay, không chờ chấp nhận.
    let mine = await papers.myConferences(researcher);
    assert.equal(mine.length, 1);
    assert.equal(mine[0].invitation.canRespond, true);
    assert.equal(mine[0].paper, null);
    await invitations.respondInApp(researcher, mine[0].invitation.id, { decision: "accept" });
    await assert.rejects(invitations.respondInApp(researcher, mine[0].invitation.id, { decision: "decline" }), /đã được trả lời/);
    mine = await papers.myConferences(researcher);
    let paper = mine[0].paper;
    assert.equal(paper.status, "awaiting_abstract");
    assert.equal(paper.viewer.canSubmitFullPaper, false);
    await assert.rejects(papers.submit(researcher, paper.id, { version: paper.version, kind: "full_paper" }, pdf("full")), /tóm tắt trước/);
    await papers.submit(researcher, paper.id, { version: paper.version, kind: "abstract", title: "Báo cáo A", abstractText: "Tóm tắt A", authors: [{ fullName: "Tác giả 1", corresponding: true }] });
    paper = (await papers.myConferences(researcher))[0].paper;
    assert.equal(paper.status, "abstract_submitted");
    await assert.rejects(papers.submit(officer, paper.id, { version: paper.version, kind: "full_paper" }, pdf("x")), /Chỉ báo cáo viên/);
    await papers.submit(researcher, paper.id, { version: paper.version, kind: "full_paper" }, pdf("full v1"));
    paper = (await papers.myConferences(researcher))[0].paper;
    assert.equal(paper.status, "full_paper_submitted");
    assert.ok(await db.userNotification.findFirst({ where: { userId: officer.id, title: { contains: "toàn văn" } } }), "chuyên viên được báo khi có bài nộp");

    // Yêu cầu sửa tóm tắt: không đổi trạng thái; nộp lại giải quyết yêu cầu.
    await assert.rejects(papers.requestRevision(head, paper.id, { version: paper.version, kind: "abstract", reason: "x", dueAt: new Date(daysFromNow(30)) }), /chuyên viên phụ trách/);
    await papers.requestRevision(officer, paper.id, { version: paper.version, kind: "abstract", reason: "Rút gọn còn 300 từ", dueAt: new Date(daysFromNow(30)) });
    paper = (await papers.myConferences(researcher))[0].paper;
    assert.equal(paper.status, "full_paper_submitted");
    assert.equal(paper.openRevisions.length, 1);
    await assert.rejects(papers.requestRevision(officer, paper.id, { version: paper.version, kind: "abstract", reason: "Lặp", dueAt: new Date(daysFromNow(30)) }), /chưa được nộp lại/);

    // Đóng nhận bài: chỉ còn nộp được theo yêu cầu sửa đang mở.
    await conferences.transition(officer, created.id, "close-submission", { version: await version(officer, created.id) });
    paper = (await papers.myConferences(researcher))[0].paper;
    assert.equal(paper.viewer.canSubmitFullPaper, false);
    assert.equal(paper.viewer.canSubmitAbstract, true);
    await assert.rejects(papers.submit(researcher, paper.id, { version: paper.version, kind: "full_paper" }, pdf("late")), /Đã đóng nhận bài/);
    await papers.submit(researcher, paper.id, { version: paper.version, kind: "abstract", title: "Báo cáo A", abstractText: "Tóm tắt rút gọn" });
    paper = (await papers.myConferences(researcher))[0].paper;
    assert.equal(paper.openRevisions.length, 0);
    assert.deepEqual(paper.versions.filter((item) => item.kind === "abstract").map((item) => item.versionNumber), [2, 1], "bản nộp cũ được giữ");

    // Tệp toàn văn: tác giả và chuyên viên tải được; người khác không.
    const fullVersion = paper.versions.find((item) => item.kind === "full_paper");
    assert.equal((await papers.download(researcher, paper.id, fullVersion.id)).content.toString(), "%PDF-1.4 full v1");
    assert.ok(await papers.download(officer, paper.id, fullVersion.id));
    await assert.rejects(papers.download(otherStaff, paper.id, fullVersion.id), /Không tìm thấy/);

    // Xuất Excel tình trạng nộp bài.
    const exported = await conferences.exportXlsx(officer, created.id);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(exported.content);
    assert.equal(workbook.worksheets[0].rowCount, 5);

    // Huỷ lời mời đã nhận lời: báo cáo chuyển sang đã rút, người đó không còn thấy hội nghị.
    detail = (await conferences.detail(officer, created.id)).conference;
    const researcherInvitation = detail.invitations.find((item) => item.hasAccount && item.paper?.id === paper.id);
    await invitations.revokeInvitation(officer, created.id, researcherInvitation.id, "Đổi báo cáo viên");
    assert.equal((await db.conferencePaper.findUnique({ where: { id: paper.id } })).status, "withdrawn");
    assert.equal((await papers.myConferences(researcher)).length, 0);
    await assert.rejects(conferences.detail(researcher, created.id), /Không tìm thấy/);

    // Chưa tới ngày tổ chức thì chưa kết thúc được; huỷ cần lý do.
    await assert.rejects(conferences.transition(officer, created.id, "complete", { version: await version(officer, created.id) }), /sau ngày tổ chức/);
    await assert.rejects(conferences.transition(head, created.id, "cancel", { version: await version(head, created.id) }), /lý do/);
  });

  it("links an invitation to an existing account by email and blocks the officer from being invited by email", async () => {
    const created = await newConference();
    await conferences.assignOfficer(head, created.id, { version: created.version, userId: officer.id });
    await assert.rejects(invitations.addInvitations(officer, created.id, [{ kind: "delegate", fullName: "Chính mình", email: (await db.user.findUnique({ where: { id: officer.id } })).credentialEmail }]), /Chuyên viên phụ trách/);
    const researcherEmail = (await db.user.findUnique({ where: { id: researcher.id } })).credentialEmail;
    await invitations.addInvitations(officer, created.id, [{ kind: "delegate", fullName: "Nhập tay", email: researcherEmail, isInternal: false }]);
    const detail = (await conferences.detail(officer, created.id)).conference;
    assert.equal(detail.invitations[0].hasAccount, true, "email trùng tài khoản thì gắn luôn tài khoản");
    // Đã là khách mời thì không được giao làm chuyên viên phụ trách (chiều ngược lại).
    const staffEmail = `${unique("staff-invited")}@hvqy.test`;
    const invitedStaff = await createUser("RESEARCH_MANAGEMENT_STAFF", orgA, staffEmail);
    await invitations.addInvitations(officer, created.id, [{ kind: "delegate", userId: invitedStaff.id }]);
    await assert.rejects(conferences.assignOfficer(head, created.id, { version: await version(head, created.id), userId: invitedStaff.id }), /đang là khách mời/);
  });

  it("phase 2: sessions, automatic schedule, publish program, send program and proceedings", async () => {
    // Hội nghị diễn ra ngày D+60 từ 08:00 (giờ Việt Nam) đến hết D+61.
    const dayStart = new Date(daysFromNow(60)); dayStart.setUTCHours(1, 0, 0, 0);
    const at = (hours, minutes = 0) => new Date(dayStart.getTime() + ((hours - 8) * 60 + minutes) * 60000);
    const created = await newConference({ startsAt: dayStart, endsAt: new Date(dayStart.getTime() + 2 * 86400000) });
    await conferences.assignOfficer(head, created.id, { version: created.version, userId: officer.id });
    const speakers = [];
    for (let index = 0; index < 4; index += 1) speakers.push(await createUser("RESEARCHER_INTERNAL_USER", orgB));
    await invitations.addInvitations(officer, created.id, speakers.map((user) => ({ kind: "speaker", userId: user.id })));
    const detail = (await conferences.detail(officer, created.id)).conference;
    await invitations.sendMailing(officer, created.id, { kind: "invitation", invitationIds: detail.invitations.map((item) => item.id) });
    for (const [index, user] of speakers.entries()) {
      const mine = (await papers.myConferences(user)).find((item) => item.conference.id === created.id);
      await invitations.respondInApp(user, mine.invitation.id, { decision: "accept" });
      let paper = (await papers.myConferences(user)).find((item) => item.conference.id === created.id).paper;
      await papers.submit(user, paper.id, { version: paper.version, kind: "abstract", title: `Báo cáo ${index + 1}`, abstractText: "Tóm tắt" });
      // Báo cáo viên thứ tư chỉ nộp tóm tắt: không xếp được vào chương trình.
      if (index === 3) continue;
      paper = (await papers.myConferences(user)).find((item) => item.conference.id === created.id).paper;
      await papers.submit(user, paper.id, { version: paper.version, kind: "full_paper" }, pdf(`full ${index}`));
    }
    const ids = async () => Object.fromEntries((await Promise.all(speakers.map(async (user) => (await papers.myConferences(user)).find((item) => item.conference.id === created.id).paper))).map((paper, index) => [index, paper.id]));
    const paperIds = await ids();

    // Chưa đóng nhận bài thì chưa lập chương trình.
    await assert.rejects(program.createSession(officer, created.id, { kind: "plenary", name: "Toàn thể", room: "Hội trường", chairName: null, secretaryName: null, startsAt: at(8), endsAt: at(9), slotMinutes: null, sortOrder: 0, breaks: [] }), /sau khi đã đóng nhận bài/);
    await conferences.transition(officer, created.id, "close-submission", { version: await version(officer, created.id) });
    await assert.rejects(program.createSession(head, created.id, { kind: "plenary", name: "x", room: null, chairName: null, secretaryName: null, startsAt: at(8), endsAt: at(9), slotMinutes: null, sortOrder: 0, breaks: [] }), /chuyên viên phụ trách/);

    let state = await program.createSession(officer, created.id, { kind: "plenary", name: "Phiên toàn thể", room: "Hội trường", chairName: "GS.TS A", secretaryName: null, startsAt: at(8), endsAt: at(8, 30), slotMinutes: 20, sortOrder: 0, breaks: [] });
    state = await program.createSession(officer, created.id, { kind: "track", name: "Tiểu ban Nội", room: "P1", chairName: null, secretaryName: null, startsAt: at(9), endsAt: at(9, 30), slotMinutes: null, sortOrder: 1, breaks: [{ label: "Giải lao", startsAt: at(9, 15), endsAt: at(9, 20) }] });
    state = await program.createSession(officer, created.id, { kind: "track", name: "Tiểu ban Ngoại", room: "P2", chairName: null, secretaryName: null, startsAt: at(9), endsAt: at(10), slotMinutes: null, sortOrder: 2, breaks: [] });
    const [plenary, internal, surgery] = state.sessions;
    assert.equal(state.unscheduled.length, 3, "chỉ báo cáo đã nộp toàn văn chờ xếp");
    await assert.rejects(program.setSessionSlots(officer, created.id, surgery.id, { paperIds: [paperIds[3]] }), /đã nộp toàn văn/);
    await program.setSessionSlots(officer, created.id, plenary.id, { paperIds: [paperIds[0]] });
    state = await program.setSessionSlots(officer, created.id, internal.id, { paperIds: [paperIds[1], paperIds[2]] });
    const internalSlots = state.sessions.find((item) => item.id === internal.id).slots;
    // 15 phút mặc định, bỏ qua giải lao 09:15–09:20: báo cáo thứ hai 09:20–09:35, vượt khung 5 phút.
    assert.equal(internalSlots[1].overflowMinutes, 5);
    assert.ok(state.issues.some((issue) => issue.code === "OVERFLOW"));
    await assert.rejects(program.publish(officer, created.id, { acknowledgeUnscheduled: true }), /lỗi cần sửa/);

    // Chuyển một báo cáo sang tiểu ban Ngoại (chạy song song): hết vượt khung.
    state = await program.setSessionSlots(officer, created.id, surgery.id, { paperIds: [paperIds[2]] });
    assert.deepEqual(state.sessions.find((item) => item.id === internal.id).slots.map((item) => item.paperId), [paperIds[1]], "báo cáo được chuyển khỏi phiên cũ");
    assert.deepEqual(state.issues, []);
    const published = await program.publish(officer, created.id, { acknowledgeUnscheduled: false });
    assert.deepEqual(published, { versionNumber: 1, papers: 3, unscheduled: 0 });
    assert.equal((await conferences.detail(officer, created.id)).conference.status, "program_published");
    assert.equal((await db.conferencePaper.count({ where: { conferenceId: created.id, status: "scheduled" } })), 3);

    // Gửi chương trình cho người đã nhận lời; khách mời thấy bản đã chốt.
    const mailing = await invitations.sendMailing(officer, created.id, { kind: "program", invitationIds: detail.invitations.map((item) => item.id) });
    assert.equal(mailing.recipients, 4);
    const notification = await db.userNotification.findFirst({ where: { userId: speakers[0].id, title: { contains: "Chương trình hội nghị" } } });
    assert.match(notification.body, /Phiên toàn thể Phiên toàn thể: 08:00/);
    const mine = (await papers.myConferences(speakers[1])).find((item) => item.conference.id === created.id);
    assert.equal(mine.program.versionNumber, 1);
    assert.deepEqual(mine.program.snapshot.sessions.map((item) => item.name), ["Phiên toàn thể", "Tiểu ban Nội", "Tiểu ban Ngoại"]);
    assert.deepEqual(mine.program.snapshot.sessions[1].items.map((item) => item.type), ["paper", "break"]);

    // Sửa sau khi chốt: đánh dấu cần chốt lại; bản đã chốt không đổi.
    state = await program.setSessionSlots(officer, created.id, internal.id, { paperIds: [] });
    assert.equal(state.changedSincePublish, true);
    await assert.rejects(program.publish(officer, created.id, { acknowledgeUnscheduled: false }), /chưa được xếp/);
    await program.publish(officer, created.id, { acknowledgeUnscheduled: true });
    assert.equal((await db.conferencePaper.findUnique({ where: { id: paperIds[1] } })).status, "full_paper_submitted", "bỏ khỏi chương trình thì trở về đã nộp toàn văn");
    assert.equal((await program.getProgram(officer, created.id)).changedSincePublish, false);

    // Đổi địa điểm sau khi chốt: bản chốt ghi địa điểm nên cần chốt lại; bản mới lấy địa điểm mới.
    await conferences.update(head, created.id, { version: await version(head, created.id), location: "Hội trường B" });
    assert.equal((await program.getProgram(officer, created.id)).changedSincePublish, true);
    await program.publish(officer, created.id, { acknowledgeUnscheduled: true });
    assert.equal((await program.publishedForViewer(officer, created.id)).program.snapshot.conference.location, "Hội trường B");

    // Báo cáo viên rút bài đã xếp lịch: gỡ khỏi phiên, đánh dấu cần chốt lại.
    const scheduledPaper = await db.conferencePaper.findUnique({ where: { id: paperIds[0] } });
    assert.equal(scheduledPaper.status, "scheduled");
    assert.equal((await papers.withdraw(speakers[0], paperIds[0], { version: scheduledPaper.updatedAt.toISOString() })).status, "withdrawn");
    assert.equal(await db.conferenceSessionSlot.count({ where: { paperId: paperIds[0] } }), 0);
    assert.equal((await program.getProgram(officer, created.id)).changedSincePublish, true);

    // Huỷ lời mời của báo cáo viên đã xếp lịch: xoá khỏi phiên và đánh dấu cần chốt lại.
    const slottedInv = await db.conferenceInvitation.findFirst({ where: { conferenceId: created.id, userId: speakers[2].id } });
    await invitations.revokeInvitation(officer, created.id, slottedInv.id, "Báo cáo viên xin vắng");
    assert.equal(await db.conferenceSessionSlot.count({ where: { paperId: paperIds[2] } }), 0);
    assert.equal((await program.getProgram(officer, created.id)).changedSincePublish, true);

    // Kỷ yếu: chưa tải thì chưa gửi; tải lên rồi gửi được, kể cả sau khi kết thúc hội nghị.
    await assert.rejects(invitations.sendMailing(officer, created.id, { kind: "proceedings", invitationIds: detail.invitations.map((item) => item.id) }), /Chưa tải kỷ yếu/);
    await db.scientificConference.update({ where: { id: created.id }, data: { startsAt: new Date(Date.now() - 2 * 86400000), endsAt: new Date(Date.now() - 3600000) } });
    await conferences.transition(officer, created.id, "complete", { version: await version(officer, created.id) });
    state = await program.uploadProceedings(officer, created.id, { isbn: "978-604-0-00000-0" }, pdf("ky yeu"));
    assert.equal(state.proceedings[0].versionNumber, 1);
    const sent = await invitations.sendMailing(officer, created.id, { kind: "proceedings", invitationIds: detail.invitations.map((item) => item.id) });
    assert.equal(sent.sent, 3);
    await assert.rejects(invitations.sendMailing(officer, created.id, { kind: "reminder", invitationIds: detail.invitations.map((item) => item.id) }), /chuyên viên phụ trách|vừa đổi trạng thái/);
    const book = (await papers.myConferences(speakers[0])).find((item) => item.conference.id === created.id).proceedings;
    assert.equal((await program.downloadProceedings(speakers[0], created.id, book.id)).content.toString(), "%PDF-1.4 ky yeu");
    await assert.rejects(program.downloadProceedings(otherStaff, created.id, book.id), /Không tìm thấy/);
  });

  it("invites leaders whose accounts span many units without a primary one (Trưởng phòng, Trưởng ban)", async () => {
    const created = await newConference();
    await conferences.assignOfficer(head, created.id, { version: created.version, userId: officer.id });
    // Tài khoản phạm vi nhiều đơn vị, không có phạm vi chính: trước đây làm lỗi ràng buộc đơn vị (500).
    const name = unique("board-head");
    const boardHead = authStore.toSafeUser(await authStore.findUserById((await db.user.create({ data: {
      username: name, usernameKey: name, displayName: "Trưởng ban QLKH", passwordHash: "not-used", status: "active", systemRole: "RESEARCH_BOARD_HEAD", unit: "Ban QLKH, Phòng KHQS",
      organizationScopes: { create: [{ organizationUnitId: orgA.id, isPrimary: false }, { organizationUnitId: orgB.id, isPrimary: false }] }
    } })).id));
    await invitations.addInvitations(officer, created.id, [{ kind: "speaker", userId: boardHead.id }, { kind: "delegate", userId: head.id }]);
    const detail = (await conferences.detail(officer, created.id)).conference;
    const row = detail.invitations.find((item) => item.fullName === "Trưởng ban QLKH");
    assert.equal(row.isInternal, true);
    assert.equal(row.organizationUnit, null, "không tự chọn một đơn vị trong nhiều phạm vi");
    assert.equal(row.externalOrganization, "Ban QLKH, Phòng KHQS", "hiển thị đơn vị ghi trên tài khoản");
    await invitations.sendMailing(officer, created.id, { kind: "invitation", invitationIds: detail.invitations.map((item) => item.id) });
    const mine = (await papers.myConferences(boardHead)).find((item) => item.conference.id === created.id);
    await invitations.respondInApp(boardHead, mine.invitation.id, { decision: "accept" });
    const paper = (await papers.myConferences(boardHead)).find((item) => item.conference.id === created.id).paper;
    await papers.submit(boardHead, paper.id, { version: paper.version, kind: "abstract", title: "Báo cáo của Trưởng ban", abstractText: "Tóm tắt" });
    const stats = await conferences.stats(head, {});
    assert.ok(stats.speakersByUnit.some((bucket) => bucket.label === "Ban QLKH, Phòng KHQS"), "thống kê theo đơn vị ghi trên tài khoản");
    // Người chưa có tài khoản vẫn phải chọn đơn vị khi là người trong Học viện.
    await assert.rejects(db.conferenceInvitation.create({ data: { conferenceId: created.id, kind: "delegate", fullName: "X", email: `${unique("x")}@x.vn`, isInternal: true, createdById: officer.id } }), /internal_unit_check/);
  });

  it("conference stats follow the same visibility as the conference list", async () => {
    const draft = await newConference();
    const assigned = await newConference();
    await conferences.assignOfficer(head, assigned.id, { version: assigned.version, userId: officer.id });
    const ids = (stats) => stats.perConference.map((row) => row.id);
    const headStats = await conferences.stats(head, {});
    assert.ok(ids(headStats).includes(draft.id) && ids(headStats).includes(assigned.id), "Trưởng phòng thấy cả bản nháp");
    const leaderStats = await conferences.stats(leader, {});
    assert.ok(!ids(leaderStats).includes(draft.id) && ids(leaderStats).includes(assigned.id), "Ban giám đốc không thấy bản nháp");
    assert.ok(ids(await conferences.stats(officer, {})).includes(assigned.id));
    assert.ok(!ids(await conferences.stats(otherStaff, {})).includes(assigned.id), "chuyên viên khác không thấy hội nghị không được giao");
    assert.deepEqual(await conferences.stats(researcher, {}), { visible: false });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await conferences.statsXlsx(head, { hostUnitId: orgA.id }));
    assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Theo_hoi_nghi", "Bao_cao_vien_theo_don_vi", "Theo_phien"]);
    await assert.rejects(conferences.statsXlsx(researcher, {}), /Không có hội nghị/);
  });

  it("imports invitees from Excel all-or-nothing and reports bad rows", async () => {
    const created = await newConference();
    await conferences.assignOfficer(head, created.id, { version: created.version, userId: officer.id });
    const build = async (rows) => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Khach_moi");
      sheet.addRow(["Họ tên", "Học hàm, học vị", "Email", "Loại (Báo cáo viên/Đại biểu)", "Mã đơn vị trong Học viện", "Đơn vị ngoài Học viện"]);
      for (const row of rows) sheet.addRow(row);
      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      return { originalname: "khach-moi.xlsx", mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: buffer.length, buffer };
    };
    const bad = await invitations.importInvitations(officer, created.id, await build([
      ["A", "", `${unique("a")}@x.vn`, "Báo cáo viên", orgB.code, ""],
      ["B", "", "khong-phai-email", "Đại biểu", "", "BV"],
      ["C", "", `${unique("c")}@x.vn`, "Khách", "", ""]
    ]));
    assert.deepEqual(bad.errors.map((error) => error.row), [2, 3, 4], "đơn vị ngoài phạm vi cũng báo theo dòng");
    assert.equal(await db.conferenceInvitation.count({ where: { conferenceId: created.id } }), 0, "có lỗi thì không thêm dòng nào");
    const emailA = `${unique("a")}@x.vn`;
    const good = await invitations.importInvitations(officer, created.id, await build([
      ["A", "TS", emailA, "Báo cáo viên", orgA.code, ""],
      ["B", "", `${unique("b")}@x.vn`, "Đại biểu", "", "Bệnh viện Y"]
    ]));
    assert.equal(good.created.length, 2);
    const rows = await db.conferenceInvitation.findMany({ where: { conferenceId: created.id }, orderBy: { fullName: "asc" } });
    assert.deepEqual(rows.map((row) => [row.kind, row.isInternal, row.organizationUnitId]), [["speaker", true, orgA.id], ["delegate", false, null]]);
    // Trùng khách mời đã có hoặc là chuyên viên phụ trách: báo theo dòng, không ghi dòng nào.
    const officerEmail = (await db.user.findUnique({ where: { id: officer.id } })).credentialEmail;
    const conflicts = await invitations.importInvitations(officer, created.id, await build([
      ["Mới", "", `${unique("n")}@x.vn`, "Đại biểu", "", ""],
      ["A lặp", "", emailA, "Đại biểu", "", ""],
      ["Chuyên viên", "", officerEmail, "Đại biểu", "", ""]
    ]));
    assert.deepEqual(conflicts.errors.map((error) => error.row), [3, 4]);
    assert.equal(await db.conferenceInvitation.count({ where: { conferenceId: created.id } }), 2);
  });

  it("enforces inbox notification filter, token invalidation on email change, re-invite after revoke, paper withdraw, officer handover, and update guards", async () => {
    const created = await newConference();
    await conferences.assignOfficer(head, created.id, { version: created.version, userId: officer.id });
    const guestEmail1 = `${unique("guest1")}@hvqy.test`;
    const guestEmail2 = `${unique("guest2")}@hvqy.test`;
    const reInviteEmail = `${unique("reinv")}@hvqy.test`;
    const speaker = await createUser("RESEARCHER_INTERNAL_USER", orgB, `${unique("spk")}@hvqy.test`);
    await invitations.addInvitations(officer, created.id, [
      { kind: "speaker", userId: speaker.id },
      { kind: "delegate", fullName: "Khách email", email: guestEmail1, isInternal: false, externalOrganization: "BV A" },
      { kind: "delegate", fullName: "Khách huỷ mời", email: reInviteEmail, isInternal: false }
    ]);
    const detail = (await conferences.detail(officer, created.id)).conference;
    await invitations.sendMailing(officer, created.id, { kind: "invitation", invitationIds: detail.invitations.map((item) => item.id) });

    // P18: inbox notification re-authorization cho khách mời và người ngoài.
    const speakerInbox = await notifications.list(speaker, 50);
    assert.ok(speakerInbox.notifications.some((n) => n.type === "conference" && n.title.includes(created.title)));
    const outsiderInbox = await notifications.list(otherStaff, 50);
    assert.equal(outsiderInbox.notifications.some((n) => n.body?.includes(created.title)), false);

    // P19: đổi email của lời mời đã gửi làm token cũ hết hiệu lực.
    const guestInv = detail.invitations.find((item) => item.email === guestEmail1);
    const oldToken = tokenFrom(sentMail.filter((mail) => mail.to === guestEmail1).at(-1).html);
    await invitations.updateInvitation(officer, created.id, guestInv.id, { email: guestEmail2 });
    await assert.rejects(invitations.publicLookup(oldToken, ctx), /không hợp lệ/);

    // P5: huỷ lời mời rồi mời lại cùng email thành công.
    const revInv = detail.invitations.find((item) => item.email === reInviteEmail);
    await invitations.revokeInvitation(officer, created.id, revInv.id, "Sai thông tin");
    const reAdded = await invitations.addInvitations(officer, created.id, [{ kind: "delegate", fullName: "Mời lại", email: reInviteEmail, isInternal: false }]);
    assert.equal(reAdded.created.length, 1);

    // P20: rút / huỷ báo cáo: bắt buộc lý do với chuyên viên, người ngoài không thấy, tác giả rút được.
    const spkInv = await db.conferenceInvitation.findFirst({ where: { conferenceId: created.id, userId: speaker.id } });
    await invitations.respondInApp(speaker, spkInv.id, { decision: "accept" });
    const paperRow = await db.conferencePaper.findFirst({ where: { invitationId: spkInv.id } });
    const paperVer = paperRow.updatedAt.toISOString();
    await assert.rejects(papers.withdraw(officer, paperRow.id, { version: paperVer }), /lý do/);
    await assert.rejects(papers.withdraw(otherStaff, paperRow.id, { version: paperVer, reason: "x" }), /Không tìm thấy/);
    const withdrawn = await papers.withdraw(speaker, paperRow.id, { version: paperVer });
    assert.equal(withdrawn.status, "withdrawn");

    // P22: sửa thông tin hội nghị kiểm tra phạm vi đơn vị và thứ tự hạn.
    await assert.rejects(conferences.update(officer, created.id, { version: await version(officer, created.id), hostOrganizationUnitId: orgB.id }), /Trưởng phòng/);
    await assert.rejects(conferences.update(head, created.id, { version: await version(head, created.id), abstractDeadline: new Date(daysFromNow(55)), fullPaperDeadline: new Date(daysFromNow(40)) }), /Hạn/);

    // P21: giao lại chuyên viên và thu hồi chuyên viên đổi quyền truy cập.
    await conferences.assignOfficer(head, created.id, { version: await version(head, created.id), userId: otherStaff.id });
    await assert.rejects(conferences.detail(officer, created.id), /Không tìm thấy/);
    assert.equal((await conferences.detail(otherStaff, created.id)).mode, "management");
    // Chuyên viên cũ được mời làm khách: thấy thư mời, không thấy lại thông báo quản lý cũ (kể cả khi lời mời bị huỷ).
    const officerInviteIds = async () => (await db.conferenceInvitation.findMany({ where: { conferenceId: created.id, userId: officer.id, status: "draft" } })).map((item) => item.id);
    await invitations.addInvitations(otherStaff, created.id, [{ kind: "delegate", userId: officer.id }]);
    const [firstInvite] = await officerInviteIds();
    await invitations.sendMailing(otherStaff, created.id, { kind: "invitation", invitationIds: [firstInvite] });
    await invitations.revokeInvitation(otherStaff, created.id, firstInvite, "Mời nhầm");
    assert.ok(await db.userNotification.findFirst({ where: { userId: officer.id, sourceType: "conference_management", sourceId: created.id } }), "chuyên viên cũ từng nhận thông báo quản lý của hội nghị này");
    const exOfficerInbox = (await notifications.list(officer, 50)).notifications;
    assert.ok(exOfficerInbox.some((n) => n.title === "Lời mời hội nghị đã được huỷ"));
    assert.equal(exOfficerInbox.some((n) => n.link === `/conferences/${created.id}`), false);
    // Mời lại sau khi huỷ: dòng lời mời đã huỷ không che lời mời mới.
    await invitations.addInvitations(otherStaff, created.id, [{ kind: "delegate", userId: officer.id }]);
    await invitations.sendMailing(otherStaff, created.id, { kind: "invitation", invitationIds: await officerInviteIds() });
    assert.equal((await conferences.detail(officer, created.id)).mode, "participant");
    await conferences.revokeOfficer(head, created.id, { version: await version(head, created.id), reason: "Thay đổi phân công" });
    await assert.rejects(conferences.detail(otherStaff, created.id), /Không tìm thấy/);
  });

  it("handles pending_activation invitees via email token and blocks responses after conference cancellation", async () => {
    const created = await newConference();
    await conferences.assignOfficer(head, created.id, { version: created.version, userId: officer.id });
    const pendingEmail = `${unique("pend")}@hvqy.test`;
    const pendingUser = await createUser("RESEARCHER_INTERNAL_USER", orgB, pendingEmail);
    await db.user.update({ where: { id: pendingUser.id }, data: { status: "pending_activation" } });
    const cancelAccount = await createUser("RESEARCHER_INTERNAL_USER", orgB, `${unique("acc")}@hvqy.test`);
    const cancelEmail = `${unique("canc")}@benhvien.test`;

    await invitations.addInvitations(officer, created.id, [
      { kind: "delegate", userId: pendingUser.id },
      { kind: "delegate", userId: cancelAccount.id },
      { kind: "delegate", fullName: "Khách huỷ HN", email: cancelEmail, isInternal: false }
    ]);
    const detail = (await conferences.detail(officer, created.id)).conference;
    const mailRes = await invitations.sendMailing(officer, created.id, { kind: "invitation", invitationIds: detail.invitations.map((item) => item.id) });
    assert.deepEqual({ sent: mailRes.sent, failed: mailRes.failed }, { sent: 3, failed: 0 });

    // P6: tài khoản pending_activation nhận email chứa token và kích hoạt được khi nhận lời.
    const pendingMail = sentMail.filter((mail) => mail.to === pendingEmail).at(-1);
    assert.ok(pendingMail, "tài khoản pending_activation phải nhận email kèm đường link");
    const pendingResp = await invitations.publicRespond({ token: tokenFrom(pendingMail.html), decision: "accept" }, ctx);
    assert.equal(pendingResp.account, "pending_activation");
    assert.match(pendingResp.activationPath, /^\/password-reset#mode=activation&token=/);

    // P2 + P23: huỷ hội nghị khoá cả respondInApp lẫn token công khai.
    const cancelToken = tokenFrom(sentMail.filter((mail) => mail.to === cancelEmail).at(-1).html);
    const cancelAccInv = await db.conferenceInvitation.findFirst({ where: { conferenceId: created.id, userId: cancelAccount.id } });
    await conferences.transition(head, created.id, "cancel", { version: await version(head, created.id), reason: "Hoãn tổ chức" });
    await assert.rejects(invitations.respondInApp(cancelAccount, cancelAccInv.id, { decision: "accept" }), /đã kết thúc hoặc đã huỷ/);
    await assert.rejects(invitations.publicLookup(cancelToken, ctx), /không hợp lệ/);
  });
});
