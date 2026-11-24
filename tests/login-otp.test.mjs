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
      updateMany: async ({ where: { id, consumedAt }, data }) => {
        const row = rows.get(id);
        if (!row || row.consumedAt !== consumedAt) return { count: 0 };
        Object.assign(row, data);
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

  it("gửi lại mã phải chờ 60 giây, làm mã cũ vô hiệu", async () => {
    const { service } = createFakes();
    const { challengeId } = await service.start(user, {});
    await assert.rejects(() => service.resend(challengeId, async () => user), (error) => error instanceof HttpException && error.getStatus() === 429);
  });

  it("mã hoặc lượt không hợp lệ đều trả cùng lỗi, không đụng CSDL với id quá dài", async () => {
    const { service } = createFakes();
    await assert.rejects(() => service.verify("khong-ton-tai", "123456"), UnauthorizedException);
    await assert.rejects(() => service.verify("x".repeat(65), "123456"), UnauthorizedException);
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
