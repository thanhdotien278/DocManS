import { test } from "node:test";
import assert from "node:assert/strict";
import { ForbiddenException } from "@nestjs/common";
import { readRequestId, requestContextMiddleware, shouldLogRequest } from "../dist/apps/api/infrastructure/observability/request-context.js";
import { AppExceptionFilter, mapPrismaError } from "../dist/apps/api/infrastructure/observability/app-exception.filter.js";

test("request id: giữ mã hợp lệ từ proxy, tự tạo UUID nếu thiếu hoặc không an toàn", () => {
  assert.equal(readRequestId("abc-123_x.y"), "abc-123_x.y");
  assert.match(readRequestId(undefined), /^[0-9a-f-]{36}$/);
  assert.match(readRequestId("bad id\nwith newline"), /^[0-9a-f-]{36}$/);
  assert.match(readRequestId("x".repeat(200)), /^[0-9a-f-]{36}$/);
});

test("chế độ log mặc định chỉ ghi lỗi 5xx hoặc request chậm >= 1s", () => {
  assert.equal(shouldLogRequest(undefined, 200, 50), false);
  assert.equal(shouldLogRequest(undefined, 404, 50), false);
  assert.equal(shouldLogRequest(undefined, 500, 50), true);
  assert.equal(shouldLogRequest(undefined, 200, 1500), true);
  assert.equal(shouldLogRequest("all", 200, 5), true);
  assert.equal(shouldLogRequest("off", 500, 5000), false);
});

test("requestContextMiddleware gắn requestId vào req và header X-Request-Id", () => {
  const headers = {};
  const req = { headers: { "x-request-id": "nginx-req-1" }, method: "GET", originalUrl: "/api/v1/x?secret=1" };
  let called = false;
  requestContextMiddleware("off")(
    req,
    { statusCode: 200, setHeader: (name, value) => { headers[name] = value; }, on: () => {} },
    () => { called = true; }
  );
  assert.equal(req.requestId, "nginx-req-1");
  assert.equal(headers["X-Request-Id"], "nginx-req-1");
  assert.equal(called, true);
});

test("lỗi Prisma đã biết ánh xạ sang mã HTTP phù hợp", () => {
  assert.equal(mapPrismaError({ code: "P2002" }).getStatus(), 409);
  assert.equal(mapPrismaError({ code: "P2025" }).getStatus(), 404);
  assert.equal(mapPrismaError({ code: "P2003" }).getStatus(), 400);
  assert.equal(mapPrismaError({ code: "P2034" }).getStatus(), 409);
  assert.equal(mapPrismaError({ code: "P1001" }), null);
});

function harness() {
  const replies = [];
  const adapter = { reply: (_res, body, status) => replies.push({ status, body }), isHeadersSent: () => false, end: () => {} };
  const res = { headersSent: false, status(code) { return { json: (body) => replies.push({ status: code, body }) }; } };
  const host = {
    getType: () => "http",
    switchToHttp: () => ({ getRequest: () => ({ requestId: "req-42", method: "POST", originalUrl: "/api/v1/x" }), getResponse: () => res }),
    getArgs: () => [],
    getArgByIndex: () => undefined
  };
  return { filter: new AppExceptionFilter(adapter), host, replies };
}

test("AppExceptionFilter giữ HttpException, ánh xạ Prisma error và ẩn chi tiết lỗi nội bộ sau requestId", () => {
  const silence = process.stderr.write;
  const silenceOut = process.stdout.write;
  process.stderr.write = () => true;
  process.stdout.write = () => true;
  try {
    const { filter, host, replies } = harness();
    filter.catch(new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Không có quyền." }), host);
    filter.catch(Object.assign(new Error("Unique constraint failed"), { code: "P2002", clientVersion: "7.10.0" }), host);
    filter.catch(new TypeError("Cannot read properties of undefined"), host);
    assert.deepEqual(replies[0], { status: 403, body: { code: "ACTION_NOT_GRANTED", message: "Không có quyền." } });
    assert.equal(replies[1].status, 409);
    assert.equal(replies[1].body.code, "UNIQUE_CONSTRAINT_VIOLATION");
    assert.equal(replies[2].status, 500);
    assert.match(replies[2].body.message, /req-42/);
    assert.equal(JSON.stringify(replies[2].body).includes("Cannot read properties"), false);
  } finally {
    process.stderr.write = silence;
    process.stdout.write = silenceOut;
  }
});
