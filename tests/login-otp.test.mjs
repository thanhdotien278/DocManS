import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ForbiddenException, HttpException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { AuthRateLimitService } from "../dist/apps/api/auth/auth-rate-limit.service.js";
import { AuthService } from "../dist/apps/api/auth/auth.service.js";
import { hashLoginOtp, loginOtpApplies, loginOtpMode, LoginOtpService, maskEmail } from "../dist/apps/api/auth/login-otp.js";

function createFakes({ mailFail = false } = {}) {
  const rows = new Map();
  let seq = 0;
  const prisma = {
    loginChallenge: {
      create: async ({ data }) => {
        const row = { id: `ch-${++seq}`, attempts: 0, sendCount: 1, consumedAt: null, ...data };
        rows.set(row.id, row);
        return { ...row };
      },
      findUnique: async ({ where: { id } }) => (rows.get(id) ? { ...rows.get(id) } : null),
      update: async ({ where: { id }, data }) => {
        const row = rows.get(id);
        for (const [key, value] of Object.entries(data)) {
          row[key] = value && typeof value === "object" && "increment" in value ? row[key] + value.increment : value;
        }
        return { ...row };
      },
      updateMany: async ({ where, data }) => {
        const row = rows.get(where.id);
        if (!row) return { count: 0 };
        if ("consumedAt" in where && row.consumedAt !== where.consumedAt) return { count: 0 };
        if (where.attempts?.lt !== undefined && !(row.attempts < where.attempts.lt)) return { count: 0 };
        if (where.sendCount !== undefined && row.sendCount !== where.sendCount) return { count: 0 };
        if (where.lastSentAt !== undefined && row.lastSentAt?.getTime() !== where.lastSentAt.getTime()) return { count: 0 };
        if (where.expiresAt?.gt !== undefined && !(row.expiresAt.getTime() > where.expiresAt.gt.getTime())) return { count: 0 };
        for (const [key, value] of Object.entries(data)) {
          row[key] = value && typeof value === "object" && "increment" in value ? row[key] + value.increment : value;
        }
        return { count: 1 };
      },
      delete: async ({ where: { id } }) => { rows.delete(id); }
    }
  };
  const sent = [];
  const mail = {
    sendText: async (input) => {
      if (mailFail) throw new Error("SMTP down");
      sent.push(input);
    }
  };
  return { rows, sent, service: new LoginOtpService(prisma, mail, new AuthRateLimitService()) };
}

