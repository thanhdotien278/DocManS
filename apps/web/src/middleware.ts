import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createNonce, cspHeaderName, cspMode, isStaticHtmlPath, pageCsp, staticHtmlCsp } from "@/lib/csp";
import { AUTH_SESSION_COOKIE, PUBLIC_ROUTES, SECURE_AUTH_SESSION_COOKIE } from "@/lib/session";

async function hasValidSession(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return false;
  }

  try {
    const apiBaseUrl =
      process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";
    const response = await fetch(`${apiBaseUrl}/auth/me`, {
      headers: {
        cookie: cookieHeader
      },
      cache: "no-store"
    });

    return response.ok ? (await response.json()).user : null;
  } catch {
    return false;
  }
}

/**
 * Gắn chính sách bảo mật nội dung (lib/csp.ts): nonce mới cho mỗi yêu cầu trang, đặt vào cả header
 * của yêu cầu (Next.js đọc nonce từ đó để gắn vào script/style framework) lẫn header phản hồi.
 */
function withContentSecurityPolicy(request: NextRequest) {
  const mode = cspMode();
  if (mode === "off") return NextResponse.next();
  const isDev = process.env.NODE_ENV === "development";
  const headerName = cspHeaderName(mode);
  if (isStaticHtmlPath(request.nextUrl.pathname)) {
    const response = NextResponse.next();
    response.headers.set(headerName, staticHtmlCsp({ isDev, apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL }));
    return response;
  }
  const nonce = createNonce();
  const policy = pageCsp({ nonce, isDev, apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js chỉ đọc nonce từ header Content-Security-Policy của yêu cầu, kể cả khi đang ở chế độ chỉ báo cáo.
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(headerName, policy);
  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const hasSessionCookie = Boolean(
    request.cookies.get(SECURE_AUTH_SESSION_COOKIE)?.value || request.cookies.get(AUTH_SESSION_COOKIE)?.value
  );

  if (!hasSessionCookie && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSessionCookie && !isPublicRoute) {
    const user = await hasValidSession(request);
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    if (user.mustChangePassword && pathname !== "/change-password") return NextResponse.redirect(new URL("/change-password", request.url));
  }

  return withContentSecurityPolicy(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"]
};
