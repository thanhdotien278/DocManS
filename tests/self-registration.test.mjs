import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AuditLogService } from "../dist/apps/api/auth/audit-log.service.js";
import { AuthRateLimitService } from "../dist/apps/api/auth/auth-rate-limit.service.js";
import { AuthService } from "../dist/apps/api/auth/auth.service.js";
import { AuthStore } from "../dist/apps/api/auth/auth.store.js";
import { PasswordService } from "../dist/apps/api/auth/password.service.js";
import { MailService } from "../dist/apps/api/notifications/mail.service.js";
import { NotificationsService } from "../dist/apps/api/notifications/notifications.service.js";
import { approveRegistrationPipe, registerPipe } from "../dist/apps/api/registration/registration.dto.js";
import { RegistrationService } from "../dist/apps/api/registration/registration.service.js";

// Story 13.11: fake Prisma trong bộ nhớ, chỉ đủ cho các truy vấn của luồng tự đăng ký.
function createDb({ enabled = true } = {}) {
  const now = () => new Date();
  const db = {
    users: [
      { id: "cv-1", status: "active", systemRole: "RESEARCH_MANAGEMENT_STAFF" },
      { id: "tb-1", status: "active", systemRole: "RESEARCH_BOARD_HEAD" },
      { id: "tp-1", status: "active", systemRole: "RESEARCH_MANAGEMENT_HEAD" }
    ],
    tokens: [],
    profiles: [],
    links: [],
    history: [],
    scopes: [],
    notifications: [],
    audits: [],
    params: { self_registration_enabled: enabled ? "true" : "false" },
    units: [{ id: "unit-1", code: "K1", name: "Khoa 1", status: "active" }]
  };
  const matches = (user, where = {}) => Object.entries(where).every(([key, value]) => {
    if (key === "OR") return value.some((clause) => matches(user, clause));
    if (key === "activationTokens") return !db.tokens.some((token) => token.userId === user.id && token.usedAt === null && token.expiresAt > value.none.expiresAt.gt);
    if (value && typeof value === "object" && "in" in value) return value.in.includes(user[key]);
    return user[key] === value;
  });
  const prisma = {
    db,
    async $transaction(callback) { return callback(prisma); },
    async $queryRaw() { return []; },
    systemParameter: { async findUnique({ where }) { return where.key in db.params ? { value: db.params[where.key] } : null; } },
    user: {
      async findUnique({ where }) { return db.users.find((user) => matches(user, where)) ?? null; },
      async findFirst({ where }) { return db.users.find((user) => matches(user, where)) ?? null; },
      async findMany({ where }) { return db.users.filter((user) => matches(user, where)); },
      async create({ data }) {
        if (db.users.some((user) => (data.usernameKey && user.usernameKey === data.usernameKey) || (data.credentialEmail && user.credentialEmail === data.credentialEmail))) throw Object.assign(new Error("unique"), { code: "P2002" });
        const user = { id: `user-${db.users.length + 1}`, credentialVersion: 0, createdAt: now(), ...data };
        db.users.push(user);
        return user;
      },
      async update({ where, data }) {
        const user = db.users.find((candidate) => candidate.id === where.id);
        const { organizationScopes, credentialVersion, ...rest } = data;
        Object.assign(user, rest);
        if (credentialVersion?.increment) user.credentialVersion += credentialVersion.increment;
        if (organizationScopes) db.scopes.push({ userId: user.id, ...organizationScopes.create });
        return user;
      }
    },
    accountActivationToken: {
      async create({ data }) { const token = { id: `token-${db.tokens.length + 1}`, usedAt: null, ...data }; db.tokens.push(token); return token; },
      async findFirst({ where }) { return db.tokens.find((token) => token.tokenHash === where.tokenHash && token.usedAt === null && token.expiresAt > now()) ?? null; },
      async updateMany({ where, data }) {
        const hits = db.tokens.filter((token) => (!where.id || token.id === where.id) && (!where.userId || token.userId === where.userId) && token.usedAt === null);
        hits.forEach((token) => Object.assign(token, data));
        return { count: hits.length };
      }
    },
    session: { async updateMany() { return { count: 0 }; } },
    passwordResetToken: { async updateMany() { return { count: 0 }; } },
    organizationUnit: {
      async findFirst({ where }) { return db.units.find((unit) => unit.id === where.id && unit.status === where.status) ?? null; },
      async findMany() { return db.units; }
    },
    researcherProfile: { async create({ data }) { const profile = { id: `profile-${db.profiles.length + 1}`, ...data }; db.profiles.push(profile); return profile; } },
    researcherProfileAccountLink: { async create({ data }) { db.links.push(data); } },
    researcherProfileHistory: { async create({ data }) { db.history.push(data); } },
    userNotification: {
      async createMany({ data }) { db.notifications.push(...data); return { count: data.length }; },
      async findMany({ where }) { return db.notifications.filter((row) => row.userId === where.userId).map((row, index) => ({ id: `n-${index}`, readAt: null, createdAt: now(), ...row })); }
    },
    auditLog: { async create({ data }) { db.audits.push(data); return { id: `audit-${db.audits.length}`, ...data, timestamp: now() }; } }
  };
  return prisma;
}

