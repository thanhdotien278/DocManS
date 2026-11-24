import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFileSync } from "node:fs";
import express from "express";
import { CSP_REPORT_PATH, cspReportHandler, parseCspReports } from "../dist/apps/api/security/csp-report.js";
import { csrfProtection } from "../dist/apps/api/auth/csrf.js";
import { cspHeaderName, cspMode, pageCsp } from "../apps/web/src/lib/csp.ts";

// Báo cáo vi phạm CSP (apps/api/src/security/csp-report.ts) và cách giao diện gắn CSP (apps/web/src/middleware.ts).

let server;
let base;

before(async () => {
  const app = express();
  app.post(CSP_REPORT_PATH, ...cspReportHandler());
  app.use(csrfProtection(["https://docmans.hvqy.test"]));
  app.all(/.*/, (_, response) => response.json({ ok: true }));
  await new Promise((resolve) => { server = app.listen(0, "127.0.0.1", resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

test("chuẩn hoá cả định dạng csp-report cũ lẫn Reporting API, cắt ngắn trường dài", () => {
  const legacy = parseCspReports({
    "csp-report": {
      "document-uri": "https://x/dashboard",
      "violated-directive": "script-src-elem",
      "blocked-uri": "inline",
      "source-file": "https://x/a.js",
      "line-number": 12,
      disposition: "report"
    }
  });
  assert.deepEqual(legacy, [{
    documentUri: "https://x/dashboard",
    directive: "script-src-elem",
    blockedUri: "inline",
    sourceFile: "https://x/a.js",
    lineNumber: 12,
    disposition: "report"
  }]);
  const modern = parseCspReports([
    { type: "csp-violation", body: { documentURL: "https://x/", effectiveDirective: "style-src-elem", blockedURL: "x".repeat(1000), lineNumber: "3" } },
    { type: "deprecation", body: {} }
  ]);
  assert.equal(modern.length, 1);
  assert.equal(modern[0].blockedUri.length, 300);
  assert.equal(modern[0].lineNumber, null);
  assert.deepEqual(parseCspReports({}), []);
  assert.deepEqual(parseCspReports(null), []);
  assert.equal(parseCspReports(Array.from({ length: 50 }, () => ({ type: "csp-violation", body: {} }))).length, 20);
});

test("endpoint nhận báo cáo không cần phiên, không bị lớp chống giả mạo chặn, giới hạn 16 KB", async () => {
  for (const type of ["application/csp-report", "application/reports+json"]) {
    const response = await fetch(`${base}${CSP_REPORT_PATH}`, {
      method: "POST",
      headers: { "content-type": type },
      body: JSON.stringify({ "csp-report": { "violated-directive": "script-src" } })
    });
    assert.equal(response.status, 204, type);
  }
  const tooLarge = await fetch(`${base}${CSP_REPORT_PATH}`, {
    method: "POST",
    headers: { "content-type": "application/csp-report" },
    body: JSON.stringify({ "csp-report": { "blocked-uri": "x".repeat(20_000) } })
  });
  assert.equal(tooLarge.status, 413);
  const other = await fetch(`${base}/api/v1/security/khac`, { method: "POST", headers: { "content-type": "application/csp-report" }, body: "{}" });
  assert.equal(other.status, 415);
});

const directives = (policy) => Object.fromEntries(policy.split("; ").map((part) => { const [name, ...values] = part.split(" "); return [name, values]; }));

test("CSP trang: script chỉ chạy khi có nonce; production không có unsafe-inline/unsafe-eval", () => {
  const policy = directives(pageCsp({ nonce: "abc123", isDev: false, apiBaseUrl: "/api/v1" }));
  assert.deepEqual(policy["script-src"], ["'self'", "'nonce-abc123'", "'strict-dynamic'"]);
  assert.deepEqual(policy["style-src"], ["'self'", "'nonce-abc123'"]);
  assert.deepEqual(policy["style-src-attr"], ["'unsafe-inline'"]);
  assert.deepEqual(policy["connect-src"], ["'self'"]);
  assert.deepEqual(policy["object-src"], ["'none'"]);
  assert.deepEqual(policy["frame-ancestors"], ["'none'"]);
  assert.deepEqual(policy["report-uri"], [CSP_REPORT_PATH]);
  assert.ok("upgrade-insecure-requests" in policy);

  const dev = directives(pageCsp({ nonce: "n", isDev: true, apiBaseUrl: "http://localhost:4000/api/v1" }));
  assert.ok(dev["script-src"].includes("'unsafe-eval'"));
  assert.ok(dev["style-src"].includes("'unsafe-inline'"));
  assert.deepEqual(dev["connect-src"], ["'self'", "http://localhost:4000"]);
  assert.deepEqual(dev["report-uri"], [`http://localhost:4000${CSP_REPORT_PATH}`]);
  assert.equal("upgrade-insecure-requests" in dev, false);
});

test("CSP_MODE chuyển giữa enforce (mặc định), report-only và off; layout dựng động để gắn nonce", () => {
  assert.equal(cspMode(undefined), "enforce");
  assert.equal(cspMode("report-only"), "report-only");
  assert.equal(cspMode("OFF"), "off");
  assert.equal(cspHeaderName("enforce"), "Content-Security-Policy");
  assert.equal(cspHeaderName("report-only"), "Content-Security-Policy-Report-Only");
  assert.match(readFileSync("apps/web/src/app/layout.tsx", "utf8"), /connection\(\)/);
  assert.match(readFileSync("apps/web/src/middleware.ts", "utf8"), /withContentSecurityPolicy/);
});
