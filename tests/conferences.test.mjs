import assert from "node:assert/strict";
import test from "node:test";
import { canConference, canCreateConference, canReadConferenceManagement, conferenceActions, conferenceManagementFilter, isConferenceParticipant } from "../dist/apps/api/conferences/conference-access.js";
import { paperStatusAfterSubmit, submissionBlockReason } from "../dist/apps/api/conferences/conference-workflow.js";
import { createConferencePipe, readInvitationInput, readSubmitPaper, sendMailingPipe, updateConferencePipe } from "../dist/apps/api/conferences/conferences.dto.js";
import { renderConferenceMailHtml, renderConferenceMailText } from "../dist/apps/api/conferences/conference-mail-templates.js";

// Hội nghị khoa học: phân quyền, quy tắc nộp bài, kiểm tra dữ liệu, mẫu thư.

const actor = (id, systemRole, scopes = ["unit-a"]) => ({ id, username: id, displayName: id, systemRole, unit: "", organizationScopes: scopes.map((scope) => ({ id: scope, code: scope, name: scope })) });
const conference = (overrides = {}) => ({ status: "inviting", hostOrganizationUnitId: "unit-a", createdById: "head", activeOfficerId: "officer", ...overrides });

const head = actor("head", "RESEARCH_MANAGEMENT_HEAD");
const headB = actor("head-b", "RESEARCH_MANAGEMENT_HEAD", ["unit-b"]);
const officer = actor("officer", "RESEARCH_MANAGEMENT_STAFF");
const otherStaff = actor("staff", "RESEARCH_MANAGEMENT_STAFF");
const deputy = actor("deputy", "RESEARCH_MANAGEMENT_DEPUTY_HEAD");
const director = actor("director", "LEADERSHIP_APPROVAL_AUTHORITY", []);
const researcher = actor("researcher", "RESEARCHER_INTERNAL_USER");
const admin = actor("admin", "SYSTEM_ADMIN", []);

test("only the head creates conferences, for a host unit in their own scope", () => {
  assert.equal(canCreateConference(head, "unit-a"), true);
  assert.equal(canCreateConference(head, "unit-b"), false);
  for (const user of [officer, deputy, director, researcher, admin]) assert.equal(canCreateConference(user, "unit-a"), false, user.id);
});

test("the head assigns the officer; only the assigned officer runs invitations and mailings", () => {
  assert.equal(canConference(head, conference({ status: "draft", activeOfficerId: null }), "officer.assign"), true);
  assert.equal(canConference(headB, conference(), "officer.assign"), false);
  assert.equal(canConference(headB, conference({ createdById: "head-b" }), "officer.assign"), true, "người tạo vẫn quản lý");
  assert.equal(canConference(officer, conference(), "officer.assign"), false);
  for (const action of ["invitation.manage", "mailing.send", "paper.review", "close-submission"]) {
    assert.equal(canConference(officer, conference(), action), true, action);
    assert.equal(canConference(otherStaff, conference(), action), false, action);
    assert.equal(canConference(head, conference(), action), false, `Trưởng phòng không làm thay chuyên viên: ${action}`);
  }
  // Tài khoản đổi vai trò thì mất quyền phụ trách dù dòng giao việc còn.
  assert.equal(canConference({ ...officer, systemRole: "RESEARCHER_INTERNAL_USER" }, conference(), "mailing.send"), false);
  assert.equal(canConference(officer, conference({ status: "draft" }), "mailing.send"), false);
  // Kỷ yếu tải và gửi được cả sau khi hội nghị kết thúc; ngoài ra không còn thao tác nào.
  assert.deepEqual(conferenceActions(officer, conference({ status: "completed" })), ["export", "proceedings.manage"]);
  // Chương trình chi tiết lập sau khi đóng nhận bài, chốt lại được sau khi đã gửi.
  for (const status of ["submission_closed", "program_published"]) assert.equal(canConference(officer, conference({ status }), "program.manage"), true, status);
  for (const status of ["preparing", "inviting", "completed"]) assert.equal(canConference(officer, conference({ status }), "program.manage"), false, status);
  assert.equal(canConference(head, conference({ status: "submission_closed" }), "program.manage"), false);
  assert.equal(canConference(officer, conference({ status: "inviting" }), "proceedings.manage"), false);
  assert.deepEqual(conferenceActions(head, conference({ status: "cancelled" })), ["export"]);
});

