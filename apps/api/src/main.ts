import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
// @ts-ignore: Express is provided by the Nest adapter; its declarations are not installed.
import { json, Router } from "express";
import { AppModule } from "./app.module.js";
import { readSessionCookie } from "./auth/session-cookie.js";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.disable("x-powered-by");
  // The API only returns JSON and downloads, so nothing it serves may be framed, sniffed or load subresources.
  app.use((_request: any, response: any, next: () => void) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    if (process.env.NODE_ENV === "production") response.setHeader("Strict-Transport-Security", "max-age=31536000");
    next();
  });
  // A 256 KB CV plus up to 200 publication rows can exceed the 100 KB default. This parser runs before the
  // session guard, so only requests carrying a session cookie get the larger limit; the rest keep the default.
  const profileJson = Router().use(json({ limit: "4mb" }));
  app.use("/api/v1/researcher-profiles", (request: any, response: any, next: () => void) => (readSessionCookie(request.headers.cookie) ? profileJson(request, response, next) : next()));
  app.set("trust proxy", process.env.TRUST_PROXY ?? "loopback, linklocal, uniquelocal");

  const allowedOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  // The session cookie is SameSite=Lax, which still lets a same-site page (sibling subdomain, other port) post
  // a form here. A browser always sends Origin on such a request, so refuse writes from origins we do not serve.
  app.use((request: any, response: any, next: () => void) => {
    const origin = request.headers.origin;
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && origin && !allowedOrigins.includes(origin)) {
      response.status(403).json({ message: "Yêu cầu từ nguồn không được phép." });
      return;
    }
    next();
  });

  app.enableCors({
    origin: allowedOrigins,
    credentials: true
  });

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
}

void bootstrap();