function createMail({ fail = false } = {}) {
  const sent = [];
  return {
    sent,
    configuration() { return { loginUrl: "http://localhost:3000/login" }; },
    activationUrl: MailService.prototype.activationUrl,
    async sendAccountActivation(input) { if (fail) throw new Error("smtp down"); sent.push(input); },
    async sendText(input) { sent.push(input); }
  };
}

function createRegistration(options = {}) {
  const prisma = options.prisma ?? createDb(options);
  const mail = options.mail ?? createMail();
  const password = new PasswordService();
  const service = new RegistrationService(prisma, new AuditLogService(prisma), mail, password, new AuthRateLimitService());
  return { service, prisma, mail, password };
}

const input = (overrides = {}) => registerPipe.transform({ email: " New.User@Example.com ", username: "New.User", fullName: "Nguyễn Văn A", accountType: "INTERNAL", ...overrides });
const actor = (systemRole, id = "cv-1") => ({ id, username: id, displayName: id, systemRole, unit: "", organizationScopes: [] });

async function registerAndVerify(registration, overrides) {
  await registration.service.register(input(overrides), { ip: "10.0.0.1" });
  const raw = new URL(registration.mail.sent.at(-1).activationUrl).searchParams.get("token");
  const store = new AuthStore(registration.prisma);
  return store.completeAccountActivation(registration.password.hashResetToken(raw), await registration.password.hashPassword("ValidPassword1"));
}