test("drafts are visible to the head only; oversight reads later states", () => {
  const draft = conference({ status: "draft", activeOfficerId: null });
  assert.equal(canReadConferenceManagement(head, draft), true);
  for (const user of [deputy, director, otherStaff, researcher, admin]) assert.equal(canReadConferenceManagement(user, draft), false, user.id);
  assert.equal(canReadConferenceManagement(deputy, conference()), true);
  assert.equal(canReadConferenceManagement(actor("deputy-b", "RESEARCH_MANAGEMENT_DEPUTY_HEAD", ["unit-b"]), conference()), false);
  assert.equal(canReadConferenceManagement(director, conference()), true);
  for (const user of [otherStaff, researcher, admin]) assert.equal(canReadConferenceManagement(user, conference()), false, user.id);
  assert.equal(conferenceManagementFilter(researcher), null);
  assert.deepEqual(conferenceManagementFilter(director), { status: { not: "draft" } });
});

test("invitees see the conference only once the invitation was sent to them or accepted", () => {
  for (const status of ["sent", "accepted"]) assert.equal(isConferenceParticipant(researcher, { userId: "researcher", status }), true, status);
  for (const status of ["draft", "declined", "revoked"]) assert.equal(isConferenceParticipant(researcher, { userId: "researcher", status }), false, status);
  assert.equal(isConferenceParticipant(researcher, { userId: "someone-else", status: "accepted" }), false);
});

test("speakers submit before the deadline without abstract approval; afterwards only on an open revision", () => {
  const base = { conferenceStatus: "inviting", paperStatus: "awaiting_abstract", abstractDeadline: new Date("2030-01-10T16:59:59Z"), fullPaperDeadline: new Date("2030-02-10T16:59:59Z"), hasAbstract: false, openRevisions: [] };
  const before = new Date("2030-01-05T00:00:00Z");
  assert.equal(submissionBlockReason({ ...base, kind: "abstract", now: before }), null);
  assert.match(submissionBlockReason({ ...base, kind: "full_paper", now: before }), /tóm tắt trước/);
  // Có tóm tắt là nộp toàn văn được ngay, không chờ chấp nhận.
  assert.equal(submissionBlockReason({ ...base, paperStatus: "abstract_submitted", hasAbstract: true, kind: "full_paper", now: before }), null);
  const late = new Date("2030-01-11T00:00:00Z");
  assert.match(submissionBlockReason({ ...base, kind: "abstract", now: late }), /quá hạn nộp tóm tắt/);
  const revision = [{ kind: "abstract", dueAt: new Date("2030-01-20T16:59:59Z") }];
  assert.equal(submissionBlockReason({ ...base, paperStatus: "abstract_submitted", hasAbstract: true, kind: "abstract", openRevisions: revision, now: late }), null);
  // Yêu cầu sửa còn hạn vẫn cho nộp lại sau khi đã đóng nhận bài; không có yêu cầu thì không.
  assert.equal(submissionBlockReason({ ...base, conferenceStatus: "submission_closed", paperStatus: "abstract_submitted", hasAbstract: true, kind: "abstract", openRevisions: revision, now: late }), null);
  assert.match(submissionBlockReason({ ...base, conferenceStatus: "submission_closed", paperStatus: "abstract_submitted", hasAbstract: true, kind: "full_paper", openRevisions: revision, now: before }), /Đã đóng nhận bài/);
  assert.match(submissionBlockReason({ ...base, paperStatus: "withdrawn", kind: "abstract", now: before }), /đã rút/);
  assert.match(submissionBlockReason({ ...base, conferenceStatus: "preparing", kind: "abstract", now: before }), /không ở giai đoạn nhận bài/);
  assert.equal(paperStatusAfterSubmit("full_paper_submitted", "abstract"), "full_paper_submitted", "nộp lại tóm tắt không kéo lùi trạng thái");
  assert.equal(paperStatusAfterSubmit("awaiting_abstract", "abstract"), "abstract_submitted");
});

