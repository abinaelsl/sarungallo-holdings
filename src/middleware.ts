import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, authEnabled, verifySessionToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  // Fail closed when auth is expected but APP_PASSWORD is missing.
  if (!authEnabled()) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: "APP_PASSWORD is not configured" },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "APP_PASSWORD is not configured" },
      { status: 401 },
    );
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const valid = await verifySessionToken(token);
  if (valid) return NextResponse.next();

  // API clients expect JSON, not an HTML login redirect.
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Protect everything except the home page, login, and static assets.
  matcher: ["/((?!$|login|api/login|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
};
