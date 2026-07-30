import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ForbiddenException, HttpException, UnauthorizedException } from "@nestjs/common";
import { AuthRateLimitService } from "../dist/apps/api/auth/auth-rate-limit.service.js";
import { AuthController } from "../dist/apps/api/auth/auth.controller.js";
import { AuthService } from "../dist/apps/api/auth/auth.service.js";
import { AuthStore } from "../dist/apps/api/auth/auth.store.js";
import { LoginRequestPipe } from "../dist/apps/api/auth/login-request.pipe.js";
import { PasswordService } from "../dist/apps/api/auth/password.service.js";
import { ChangePasswordRequestPipe, CompletePasswordResetRequestPipe } from "../dist/apps/api/auth/password-request.pipe.js";
import { SessionAuthGuard } from "../dist/apps/api/auth/session-auth.guard.js";
import { readSessionCookie } from "../dist/apps/api/auth/session-cookie.js";

const activeUser = {
  id: "user-1",
  username: "admin",
  displayName: "Admin",
  passwordHash: "hash",
  status: "active",
  role: "system-admin",
  roleLabel: "Quản trị hệ thống",
  systemRole: "SYSTEM_ADMIN",
  unit: "Học viện Quân y"
};

function safeUser(user = activeUser) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    roleLabel: user.roleLabel,
    systemRole: user.systemRole,
    unit: user.unit
  };
}

function createAuthStore({ user = activeUser, activeSession = { id: "session-1", userId: "user-1" } } = {}) {
  return {
    createdSessions: [],
    revokedSessions: [],
    passwordChanges: [],
    resetTokens: [],
    findUserByUsernameCalls: 0,
    async findUserByUsername(username) {
      this.findUserByUsernameCalls += 1;
      return username === "admin" && user ? user : null;
    },
    async findUserById(userId) {
      return userId === activeUser.id && user ? user : null;
    },
    async createSession(userId) {
      const session = { id: "session-1", userId };
      this.createdSessions.push(session);
      return session;
    },
    async revokeSession(sessionId) {
      this.revokedSessions.push(sessionId);
      return sessionId === "session-1" ? { id: sessionId, userId: "user-1" } : null;
    },
    async getActiveSession(sessionId) {
      return sessionId === activeSession?.id ? activeSession : null;
    },
    async changePassword(userId, passwordHash) {
      this.passwordChanges.push({ userId, passwordHash });
    },
    async createPasswordResetToken(userId, createdById, tokenHash, expiresAt) {
      this.resetTokens.push({ userId, createdById, tokenHash, expiresAt });
    },
    async completePasswordReset() {
      return "user-1";
    },
    toSafeUser: safeUser
  };
}

function createAuditLog() {
  return {
    records: [],
    async record(input) {
      this.records.push(input);
      return input;
    },
    async list() {
      return this.records;
    }
  };
}

function createPasswordService(isValid = true) {
  return {
    verifyPasswordCalls: 0,
    async verifyPassword() {
      this.verifyPasswordCalls += 1;
      return isValid;
    },
    async hashPassword(password) {
      return `hash:${password}`;
    },
    createResetToken() {
      return { token: "raw-reset-token", tokenHash: "hashed-reset-token" };
    },
    hashResetToken(token) {
      return `digest:${token}`;
    }
  };
}

function createResponse() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    }
  };
}

function createService({ passwordIsValid = true, store = createAuthStore(), auditLog = createAuditLog() } = {}) {
  const passwordService = createPasswordService(passwordIsValid);

  return {
    service: new AuthService(auditLog, new AuthRateLimitService(), store, passwordService),
    auditLog,
    passwordService,
    store
  };
}

