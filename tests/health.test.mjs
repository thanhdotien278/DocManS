import { test } from "node:test";
import assert from "node:assert/strict";
import { HealthController } from "../dist/apps/api/infrastructure/health/health.controller.js";

function response() {
  const result = {};
  return {
    result,
    status(code) {
      result.code = code;
      return {
        json(body) {
          result.body = body;
          return body;
        }
      };
    }
  };
}

test("liveness chỉ kiểm tra PostgreSQL để sự cố MinIO không đánh dấu API chết", async () => {
  let storageCalls = 0;
  const ok = new HealthController(
    { $queryRaw: async () => [1] },
    { checkBucket: async () => { storageCalls += 1; throw new Error("down"); } }
  );
  const res = response();
  await ok.health(res);
  assert.equal(res.result.code, 200);
  assert.equal(res.result.body.database, "connected");
  assert.equal(storageCalls, 0);

  const down = new HealthController(
    { $queryRaw: async () => { throw new Error("db down"); } },
    { checkBucket: async () => {} }
  );
  const res2 = response();
  await down.health(res2);
  assert.equal(res2.result.code, 503);
});

test("readiness kiểm tra cả DB và MinIO, trả 503 khi thiếu phụ thuộc và cache kết quả 10 giây", async () => {
  let storageCalls = 0;
  let storageUp = false;
  const controller = new HealthController(
    { $queryRaw: async () => [1] },
    { checkBucket: async () => { storageCalls += 1; if (!storageUp) throw new Error("down"); } }
  );
  const first = response();
  await controller.ready(first);
  assert.equal(first.result.code, 503);
  assert.deepEqual([first.result.body.database, first.result.body.storage], ["up", "down"]);

  storageUp = true;
  const cached = response();
  await controller.ready(cached);
  assert.equal(cached.result.code, 503);
  assert.equal(storageCalls, 1);
});

test("phụ thuộc bị treo quá 3 giây được báo down thay vì giữ request mãi", async () => {
  const controller = new HealthController(
    { $queryRaw: async () => [1] },
    { checkBucket: () => new Promise(() => {}) }
  );
  const started = Date.now();
  const res = response();
  await controller.ready(res);
  assert.equal(res.result.body.storage, "down");
  assert.ok(Date.now() - started < 4000);
});
