import { NextResponse } from "next/server";
import { listDlqJobs, reprocessDlqJob } from "@/lib/storage/postgres-metadata";

export const dynamic = "force-dynamic";

type Body = {
  uploadId?: string;
};

function authorized(request: Request): boolean {
  const expected = process.env.UPLOAD_JOB_SECRET;
  if (!expected) return true;
  const querySecret = new URL(request.url).searchParams.get("secret");
  const userAgent = request.headers.get("user-agent") || "";
  const isVercelCron = userAgent.toLowerCase().includes("vercel-cron");
  return (
    request.headers.get("x-upload-job-secret") === expected ||
    querySecret === expected ||
    isVercelCron
  );
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const jobs = await listDlqJobs(100);
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as Body;
  if (!body.uploadId) {
    return NextResponse.json({ error: "uploadId is required" }, { status: 400 });
  }
  const ok = await reprocessDlqJob(body.uploadId);
  return NextResponse.json({ requeued: ok });
}
