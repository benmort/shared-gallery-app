import { NextResponse } from "next/server";
import { processPendingMediaJobs } from "@/lib/upload/processor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const expected = process.env.UPLOAD_JOB_SECRET;
  const auth = request.headers.get("x-upload-job-secret");
  const querySecret = new URL(request.url).searchParams.get("secret");
  const userAgent = request.headers.get("user-agent") || "";
  const isVercelCron = userAgent.toLowerCase().includes("vercel-cron");
  if (expected && auth !== expected && querySecret !== expected && !isVercelCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await processPendingMediaJobs();
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return POST(request);
}
