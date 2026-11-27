import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import express from "express";
import { csrfProtection, csrfTokenForSession, isValidCsrfToken } from "../dist/apps/api/auth/csrf.js";
import { createExpiredSessionCookie, createSessionCookie, readSessionCookie, sessionSetCookieHeaders } from "../dist/apps/api/auth/session-cookie.js";

// Chống giả mạo yêu cầu (apps/api/src/auth/csrf.ts): kiểu dữ liệu, nguồn gửi, mã CSRF gắn với phiên.

const ORIGIN = "https://docmans.hvqy.test";
process.env.CSRF_SECRET = "kiem-thu-khoa-csrf-it-nhat-32-ky-tu-0123456789";
process.env.NODE_ENV = "test";

let server;
let base;

before(async () => {
  const app = express();
  app.use(csrfProtection([ORIGIN]));
  app.use(express.json());
  app.all(/.*/, (request, response) => response.json({ ok: true, path: request.path }));
  await new Promise((resolve) => { server = app.listen(0, "127.0.0.1", resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

async function send(path, { method = "POST", headers = {}, body = "{}" } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", origin: ORIGIN, ...headers },
    body: method === "GET" ? undefined : body
  });
  return { status: response.status, body: await response.json() };
}

const session = (id) => ({ cookie: `rtms_session=${id}` });

test("yêu cầu đọc và đường dẫn ngoài /api không bị kiểm tra", async () => {
  assert.equal((await fetch(`${base}/api/v1/projects`)).status, 200);
  assert.equal((await fetch(`${base}/health`, { method: "POST" })).status, 200);
});

test("nguồn gửi: thiếu, sai nguồn hoặc cross-site đều bị từ chối; Referer đúng nguồn được chấp nhận", async () => {
  const missing = await fetch(`${base}/api/v1/projects`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  assert.equal(missing.status, 403);
  assert.equal((await missing.json()).code, "CSRF_ORIGIN_REJECTED");
  assert.equal((await send("/api/v1/projects", { headers: { origin: "https://evil.example" } })).body.code, "CSRF_ORIGIN_REJECTED");
  assert.equal((await send("/api/v1/projects", { headers: { origin: "https://docmans.hvqy.test.evil.example" } })).status, 403);
  assert.equal((await send("/api/v1/projects", { headers: { origin: "null" } })).status, 403);
  assert.equal((await send("/api/v1/auth/login", { headers: { "sec-fetch-site": "cross-site" } })).body.code, "CSRF_ORIGIN_REJECTED");
  const viaReferer = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", referer: `${ORIGIN}/login` },
    body: "{}"
  });
  assert.equal(viaReferer.status, 200);
});

test("chỉ nhận JSON và multipart: biểu mẫu HTML và text/plain bị từ chối", async () => {
  for (const type of ["application/x-www-form-urlencoded", "text/plain", "multipart/mixed"]) {
    const result = await send("/api/v1/auth/login", { headers: { "content-type": type }, body: "username=a" });
    assert.equal(result.status, 415, type);
    assert.equal(result.body.code, "CONTENT_TYPE_REJECTED");
  }
  const multipart = await send("/api/v1/projects/x/files", {
    headers: { "content-type": "multipart/form-data; boundary=x", ...session("s1"), "x-csrf-token": csrfTokenForSession("s1") },
    body: "--x--"
  });
  assert.equal(multipart.status, 200);
  const empty = await fetch(`${base}/api/v1/auth/logout`, { method: "POST", headers: { origin: ORIGIN } });
  assert.equal(empty.status, 200);
});

test("yêu cầu mang cookie phiên phải có đúng mã CSRF của chính phiên đó", async () => {
  assert.equal((await send("/api/v1/projects", { headers: session("s1") })).body.code, "CSRF_TOKEN_INVALID");
  assert.equal((await send("/api/v1/projects", { headers: { ...session("s1"), "x-csrf-token": csrfTokenForSession("s2") } })).body.code, "CSRF_TOKEN_INVALID");
  assert.equal((await send("/api/v1/projects", { headers: { ...session("s1"), "x-csrf-token": "sai" } })).status, 403);
  assert.equal((await send("/api/v1/projects", { method: "DELETE", headers: { ...session("s1"), "x-csrf-token": csrfTokenForSession("s1") } })).status, 200);
  assert.equal((await send("/api/v1/projects")).status, 200);
});

test("endpoint không cần phiên chỉ kiểm tra nguồn gửi, kể cả khi còn cookie phiên cũ", async () => {
  for (const path of [
    "/api/v1/auth/login",
    "/api/v1/auth/login/verify",
    "/api/v1/auth/login/resend",
    "/api/v1/auth/logout",
    "/api/v1/auth/password-reset/request",
    "/api/v1/auth/password-reset/complete",
    "/api/v1/auth/account-activation/complete",
    "/api/v1/registration",
    "/api/v1/public/health-ping"
  ]) {
    assert.equal((await send(path, { headers: session("het-han") })).status, 200, path);
  }
  assert.equal((await send("/api/v1/auth/change-password", { headers: session("s1") })).body.code, "CSRF_TOKEN_INVALID");
});

test("mã CSRF: cố định theo phiên, khác giữa các phiên, so khớp an toàn với giá trị sai kiểu", () => {
  assert.equal(csrfTokenForSession("s1"), csrfTokenForSession("s1"));
  assert.notEqual(csrfTokenForSession("s1"), csrfTokenForSession("s2"));
  assert.ok(isValidCsrfToken("s1", csrfTokenForSession("s1")));
  for (const value of [undefined, "", ["x"], 1, csrfTokenForSession("s1").slice(1)]) {
    assert.equal(isValidCsrfToken("s1", value), false);
  }
});

test("giá trị mẫu CHANGE_ME không được dùng làm khoá ký CSRF cố định", () => {
  const prev = process.env.CSRF_SECRET;
  const silenceOut = process.stdout.write;
  process.stdout.write = () => true;
  try {
    process.env.CSRF_SECRET = "CHANGE_ME_CSRF_SECRET_AT_LEAST_32_CHARS";
    const ephemeralA = csrfTokenForSession("s1");
    process.env.CSRF_SECRET = "CHANGE_ME_ANOTHER_PLACEHOLDER_32_CHARS";
    const ephemeralB = csrfTokenForSession("s1");
    assert.notEqual(ephemeralA, ephemeralB);
  } finally {
    process.stdout.write = silenceOut;
    if (prev === undefined) delete process.env.CSRF_SECRET;
    else process.env.CSRF_SECRET = prev;
  }
});

test("cookie phiên production dùng tiền tố __Host- và bỏ qua cookie tên cũ", () => {
  const cookie = createSessionCookie("s1", true, new Date(Date.now() + 60_000));
  assert.match(cookie, /^__Host-rtms_session=s1; Path=\/; HttpOnly; SameSite=Lax; Max-Age=\d+; Secure$/);
  assert.doesNotMatch(cookie, /Domain=/i);
  assert.match(createSessionCookie("s1", false), /^rtms_session=s1;/);
  assert.deepEqual(sessionSetCookieHeaders("moi", true), ["moi", createExpiredSessionCookie(true, "rtms_session")]);
  assert.equal(sessionSetCookieHeaders("moi", false), "moi");

  process.env.NODE_ENV = "production";
  try {
    assert.equal(readSessionCookie("rtms_session=cu"), null);
    assert.equal(readSessionCookie("rtms_session=cu; __Host-rtms_session=moi"), "moi");
  } finally {
    process.env.NODE_ENV = "test";
  }
  assert.equal(readSessionCookie("rtms_session=cu"), "cu");
});
