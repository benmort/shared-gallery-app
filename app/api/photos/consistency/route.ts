import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { listMediaAll } from "@/lib/storage/postgres-metadata";

export const dynamic = "force-dynamic";

const MANIFEST_PATH = "album-manifest.json";

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
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Blob not configured" }, { status: 503 });
  }
  const dbRecords = await listMediaAll();
  let blobManifest: Awaited<ReturnType<typeof get>> | null = null;
  try {
    blobManifest = await get(MANIFEST_PATH, { access: "private", token });
  } catch {
    blobManifest = null;
  }
  const manifestRecords: Array<{ uploadId?: string; id: string; storedName: string }> = [];
  if (blobManifest?.stream && blobManifest.statusCode === 200) {
    const buf = Buffer.from(await new Response(blobManifest.stream).arrayBuffer());
    const parsed = JSON.parse(buf.toString("utf8")) as Array<{
      uploadId?: string;
      id: string;
      storedName: string;
    }>;
    if (Array.isArray(parsed)) manifestRecords.push(...parsed);
  }
  const dbSet = new Set(dbRecords.map((record) => record.uploadId || record.id));
  const manifestSet = new Set(manifestRecords.map((record) => record.uploadId || record.id));
  const dbOnly = [...dbSet].filter((id) => !manifestSet.has(id));
  const manifestOnly = [...manifestSet].filter((id) => !dbSet.has(id));
  return NextResponse.json({
    totals: {
      db: dbSet.size,
      manifest: manifestSet.size,
    },
    dbOnly,
    manifestOnly,
  });
}
