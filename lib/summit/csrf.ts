import type { NextRequest } from "next/server";

function normalizeOrigin(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;

  const proto = request.nextUrl.protocol.replace(":", "");
  const expected = `${proto}://${host}`;
  if (normalizeOrigin(origin) === normalizeOrigin(expected)) return true;

  const publicSite = process.env.NEXT_PUBLIC_SITE_URL;
  if (publicSite && normalizeOrigin(origin) === normalizeOrigin(publicSite)) return true;

  return false;
}