test("conference input keeps deadlines in order and invitations need a unit when internal", () => {
  const valid = { title: "Hội nghị KH 2030", hostOrganizationUnitId: "unit-a", location: "Hội trường A", startsAt: "2030-03-01T17:00:00.000Z", endsAt: "2030-03-02T16:59:59.999Z", abstractDeadline: "2030-01-10T16:59:59.999Z", fullPaperDeadline: "2030-02-10T16:59:59.999Z" };
  assert.equal(createConferencePipe.transform(valid).level, "academy");
  assert.throws(() => createConferencePipe.transform({ ...valid, fullPaperDeadline: "2030-01-01T00:00:00.000Z" }), /sau hạn nộp tóm tắt/);
  assert.throws(() => createConferencePipe.transform({ ...valid, fullPaperDeadline: "2030-04-01T00:00:00.000Z" }), /trước khi hội nghị kết thúc/);
  assert.throws(() => updateConferencePipe.transform({ title: "x" }), /phiên bản/);
  assert.throws(() => readInvitationInput({ kind: "speaker", fullName: "A", email: "a@x.vn", isInternal: true }), /Đơn vị trong Học viện/);
  assert.throws(() => readInvitationInput({ kind: "speaker", fullName: "A" }), /Cần email/);
  assert.throws(() => readInvitationInput({ kind: "guest", fullName: "A", email: "a@x.vn" }), /báo cáo viên hoặc đại biểu/);
  assert.equal(readInvitationInput({ kind: "delegate", fullName: "A", email: " A@X.VN " }).email, "a@x.vn");
  assert.deepEqual(readInvitationInput({ kind: "speaker", userId: "u1", fullName: "ignored" }), { kind: "speaker", userId: "u1" });
  assert.throws(() => sendMailingPipe.transform({ kind: "change_notice", invitationIds: ["a"] }), /nội dung thay đổi/);
  assert.deepEqual(sendMailingPipe.transform({ kind: "reminder", invitationIds: ["a", "a", "b"] }).invitationIds, ["a", "b"]);
  const version = new Date().toISOString();
  assert.throws(() => readSubmitPaper({ version, kind: "abstract", title: "T" }), /Nội dung tóm tắt/);
  assert.deepEqual(readSubmitPaper({ version, kind: "abstract", title: "T", abstractText: "S", authors: JSON.stringify([{ fullName: "A", corresponding: "true" }]) }).authors, [{ fullName: "A", organization: undefined, corresponding: true }]);
});

test("invitation mail carries time and location, deadlines for speakers, and escapes HTML", () => {
  const facts = { title: "Hội nghị <KH>", location: "Hội trường A", startsAt: new Date("2030-03-01T17:00:00Z"), endsAt: new Date("2030-03-02T16:59:59Z"), responseDeadline: null, abstractDeadline: new Date("2030-01-10T16:59:59Z"), fullPaperDeadline: new Date("2030-02-10T16:59:59Z"), hostUnitName: "Học viện Quân y" };
  const speaker = renderConferenceMailText({ kind: "invitation", conference: facts, recipient: { fullName: "Nguyễn A", academicTitle: "PGS.TS", kind: "speaker" }, responseUrl: "https://app/conference-invitation?token=abc" });
  assert.match(speaker, /Kính gửi PGS.TS Nguyễn A/);
  assert.match(speaker, /Thời gian: 02\/03\/2030 – 02\/03\/2030|Thời gian: 02\/03\/2030/);
  assert.match(speaker, /Địa điểm: Hội trường A/);
  assert.match(speaker, /Hạn nộp tóm tắt: 10\/01\/2030/);
  assert.match(speaker, /token=abc/);
  const delegate = renderConferenceMailText({ kind: "invitation", conference: facts, recipient: { fullName: "B", academicTitle: null, kind: "delegate" } });
  assert.doesNotMatch(delegate, /Hạn nộp/);
  assert.doesNotMatch(renderConferenceMailHtml({ kind: "invitation", conference: facts, recipient: { fullName: "B", academicTitle: null, kind: "delegate" } }), /<KH>/);
});

// ---- Đợt 2: xếp lịch ----
import { scheduleProgram, scheduleSession } from "../dist/apps/api/conferences/conference-scheduling.js";
import { sessionInputPipe } from "../dist/apps/api/conferences/conferences.dto.js";

const at = (hhmm, day = "2030-03-02") => new Date(`${day}T${hhmm}:00+07:00`);
const hm = (date) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(date);
const slot = (paperId, position, extra = {}) => ({ paperId, ownerId: `owner-${paperId}`, position, manuallyAdjusted: false, startsAt: null, endsAt: null, ...extra });
const session = (overrides = {}) => ({ id: "s1", kind: "track", name: "Tiểu ban 1", room: "P1", startsAt: at("08:00"), endsAt: at("09:00"), slotMinutes: null, breaks: [], slots: [], ...overrides });

test("papers are placed in order with the slot length, skipping breaks", () => {
  const result = scheduleSession(session({ breaks: [{ startsAt: at("08:20"), endsAt: at("08:30"), label: "Giải lao" }], slots: [slot("a", 0), slot("b", 1), slot("c", 2)] }), 15);
  assert.deepEqual(result.slots.map((item) => [item.paperId, hm(item.startsAt), hm(item.endsAt)]), [["a", "08:00", "08:15"], ["b", "08:30", "08:45"], ["c", "08:45", "09:00"]]);
  assert.deepEqual(result.issues, []);
});

