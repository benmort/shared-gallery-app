import { list } from "@vercel/blob";
import { NextResponse } from "next/server";
import { listMediaAll } from "@/lib/storage/postgres-metadata";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  const blobListing = await list({
    prefix: "album-img/",
    token,
  });
  const blobStoredNames = new Set(
    blobListing.blobs
      .map((blob) => blob.pathname.slice("album-img/".length))
      .filter((name) => !name.endsWith("-thumb.webp") && !name.endsWith("-display.jpg")),
  );
  const dbStoredNames = new Set(dbRecords.map((record) => record.storedName));
  const blobWithoutDb = [...blobStoredNames].filter((name) => !dbStoredNames.has(name));
  const dbWithoutBlob = [...dbStoredNames].filter((name) => !blobStoredNames.has(name));
  return NextResponse.json({
    totals: {
      db: dbStoredNames.size,
      blob: blobStoredNames.size,
    },
    blobWithoutDb,
    dbWithoutBlob,
  });
}