const user = { id: "u1", username: "admin", displayName: "Quản trị", systemRole: "SYSTEM_ADMIN", status: "active", credentialVersion: 3, credentialEmail: "admin@vmmu.edu.vn", loginOtpEnabled: false };
const readCode = (html) => html.match(/letter-spacing:4px">(\d{6})</)[1];

describe("xác thực hai lớp qua thư (apps/api/src/auth/login-otp.ts)", () => {
  it("chế độ và vai trò: mặc định required-roles ở production, off ở dev; vai trò duyệt/quản trị bắt buộc", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    assert.equal(loginOtpMode(undefined), "required-roles");
    assert.equal(loginOtpMode("off"), "off");
    process.env.NODE_ENV = "test";
    assert.equal(loginOtpMode(undefined), "off");
    process.env.NODE_ENV = prev;

    assert.equal(loginOtpApplies({ systemRole: "SYSTEM_ADMIN", loginOtpEnabled: false }, "required-roles"), true);
    assert.equal(loginOtpApplies({ systemRole: "RESEARCHER_INTERNAL_USER", loginOtpEnabled: false }, "required-roles"), false);
    assert.equal(loginOtpApplies({ systemRole: "RESEARCHER_INTERNAL_USER", loginOtpEnabled: true }, "required-roles"), true);
    assert.equal(loginOtpApplies({ systemRole: "SYSTEM_ADMIN", loginOtpEnabled: true }, "off"), false);
    assert.equal(maskEmail("nguyenvan.a@vmmu.edu.vn"), "ng•••••••••@vmmu.edu.vn");
  });

  it("gửi mã 6 chữ số dạng băm, nhập đúng cấp quyền một lần, nhập lại bị từ chối", async () => {
    const { rows, sent, service } = createFakes();
    const challenge = await service.start(user, { ip: "127.0.0.1" });
    assert.equal(sent.length, 1);
    const code = readCode(sent[0].html);
    assert.equal(rows.get(challenge.challengeId).codeHash, hashLoginOtp(challenge.challengeId, code));
    assert.equal(JSON.stringify(rows.get(challenge.challengeId)).includes(code), false, "không lưu mã rõ");

    const verified = await service.verify(challenge.challengeId, code);
    assert.deepEqual(verified, { userId: "u1", credentialVersion: 3 });
    await assert.rejects(() => service.verify(challenge.challengeId, code), UnauthorizedException);
  });

  it("sai 5 lần làm lượt hết hiệu lực; mã hết hạn không dùng được", async () => {
    const { rows, sent, service } = createFakes();
    const { challengeId } = await service.start(user, {});
    const code = readCode(sent[0].html);
    for (let i = 1; i <= 5; i += 1) {
      await assert.rejects(() => service.verify(challengeId, "000000"), (error) => error.getResponse().attemptsLeft === 5 - i);
    }
    await assert.rejects(() => service.verify(challengeId, code), UnauthorizedException);

    const { challengeId: expiredId } = await service.start(user, {});
    rows.get(expiredId).expiresAt = new Date(Date.now() - 1000);
    await assert.rejects(() => service.verify(expiredId, readCode(sent[1].html)), UnauthorizedException);
  });

  it("sai cộng dồn nhiều lượt quá 10 lần bị khoá 15 phút (không mở lượt mới để đoán thêm)", async () => {
    const { service } = createFakes();
    for (let round = 0; round < 2; round += 1) {
      const { challengeId } = await service.start(user, {});
      for (let i = 0; i < 5; i += 1) await assert.rejects(() => service.verify(challengeId, "000000"), UnauthorizedException);
    }
    await assert.rejects(() => service.start(user, {}), (error) => error instanceof HttpException && error.getStatus() === 429);
  });

  it("tài khoản bắt buộc thiếu thư công vụ bị chặn; lỗi SMTP ở production không cấp phiên", async () => {
    const { service } = createFakes({ mailFail: true });
    await assert.rejects(() => service.start({ ...user, credentialEmail: null }, {}), ForbiddenException);

    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      await assert.rejects(() => service.start(user, {}), ServiceUnavailableException);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it("gửi lại mã phải chờ 60 giây, làm mã cũ vô hiệu, giới hạn 5 lần và chống gửi song song/hồi sinh", async () => {
    const { rows, sent, service } = createFakes();
    const { challengeId } = await service.start(user, {});
    const firstCode = readCode(sent[0].html);
    await assert.rejects(() => service.resend(challengeId, async () => user), (error) => error instanceof HttpException && error.getStatus() === 429);

    // Sau 60 giây: gửi lại thành công, mã cũ vô hiệu, mã mới dùng được.
    rows.get(challengeId).lastSentAt = new Date(Date.now() - 61_000);
    await service.resend(challengeId, async () => user);
    assert.equal(sent.length, 2);
    const secondCode = readCode(sent[1].html);
    await assert.rejects(() => service.verify(challengeId, firstCode), UnauthorizedException);

    // Gửi song song 2 yêu cầu tại cùng thời điểm: chỉ 1 yêu cầu chiếm được chỗ và gửi thư.
    rows.get(challengeId).lastSentAt = new Date(Date.now() - 61_000);
    const parallel = await Promise.allSettled([
      service.resend(challengeId, async () => user),
      service.resend(challengeId, async () => user)
    ]);
    assert.equal(parallel.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal(parallel.filter((item) => item.status === "rejected").length, 1);
    assert.equal(sent.length, 3);

    // Đổi mật khẩu (credentialVersion tăng) thì không resend được challenge cũ.
    rows.get(challengeId).lastSentAt = new Date(Date.now() - 61_000);
    await assert.rejects(() => service.resend(challengeId, async () => ({ ...user, credentialVersion: 4 })), UnauthorizedException);

    // Quá 5 lần gửi bị chặn 429.
    rows.get(challengeId).sendCount = 5;
    await assert.rejects(() => service.resend(challengeId, async () => user), (error) => error instanceof HttpException && error.getStatus() === 429);

    // Lượt đã sai đủ 5 lần không thể hồi sinh bằng resend; mã mới ở lượt khác mới dùng được.
    const { challengeId: exhaustedId } = await service.start(user, {});
    for (let i = 0; i < 5; i += 1) await assert.rejects(() => service.verify(exhaustedId, "000000"), UnauthorizedException);
    rows.get(exhaustedId).lastSentAt = new Date(Date.now() - 61_000);
    await assert.rejects(() => service.resend(exhaustedId, async () => user), UnauthorizedException);

    assert.equal((await service.verify(challengeId, readCode(sent[2].html))).userId, "u1");
    void secondCode;
  });

  it("mã hoặc lượt không hợp lệ đều trả cùng lỗi, không đụng CSDL với id quá dài", async () => {
    const { service } = createFakes();
    await assert.rejects(() => service.verify("khong-ton-tai", "123456"), UnauthorizedException);
    await assert.rejects(() => service.verify("x".repeat(65), "123456"), UnauthorizedException);
  });

  it("AuthService.verifyLoginOtp kiểm tra credentialVersion và chỉ đánh dấu IP tin cậy sau khi xác thực xong", async () => {
    const prevMode = process.env.LOGIN_OTP_MODE;
    process.env.LOGIN_OTP_MODE = "required-roles";
    try {
      const { sent, service: otpService } = createFakes();
      let currentVersion = 3;
      const store = {
        async findUserByUsername() { return { ...user, credentialVersion: currentVersion }; },
        async findUserById() { return { ...user, credentialVersion: currentVersion }; },
        async createSession(userId, credentialVersion) { return { id: "s1", token: "t1", userId, credentialVersion, expiresAt: new Date(Date.now() + 60_000).toISOString() }; },
        toSafeUser: (u) => ({ id: u.id, username: u.username, displayName: u.displayName, systemRole: u.systemRole, unit: u.unit, organizationScopes: [] })
      };
      const rateLimit = new AuthRateLimitService();
      const passwordService = { async verifyPassword() { return true; } };
      const auth = new AuthService({ async record() {} }, rateLimit, store, passwordService, {}, otpService);

      const step1 = await auth.login({ username: "admin", password: "ok" }, { ip: "10.0.0.9" });
      assert.ok("challenge" in step1);
      assert.equal(rateLimit.isTrusted("10.0.0.9:admin"), false, "chưa hoàn tất 2FA thì IP chưa được đánh dấu tin cậy");

      const code = readCode(sent[0].html);
      currentVersion = 4;
      await assert.rejects(() => auth.verifyLoginOtp({ challengeId: step1.challenge.challengeId, code }, { ip: "10.0.0.9" }), UnauthorizedException);

      currentVersion = 3;
      const step2 = await auth.login({ username: "admin", password: "ok" }, { ip: "10.0.0.9" });
      await auth.verifyLoginOtp({ challengeId: step2.challenge.challengeId, code: readCode(sent[1].html) }, { ip: "10.0.0.9" });
      assert.equal(rateLimit.isTrusted("10.0.0.9:admin"), true);
    } finally {
      if (prevMode === undefined) delete process.env.LOGIN_OTP_MODE;
      else process.env.LOGIN_OTP_MODE = prevMode;
    }
  });

  it("AuthService.setLoginOtpEnabled không cho vai trò bắt buộc tắt 2FA và yêu cầu email khi bật", async () => {
    const store = {
      setCalls: [],
      async findUserById(id) {
        if (id === "u1") return user;
        if (id === "u2") return { ...user, id: "u2", systemRole: "RESEARCHER_INTERNAL_USER", credentialEmail: null };
        return { ...user, id: "u3", systemRole: "RESEARCHER_INTERNAL_USER", credentialEmail: "ncv@vmmu.edu.vn" };
      },
      async setLoginOtpEnabled(userId, enabled) { this.setCalls.push({ userId, enabled }); },
      toSafeUser: (u) => ({ id: u.id, loginOtp: { required: u.systemRole === "SYSTEM_ADMIN", enabled: u.loginOtpEnabled } })
    };
    const auditLog = { async record() {} };
    const auth = new AuthService(auditLog, new AuthRateLimitService(), store, {}, {}, createFakes().service);

    await assert.rejects(() => auth.setLoginOtpEnabled("u1", false, {}), ForbiddenException);
    await assert.rejects(() => auth.setLoginOtpEnabled("u2", true, {}), (error) => error.getResponse().code === "LOGIN_OTP_EMAIL_MISSING");
    const enabled = await auth.setLoginOtpEnabled("u3", true, {});
    assert.deepEqual(enabled, { loginOtp: { required: false, enabled: true } });
    assert.deepEqual(store.setCalls, [{ userId: "u3", enabled: true }]);
  });
});