test("overflow is flagged with the missing minutes instead of shortening talks", () => {
  const result = scheduleSession(session({ slotMinutes: 25, slots: [slot("a", 0), slot("b", 1), slot("c", 2)] }), 15);
  assert.equal(hm(result.slots[2].endsAt), "09:15");
  assert.equal(result.slots[2].overflowMinutes, 15);
  assert.equal(result.issues[0].code, "OVERFLOW");
  assert.match(result.issues[0].message, /vượt khung 15 phút/);
});

test("manually timed papers stay put and others fill around them", () => {
  const manual = slot("m", 1, { manuallyAdjusted: true, startsAt: at("08:10"), endsAt: at("08:25") });
  const result = scheduleSession(session({ slots: [slot("a", 0), manual, slot("b", 2)] }), 15);
  assert.deepEqual(result.slots.map((item) => [item.paperId, hm(item.startsAt)]), [["a", "08:25"], ["m", "08:10"], ["b", "08:40"]]);
  const outside = scheduleSession(session({ slots: [slot("x", 0, { manuallyAdjusted: true, startsAt: at("07:50"), endsAt: at("08:05") })] }), 15);
  assert.equal(outside.issues[0].code, "MANUAL_OUTSIDE_SESSION");
});

test("plenary runs alone; tracks may run in parallel but not in the same room or with the same speaker", () => {
  const plenary = session({ id: "p", kind: "plenary", name: "Toàn thể", room: "Hội trường", startsAt: at("08:00"), endsAt: at("10:00") });
  const t1 = session({ id: "t1", name: "Tiểu ban 1", room: "P1", startsAt: at("10:00"), endsAt: at("11:00"), slots: [slot("a", 0)] });
  const t2 = session({ id: "t2", name: "Tiểu ban 2", room: "P2", startsAt: at("10:00"), endsAt: at("11:00"), slots: [slot("b", 0)] });
  assert.deepEqual(scheduleProgram([plenary, t1, t2], 15).issues, [], "tiểu ban song song sau phiên toàn thể là hợp lệ");
  const clash = scheduleProgram([plenary, { ...t1, startsAt: at("09:30") }], 15).issues;
  assert.equal(clash[0].code, "PLENARY_OVERLAP");
  assert.equal(scheduleProgram([t1, { ...t2, room: "p1 " }], 15).issues[0].code, "ROOM_OVERLAP");
  const sameSpeaker = scheduleProgram([t1, { ...t2, slots: [{ ...slot("b", 0), ownerId: "owner-a" }] }], 15).issues;
  assert.equal(sameSpeaker[0].code, "SPEAKER_OVERLAP");
  const twoPlenaries = scheduleProgram([plenary, { ...plenary, id: "p2", name: "Toàn thể 2", startsAt: at("14:00"), endsAt: at("15:00") }], 15).issues;
  assert.equal(twoPlenaries[0].code, "PLENARY_SAME_DAY");
});

test("session input keeps breaks inside the session", () => {
  const base = { kind: "track", name: "Tiểu ban Nội", startsAt: at("08:00").toISOString(), endsAt: at("11:00").toISOString() };
  assert.equal(sessionInputPipe.transform(base).slotMinutes, null);
  assert.throws(() => sessionInputPipe.transform({ ...base, breaks: [{ startsAt: at("07:30").toISOString(), endsAt: at("08:10").toISOString() }] }), /nằm trong khung giờ/);
  assert.throws(() => sessionInputPipe.transform({ ...base, kind: "room" }), /phiên toàn thể hoặc tiểu ban/);
  assert.throws(() => sessionInputPipe.transform({ ...base, slotMinutes: 0 }), /từ 1 đến 240/);
});

// ---- Thống kê ----
import { computeConferenceStats, rate } from "../dist/apps/api/conferences/conference-stats.js";
import { readStatsFilters } from "../dist/apps/api/conferences/conferences.dto.js";

const inv = (kind, status, paper = null, extra = {}) => ({ kind, status, unitName: "Khoa Nội", isInternal: true, paper, ...extra });
const statsConference = (overrides = {}) => ({ id: "c1", code: "HN-2030-001", title: "HN 1", level: "academy", status: "program_published", startsAt: new Date("2030-03-01T17:00:00Z"), hostUnitId: "u1", hostUnitName: "Phòng KHQS", invitations: [], sessions: [], ...overrides });

