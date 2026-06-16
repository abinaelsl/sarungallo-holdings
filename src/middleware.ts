import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken, authEnabled } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  // No password configured → app is open.
  if (!authEnabled()) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const valid = await verifySessionToken(token);
  if (valid) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Protect everything except the login page, the login API, and static assets.
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
};
