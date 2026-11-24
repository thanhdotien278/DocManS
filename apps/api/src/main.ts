import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
// @ts-ignore: Express is provided by the Nest adapter; its declarations are not installed.
import { json, Router } from "express";
import { AppModule } from "./app.module.js";
import { assertCsrfConfigured, csrfProtection } from "./auth/csrf.js";
import { readSessionCookie } from "./auth/session-cookie.js";
import { requestContextMiddleware } from "./infrastructure/observability/request-context.js";
import { CSP_REPORT_PATH, cspReportHandler } from "./security/csp-report.js";

async function bootstrap() {
  assertCsrfConfigured();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.disable("x-powered-by");
  // Request id + log JSON cho request lỗi/chậm; đặt trước mọi middleware khác để luôn có mã tra cứu.
  app.use(requestContextMiddleware());
  // The API only returns JSON and downloads, so nothing it serves may be framed, sniffed or load subresources.
  app.use((_request: any, response: any, next: () => void) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    if (process.env.NODE_ENV === "production") response.setHeader("Strict-Transport-Security", "max-age=31536000");
    next();
  });
  app.set("trust proxy", process.env.TRUST_PROXY ?? "loopback, linklocal, uniquelocal");

  const allowedOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  // CORS trước lớp chống giả mạo yêu cầu: phản hồi từ chối vẫn kèm header CORS để giao diện đọc được thông báo.
  app.enableCors({
    origin: allowedOrigins,
    credentials: true
  });

  // Báo cáo vi phạm CSP do trình duyệt gửi (application/csp-report, không mang mã CSRF): xử lý trước lớp CSRF, chỉ ghi log.
  app.getHttpAdapter().getInstance().post(CSP_REPORT_PATH, ...cspReportHandler());

  // Chống giả mạo yêu cầu: kiểu dữ liệu, nguồn gửi và mã CSRF của phiên (auth/csrf.ts), trước mọi controller.
  app.use(csrfProtection(allowedOrigins));

  // A 256 KB CV plus up to 200 publication rows can exceed the 100 KB default. This parser runs after the CSRF
  // check but before the session guard, so only requests carrying a session cookie get the larger limit; the rest keep the default.
  const profileJson = Router().use(json({ limit: "4mb" }));
  app.use("/api/v1/researcher-profiles", (request: any, response: any, next: () => void) => (readSessionCookie(request.headers.cookie) ? profileJson(request, response, next) : next()));

  app.enableShutdownHooks();

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
}

void bootstrap();
