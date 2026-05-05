import { NextResponse } from "next/server";
import { getUploadMetricsSnapshot } from "@/lib/upload/observability";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    metrics: getUploadMetricsSnapshot(),
    generatedAt: new Date().toISOString(),
  });
}