test("conference stats count sent invitations, active speakers and rates; cancelled conferences only appear by status", () => {
  const c1 = statsConference({
    invitations: [
      inv("speaker", "accepted", { status: "scheduled", hasAbstract: true, hasFullPaper: true }),
      inv("speaker", "accepted", { status: "abstract_submitted", hasAbstract: true, hasFullPaper: false }, { isInternal: false, unitName: null }),
      inv("speaker", "accepted", { status: "withdrawn", hasAbstract: true, hasFullPaper: true }),
      inv("delegate", "declined"),
      inv("delegate", "sent"),
      inv("speaker", "draft"),
      inv("delegate", "revoked")
    ],
    sessions: [{ kind: "plenary", name: "Toàn thể", papers: 1 }]
  });
  const cancelled = statsConference({ id: "c2", code: "HN-2030-002", status: "cancelled", invitations: [inv("delegate", "accepted")] });
  const stats = computeConferenceStats([c1, cancelled]);
  assert.equal(stats.totals.conferences, 2);
  assert.equal(stats.totals.active, 1);
  assert.deepEqual({ invited: stats.totals.invited, accepted: stats.totals.accepted, declined: stats.totals.declined, awaiting: stats.totals.awaiting }, { invited: 5, accepted: 3, declined: 1, awaiting: 1 }, "chưa gửi và đã huỷ không tính; hội nghị huỷ không tính");
  assert.deepEqual({ speakers: stats.totals.speakers, abstracts: stats.totals.abstracts, fullPapers: stats.totals.fullPapers, scheduled: stats.totals.scheduled, withdrawn: stats.totals.withdrawn }, { speakers: 2, abstracts: 2, fullPapers: 1, scheduled: 1, withdrawn: 1 });
  assert.equal(stats.totals.acceptanceRate, 60);
  assert.equal(stats.totals.fullPaperRate, 50);
  assert.deepEqual(stats.speakersByUnit.map((row) => [row.label, row.count]), [["Khoa Nội", 1], ["Ngoài Học viện", 1]]);
  assert.deepEqual(stats.byStatus.map((row) => row.key).sort(), ["cancelled", "program_published"]);
  assert.equal(stats.tracks.length, 1, "phiên của hội nghị huỷ không tính");
  assert.equal(stats.perConference.find((row) => row.id === "c2").acceptanceRate, 100, "bảng theo hội nghị vẫn hiện số của hội nghị huỷ");
  assert.equal(rate(0, 0), null, "không có mẫu số thì không phải 0%");
});

test("conference stats filter by Vietnamese year, host unit and level, with options from the unfiltered set", () => {
  // 31/12/2030 23:00 giờ Việt Nam là năm 2030 dù theo UTC vẫn là 31/12.
  const late = statsConference({ id: "a", startsAt: new Date("2030-12-31T16:00:00Z") });
  const next = statsConference({ id: "b", startsAt: new Date("2030-12-31T17:30:00Z"), hostUnitId: "u2", hostUnitName: "Khoa Nội", level: "national" });
  assert.deepEqual(computeConferenceStats([late, next], { year: 2030 }).perConference.map((row) => row.id), ["a"]);
  assert.deepEqual(computeConferenceStats([late, next], { year: 2031 }).perConference.map((row) => row.id), ["b"]);
  assert.deepEqual(computeConferenceStats([late, next], { hostUnitId: "u2" }).perConference.map((row) => row.id), ["b"]);
  const filtered = computeConferenceStats([late, next], { level: "academy" });
  assert.deepEqual(filtered.perConference.map((row) => row.id), ["a"]);
  assert.deepEqual(filtered.options.years, [2031, 2030]);
  assert.equal(filtered.options.hostUnits.length, 2);
  assert.deepEqual(readStatsFilters({ year: "2030", unitId: "u1", level: "national" }), { year: 2030, hostUnitId: "u1", level: "national" });
  assert.throws(() => readStatsFilters({ year: "abc" }), /Năm không hợp lệ/);
  assert.throws(() => readStatsFilters({ level: "galaxy" }), /Cấp hội nghị/);
});

import { accountUnitId } from "../dist/apps/api/conferences/conference-invitations.service.js";

test("an invited account's unit is its primary scope, its only scope, or none (no arbitrary pick)", () => {
  assert.equal(accountUnitId([{ organizationUnitId: "a", isPrimary: false }, { organizationUnitId: "b", isPrimary: true }]), "b");
  assert.equal(accountUnitId([{ organizationUnitId: "a", isPrimary: false }]), "a");
  assert.equal(accountUnitId([{ organizationUnitId: "a", isPrimary: false }, { organizationUnitId: "b", isPrimary: false }]), null);
  assert.equal(accountUnitId([]), null);
});
