import { NextResponse } from "next/server";
import { reconcileUploads } from "@/lib/upload-reconcile";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const bearer = request.headers.get("authorization");
  return bearer === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await reconcileUploads();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reconciliation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
