import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAccountById } from "@/lib/accounts";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const accountId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const hasSession = Boolean(getAccountById(accountId));

  if (!hasSession && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"]
};