describe("auth API behavior", () => {
  it("valid login creates a session and cookie", async () => {
    const { service, store } = createService();
    const controller = new AuthController(service);
    const response = createResponse();

    const body = await controller.login(
      { username: "admin", password: "correct-password" },
      { ip: "127.0.0.1", headers: { "user-agent": "node-test" } },
      response
    );

    assert.deepEqual(body.user, safeUser());
    assert.deepEqual(store.createdSessions, [{ id: "session-1", userId: "user-1" }]);
    assert.match(response.headers["Set-Cookie"], /rtms_session=session-1/);
    assert.match(response.headers["Set-Cookie"], /HttpOnly/);
  });

  it("invalid login returns 401 with a generic error and creates a failure audit row", async () => {
    const { service, auditLog } = createService({ passwordIsValid: false });

    await assert.rejects(
      () => service.login({ username: "admin", password: "wrong" }, { ip: "127.0.0.1" }),
      (error) =>
        error instanceof UnauthorizedException &&
        error.getStatus() === 401 &&
        error.getResponse().message === "Tên đăng nhập hoặc mật khẩu không hợp lệ."
    );
    assert.equal(auditLog.records.length, 1);
    assert.equal(auditLog.records[0].action, "login");
    assert.equal(auditLog.records[0].result, "failure");
    assert.equal(auditLog.records[0].targetEntity, "auth-session");
    assert.equal(auditLog.records[0].targetEntityId, "admin");
    assert.equal("password" in auditLog.records[0], false);
  });

  it("logout revokes the session, expires the cookie, and creates an audit row", async () => {
    const { service, store, auditLog } = createService();
    const controller = new AuthController(service);
    const response = createResponse();

    const body = await controller.logout(
      { headers: { cookie: "rtms_session=session-1" }, ip: "127.0.0.1" },
      response
    );

    assert.deepEqual(body, { success: true });
    assert.deepEqual(store.revokedSessions, ["session-1"]);
    assert.match(response.headers["Set-Cookie"], /rtms_session=/);
    assert.match(response.headers["Set-Cookie"], /Max-Age=0/);
    assert.equal(auditLog.records[0].action, "logout");
    assert.equal(auditLog.records[0].result, "success");
    assert.equal(auditLog.records[0].targetEntity, "auth-session");
    assert.equal(auditLog.records[0].targetEntityId, "session-1");
  });

  it("/auth/me rejects missing, revoked, and expired sessions", async () => {
    const { service } = createService({ store: createAuthStore({ activeSession: null }) });
    const guard = new SessionAuthGuard(service);

    for (const cookie of [undefined, "rtms_session=revoked", "rtms_session=expired"]) {
      await assert.rejects(
        () =>
          guard.canActivate({
            switchToHttp: () => ({
              getRequest: () => ({ headers: { cookie } })
            })
          }),
        UnauthorizedException
      );
    }
  });

  it("malformed session cookies fail closed instead of throwing", async () => {
    const { service } = createService();
    const guard = new SessionAuthGuard(service);

    assert.equal(readSessionCookie("rtms_session=%"), null);

    await assert.rejects(
      () =>
        guard.canActivate({
          switchToHttp: () => ({
            getRequest: () => ({ headers: { cookie: "rtms_session=%" } })
          })
        }),
      (error) => error instanceof UnauthorizedException && error.getStatus() === 401
    );
  });

  it("revoked, expired, and deleted sessions are rejected", async () => {
    for (const store of [
      createAuthStore({ activeSession: null }),
      createAuthStore({ activeSession: { id: "expired", userId: "user-1" } }),
      createAuthStore({ activeSession: { id: "session-1", userId: "deleted-user" } })
    ]) {
      const { service } = createService({ store });

      assert.equal(await service.getUserForSession("session-1"), null);
    }
  });

  it("middleware validates session cookies through the auth API", () => {
    const middlewareSource = readFileSync("apps/web/src/middleware.ts", "utf8");

    assert.equal(/hasSessionCookie\s*&&\s*pathname\s*===\s*["']\/login["']/.test(middlewareSource), false);
    assert.match(middlewareSource, /pathname === "\/password-reset"/);
    assert.match(middlewareSource, /!hasSessionCookie && !isPublicRoute/);
    assert.match(middlewareSource, /hasValidSession/);
    assert.match(middlewareSource, /\/auth\/me/);
    assert.match(middlewareSource, /API_INTERNAL_BASE_URL/);
  });

  it("disabled or unknown-status users with old valid sessions are rejected", async () => {
    for (const status of ["disabled", "pending", "locked"]) {
      const disabledUser = { ...activeUser, status };
      const { service } = createService({ store: createAuthStore({ user: disabledUser }) });

      assert.equal(await service.getUserForSession("session-1"), null);
    }
  });

  it("login and logout audit rows are created", async () => {
    const { service, auditLog } = createService();

    await service.login({ username: "admin", password: "correct-password" }, { ip: "127.0.0.1" });
    await service.logout("session-1", { ip: "127.0.0.1" });

    assert.deepEqual(
      auditLog.records.map((record) => `${record.action}:${record.result}`),
      ["login:success", "logout:success"]
    );
    assert.deepEqual(
      auditLog.records.map((record) => record.targetEntity),
      ["auth-session", "auth-session"]
    );
  });

  it("current-user context includes role and organization scope assignments", async () => {
    const authStore = new AuthStore({
      user: {
        async findUnique() {
          return {
            ...activeUser,
            roleAssignments: [
              {
                isPrimary: true,
                role: {
                  code: "system-admin",
                  label: "Quản trị hệ thống",
                  status: "active"
                }
              }
            ],
            organizationScopes: [
              {
                isPrimary: true,
                organizationUnit: {
                  id: "org-root",
                  code: "HVQY",
                  name: "Học viện Quân y",
                  status: "active"
                }
              }
            ]
          };
        }
      }
    });

    const user = await authStore.findUserById("user-1");

    assert.equal(user.systemRole, "SYSTEM_ADMIN");
    assert.deepEqual(user.organizationScopes, [{ id: "org-root", code: "HVQY", name: "Học viện Quân y" }]);
    assert.deepEqual(authStore.toSafeUser(user).organizationScopes, [
      { id: "org-root", code: "HVQY", name: "Học viện Quân y" }
    ]);
  });

  it("TEST-ST-1.3-AUTH-04 current-user context fails closed without role or scope assignments", async () => {
    for (const incompleteUser of [
      { ...activeUser, roleAssignments: [], organizationScopes: [] },
      {
        ...activeUser,
        roleAssignments: [
          {
            isPrimary: true,
            role: {
              code: "system-admin",
              label: "Quản trị hệ thống",
              status: "active"
            }
          }
        ],
        organizationScopes: []
      }
    ]) {
      const authStore = new AuthStore({
        user: {
          async findUnique() {
            return incompleteUser;
          }
        }
      });

      assert.equal(await authStore.findUserById("user-1"), null);
    }
  });

  it("fails closed for an unresolved system-role migration even when legacy assignments exist", async () => {
    const authStore = new AuthStore({
      user: {
        async findUnique() {
          return {
            ...activeUser,
            systemRole: null,
            roleAssignments: [{ isPrimary: true, role: { code: "reviewer", label: "Reviewer", status: "active" } }],
            organizationScopes: [{ isPrimary: true, organizationUnit: { id: "org-root", code: "HVQY", name: "Học viện Quân y", status: "active" } }]
          };
        }
      }
    });

    assert.equal(await authStore.findUserById("user-1"), null);
  });

  it("DTO validation rejects invalid login payloads", () => {
    const pipe = new LoginRequestPipe();

    for (const payload of [null, {}, { username: "", password: "x" }, { username: "admin" }, { password: "x" }]) {
      assert.throws(() => pipe.transform(payload), {
        name: "BadRequestException"
      });
    }
  });

  it("password-change validation and service reject invalid current credentials without mutation", async () => {
    const pipe = new ChangePasswordRequestPipe();
    assert.throws(() => pipe.transform({ currentPassword: "x", newPassword: "short" }), { name: "BadRequestException" });
    const { service, store, auditLog } = createService({ passwordIsValid: false });
    await assert.rejects(() => service.changePassword("user-1", { currentPassword: "wrong", newPassword: "ValidPassword1" }, {}), HttpException);
    assert.deepEqual(store.passwordChanges, []);
    assert.equal(auditLog.records.at(-1).action, "change-password");
  });

  it("successful password change invalidates server-side credentials and audits without secrets", async () => {
    const { service, store, auditLog } = createService();
    await service.changePassword("user-1", { currentPassword: "correct", newPassword: "ValidPassword1" }, {});
    assert.deepEqual(store.passwordChanges, [{ userId: "user-1", passwordHash: "hash:ValidPassword1" }]);
    const record = auditLog.records.at(-1);
    assert.equal(record.action, "change-password");
    assert.equal(JSON.stringify(record).includes("ValidPassword1"), false);
  });

  it("change-password controller clears the caller cookie and audits invalid request input", async () => {
    const { service, auditLog } = createService();
    const controller = new AuthController(service);
    const response = createResponse();
    const result = await controller.changePassword(
      { currentPassword: "correct", newPassword: "ValidPassword1" },
      { currentUser: safeUser(), headers: {}, ip: "127.0.0.1" },
      response
    );
    assert.deepEqual(result, { success: true });
    assert.match(response.headers["Set-Cookie"], /Max-Age=0/);
    await assert.rejects(() => controller.changePassword({ currentPassword: "x", newPassword: "short" }, { currentUser: safeUser(), headers: {} }, createResponse()));
    assert.equal(auditLog.records.at(-1).reason, "request_invalid");
  });

  it("reset completion validates the token shape, consumes a digest, and never audits the raw token", async () => {
    const pipe = new CompletePasswordResetRequestPipe();
    assert.throws(() => pipe.transform({ token: "", newPassword: "ValidPassword1" }), { name: "BadRequestException" });
    const { service, store, auditLog } = createService();
    await service.completePasswordReset({ token: "raw-reset-token", newPassword: "ValidPassword1" }, {});
    assert.equal(store.passwordChanges.length, 0);
    assert.equal(auditLog.records.at(-1).action, "complete-password-reset");
    assert.equal(JSON.stringify(auditLog.records.at(-1)).includes("raw-reset-token"), false);
  });

  it("admin reset initiation stores only a digest with a 30-minute expiry and does not audit secrets", async () => {
    const { service, store, auditLog } = createService();
    const result = await service.initiatePasswordReset({ id: "admin-1", username: "admin" }, "user-1", {});
    assert.equal(result.token, "raw-reset-token");
    assert.equal(store.resetTokens.length, 1);
    assert.equal(store.resetTokens[0].tokenHash, "hashed-reset-token");
    assert.equal(JSON.stringify(auditLog.records.at(-1)).includes("raw-reset-token"), false);
    assert.ok(new Date(store.resetTokens[0].expiresAt).getTime() - Date.now() <= 30 * 60 * 1000);
  });

  it("auth store consumes a valid reset token only once before changing credentials", async () => {
    let used = false;
    const writes = [];
    const tx = {
      passwordResetToken: {
        async findFirst() { return used ? null : { id: "reset-1", userId: "user-1" }; },
        async updateMany({ data }) { if (data.usedAt && !used) { used = true; return { count: 1 }; } return { count: 0 }; }
      },
      user: { async update(input) { writes.push(input); } },
      session: { async updateMany(input) { writes.push(input); } }
    };
    const store = new AuthStore({ $transaction: async (callback) => callback(tx) });
    assert.equal(await store.completePasswordReset("digest", "new-hash"), "user-1");
    assert.equal(await store.completePasswordReset("digest", "new-hash"), null);
    assert.equal(writes.length, 2);
  });

  it("auth store revokes all sessions and outstanding reset tokens when a password changes", async () => {
    const writes = [];
    const tx = {
      user: { async update(input) { writes.push(input); } },
      session: { async updateMany(input) { writes.push(input); } },
      passwordResetToken: { async updateMany(input) { writes.push(input); } }
    };
    const store = new AuthStore({ $transaction: async (callback) => callback(tx) });
    await store.changePassword("user-1", "new-hash");
    assert.deepEqual(writes[0], { where: { id: "user-1" }, data: { passwordHash: "new-hash" } });
    assert.deepEqual(writes[1].where, { userId: "user-1", revokedAt: null });
    assert.deepEqual(writes[2].where, { userId: "user-1", usedAt: null });
  });

  it("oversized login credentials are rejected before auth lookup or hash verification", async () => {
    const pipe = new LoginRequestPipe();
    const store = createAuthStore();
    const { service, passwordService } = createService({ store });

    assert.throws(() => pipe.transform({ username: "a".repeat(129), password: "x" }), {
      name: "BadRequestException"
    });
    assert.throws(() => pipe.transform({ username: "admin", password: "x".repeat(257) }), {
      name: "BadRequestException"
    });

    assert.equal(store.findUserByUsernameCalls, 0);
    assert.equal(passwordService.verifyPasswordCalls, 0);

    await service.login(pipe.transform({ username: "admin", password: "correct-password" }), {});
    assert.equal(store.findUserByUsernameCalls, 1);
    assert.equal(passwordService.verifyPasswordCalls, 1);
  });

  it("unknown usernames still run password verification to reduce timing leakage", async () => {
    const { service, passwordService, store } = createService();

    await assert.rejects(
      () => service.login({ username: "missing-user", password: "wrong" }, { ip: "127.0.0.1" }),
      UnauthorizedException
    );

    assert.equal(store.findUserByUsernameCalls, 1);
    assert.equal(passwordService.verifyPasswordCalls, 1);
  });

  it("malformed stored password hashes fail closed", async () => {
    const passwordService = new PasswordService();

    for (const storedHash of ["", "plaintext", "scrypt:salt:not-hex", "scrypt:salt:abcd"]) {
      assert.equal(await passwordService.verifyPassword("password", storedHash), false);
    }
  });

  it("rate protection rejects excessive login failures", async () => {
    const { service } = createService({ passwordIsValid: false });

    for (let index = 0; index < 5; index += 1) {
      await assert.rejects(
        () => service.login({ username: "admin", password: "wrong" }, { ip: "127.0.0.1" }),
        UnauthorizedException
      );
    }

    await assert.rejects(
      () => service.login({ username: "admin", password: "wrong" }, { ip: "127.0.0.1" }),
      (error) => error instanceof HttpException && error.getStatus() === 429
    );
  });

  it("audit logs fail closed for non-admin users", async () => {
    const { service } = createService();
    const controller = new AuthController(service);

    await assert.rejects(
      () => controller.auditLogs({ currentUser: { role: "leadership" } }),
      (error) => error instanceof ForbiddenException && error.getStatus() === 403
    );
  });
});
