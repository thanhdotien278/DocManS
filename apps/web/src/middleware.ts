import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/lib/session";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSessionCookie = Boolean(request.cookies.get(AUTH_SESSION_COOKIE)?.value);

  if (!hasSessionCookie && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSessionCookie && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"]
};