describe("Story 13.11 self registration", () => {
  it("pipe normalizes email/username and rejects email-shaped usernames", () => {
    assert.deepEqual(input(), { email: "new.user@example.com", username: "new.user", fullName: "Nguyễn Văn A", accountType: "INTERNAL" });
    // The name is echoed into mail and the profile: one line of letters, spaces and . ' - only.
    for (const fullName of ["A\nBcc: x@evil.test", "<b>A</b>", "A https://evil.test"]) assert.throws(() => input({ fullName }), { name: "BadRequestException" });
    assert.equal(input({ fullName: "Trần Thị Mai-Anh Jr." }).fullName, "Trần Thị Mai-Anh Jr.");
    assert.throws(() => input({ username: "a@b.vn" }), { name: "BadRequestException" });
    assert.throws(() => input({ username: "ab" }), { name: "BadRequestException" });
    assert.throws(() => input({ accountType: "STAFF" }), { name: "BadRequestException" });
    assert.equal(approveRegistrationPipe.transform({ organizationUnitId: "unit-1", accountType: "INTERNAL", externalAffiliation: "X" }).externalAffiliation, undefined);
  });

  it("returns 404 while the toggle is off", async () => {
    const { service } = createRegistration({ enabled: false });
    await assert.rejects(() => service.register(input(), {}), { name: "NotFoundException" });
  });

  it("creates an unverified account and mails a 48h activation link", async () => {
    const { service, prisma, mail } = createRegistration();
    const result = await service.register(input(), { ip: "10.0.0.1" });
    assert.match(result.message, /kiểm tra hộp thư/);
    const user = prisma.db.users.at(-1);
    assert.equal(user.status, "pending_email_verification");
    assert.equal(user.usernameKey, "new.user");
    assert.equal(user.systemRole, "RESEARCHER_INTERNAL_USER");
    assert.equal(prisma.db.tokens[0].createdById, user.id);
    assert.match(mail.sent[0].activationUrl, /\/password-reset\?mode=activation&token=/);
    assert.equal(JSON.stringify(prisma.db.audits).includes(new URL(mail.sent[0].activationUrl).searchParams.get("token")), false);
  });

  it("does not reveal an existing email and sends no mail", async () => {
    const { service, prisma, mail } = createRegistration();
    prisma.db.users.push({ id: "old", status: "active", credentialEmail: "new.user@example.com" });
    const before = prisma.db.users.length;
    const result = await service.register(input(), {});
    assert.match(result.message, /Nếu thông tin hợp lệ/);
    assert.equal(prisma.db.users.length, before);
    assert.equal(mail.sent.length, 0);
  });

  it("reports a taken username as 409", async () => {
    const { service, prisma } = createRegistration();
    prisma.db.users.push({ id: "old", status: "active", usernameKey: "new.user" });
    await assert.rejects(() => service.register(input(), {}), { status: 409 });
  });

  it("releases an expired unverified holder so the same username/email can register again", async () => {
    const { service, prisma } = createRegistration();
    await service.register(input(), {});
    prisma.db.tokens[0].expiresAt = new Date(Date.now() - 1000);
    await service.register(input(), {});
    const [first, second] = prisma.db.users.slice(-2);
    assert.equal(first.status, "expired");
    assert.equal(first.usernameKey, null);
    assert.equal(first.credentialEmail, null);
    assert.equal(second.status, "pending_email_verification");
  });

  it("answers immediately and releases the account in the background when the verification mail fails", async () => {
    const { service, prisma } = createRegistration({ mail: createMail({ fail: true }) });
    assert.match((await service.register(input(), {})).message, /kiểm tra hộp thư/);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(prisma.db.users.at(-1).status, "expired");
    assert.equal(prisma.db.users.at(-1).credentialEmail, null);
  });

  it("rate limits every attempt per email", async () => {
    const { service } = createRegistration();
    for (let index = 0; index < 5; index += 1) await service.register(input({ username: `user${index}` }), { ip: `10.0.0.${index}` }).catch(() => {});
    await assert.rejects(() => service.register(input({ username: "user9" }), { ip: "10.0.0.99" }), { status: 429 });
  });

  it("verifying the email moves the account to pending_approval and notifies QT/TB/CV only", async () => {
    const registration = createRegistration();
    const result = await registerAndVerify(registration);
    assert.equal(result.status, "pending_approval");
    const notified = registration.prisma.db.notifications.map((row) => row.userId).sort();
    assert.deepEqual(notified, ["cv-1", "tb-1"]);
    const inbox = new NotificationsService(registration.prisma, null, null, null);
    assert.equal((await inbox.list(actor("RESEARCH_MANAGEMENT_STAFF"), 20)).notifications.length, 1);
    registration.prisma.db.notifications.push({ ...registration.prisma.db.notifications[0], userId: "tp-1" });
    assert.equal((await inbox.list(actor("RESEARCH_MANAGEMENT_HEAD", "tp-1"), 20)).notifications.length, 0);
  });

  it("login tells a pending user to wait only after the correct password", async () => {
    const registration = createRegistration();
    await registerAndVerify(registration);
    const audit = new AuditLogService(registration.prisma);
    const auth = new AuthService(audit, new AuthRateLimitService(), new AuthStore(registration.prisma), registration.password);
    await assert.rejects(() => auth.login({ username: "new.user@example.com", password: "ValidPassword1" }, {}), { response: { message: "Tài khoản đang chờ cán bộ quản lý khoa học duyệt.", code: "ACCOUNT_PENDING_APPROVAL" } });
    await assert.rejects(() => auth.login({ username: "new.user", password: "WrongPassword1" }, {}), { response: { message: "Tên đăng nhập hoặc mật khẩu không hợp lệ." } });
  });

  it("approval is limited to QT/TB/CV, creates the profile and scope, and a second decision gets 409", async () => {
    const registration = createRegistration();
    await registerAndVerify(registration);
    const user = registration.prisma.db.users.at(-1);
    const body = { organizationUnitId: "unit-1", accountType: "EXTERNAL", externalAffiliation: "Bệnh viện X" };
    await assert.rejects(() => registration.service.approve(actor("RESEARCH_MANAGEMENT_HEAD", "tp-1"), user.id, body), { name: "ForbiddenException" });
    await registration.service.approve(actor("RESEARCH_BOARD_HEAD", "tb-1"), user.id, body);
    assert.equal(user.status, "active");
    assert.equal(user.systemRole, "EXTERNAL_RESEARCHER_USER");
    assert.deepEqual(registration.prisma.db.scopes, [{ userId: user.id, organizationUnitId: "unit-1", isPrimary: true }]);
    const profile = registration.prisma.db.profiles[0];
    assert.equal(profile.profileType, "EXTERNAL");
    assert.equal(profile.linkedUserId, user.id);
    assert.equal(profile.externalAffiliation, "Bệnh viện X");
    assert.match(registration.mail.sent.at(-1).subject, /đã được duyệt/);
    await assert.rejects(() => registration.service.reject(actor("RESEARCH_MANAGEMENT_STAFF"), user.id, { reason: "x" }), { status: 409 });
  });

  it("rejection frees the email and username and mails the reason", async () => {
    const registration = createRegistration();
    await registerAndVerify(registration);
    const user = registration.prisma.db.users.at(-1);
    await registration.service.reject(actor("SYSTEM_ADMIN", "qt-1"), user.id, { reason: "Không xác định được đơn vị" });
    assert.equal(user.status, "rejected");
    assert.equal(user.usernameKey, null);
    assert.equal(user.credentialEmail, null);
    assert.match(registration.mail.sent.at(-1).text, /Không xác định được đơn vị/);
    assert.equal(registration.prisma.db.audits.at(-1).beforeFacts.email, "new.user@example.com");
  });
});
