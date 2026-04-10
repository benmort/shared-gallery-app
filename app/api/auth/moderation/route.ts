import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  isModerationConfigured,
  moderationCookieName,
  moderationCookieOptions,
  signModerationSession,
  verifyModerationPassword,
  verifyModerationToken,
} from "@/lib/moderation-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isModerationConfigured()) {
    return NextResponse.json({ ok: false, configured: false });
  }
  const c = await cookies();
  const v = c.get(moderationCookieName)?.value;
  return NextResponse.json({
    ok: !!(v && verifyModerationToken(v)),
    configured: true,
  });
}

export async function POST(request: Request) {
  if (!isModerationConfigured()) {
    return NextResponse.json(
      { error: "Moderation not configured" },
      { status: 503 },
    );
  }
  const body = (await request.json()) as { password?: string };
  if (!body.password || !verifyModerationPassword(body.password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const token = signModerationSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(moderationCookieName, token, moderationCookieOptions());
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(moderationCookieName, "", {
    ...moderationCookieOptions(),
    maxAge: 0,
  });
  return res;
}
