import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionToken, verifyPassword, authEnabled } from "@/lib/auth";

const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 8;

type AttemptWindow = {
  count: number;
  resetAt: number;
};

const loginAttempts = new Map<string, AttemptWindow>();

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  return forwarded || realIp || cfIp || "unknown";
}

function getWindow(ip: string, now: number): AttemptWindow {
  const current = loginAttempts.get(ip);
  if (!current || current.resetAt <= now) {
    const fresh = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    loginAttempts.set(ip, fresh);
    return fresh;
  }
  return current;
}

function isRateLimited(ip: string): { limited: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const window = getWindow(ip, now);
  if (window.count < MAX_LOGIN_ATTEMPTS) {
    return { limited: false, retryAfterSeconds: 0 };
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((window.resetAt - now) / 1000));
  return { limited: true, retryAfterSeconds };
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const window = getWindow(ip, now);
  window.count += 1;
  loginAttempts.set(ip, window);
}

export async function POST(req: Request) {
  if (!authEnabled()) {
    return NextResponse.json({ ok: true, note: "auth disabled" });
  }

  const ip = getClientIp(req);
  const rate = isRateLimited(ip);
  if (rate.limited) {
    return NextResponse.json(
      { ok: false, error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  let password = "";
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
  } catch {
    recordFailedAttempt(ip);
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  if (!verifyPassword(password)) {
    recordFailedAttempt(ip);
    return NextResponse.json({ ok: false, error: "Incorrect password" }, { status: 401 });
  }

  loginAttempts.delete(ip);
  const token = await sessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
