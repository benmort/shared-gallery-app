import { get, put } from "@vercel/blob";
import { makeImageDerivatives } from "@/lib/image-derivatives";
import {
  claimProcessingJobs,
  dbConfigured,
  getMediaById,
  markJobCompleted,
  markJobFailed,
  type MediaJob,
  upsertMediaRecord,
} from "@/lib/storage/postgres-metadata";
import { isAllowedVideoType } from "@/lib/types/photo";
import { trackUploadEvent } from "./observability";

const ACCESS = "private" as const;
const IMG_PREFIX = "album-img/";

async function processJob(job: MediaJob, token: string): Promise<void> {
  const record = await getMediaById(job.photoId);
  if (!record) {
    throw new Error("Media record not found");
  }
  if (record.processingStatus === "done") return;
  if (isAllowedVideoType(record.mime)) {
    await upsertMediaRecord({
      ...record,
      processingStatus: "done",
      processingError: undefined,
    });
    return;
  }
  const sourcePath = `${IMG_PREFIX}${record.storedName}`;
  const result = await get(sourcePath, { access: ACCESS, token });
  if (!result?.stream || result.statusCode !== 200) {
    throw new Error("Uploaded blob not found during processing");
  }
  const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
  const { thumb, display } = await makeImageDerivatives(buffer);
  const thumbStoredName = `${record.id}-thumb.webp`;
  const displayStoredName = `${record.id}-display.jpg`;
  await put(`${IMG_PREFIX}${thumbStoredName}`, thumb, {
    access: ACCESS,
    addRandomSuffix: false,
    contentType: "image/webp",
    token,
  });
  await put(`${IMG_PREFIX}${displayStoredName}`, display, {
    access: ACCESS,
    addRandomSuffix: false,
    contentType: "image/jpeg",
    token,
  });
  await upsertMediaRecord({
    ...record,
    thumbStoredName,
    displayStoredName,
    processingStatus: "done",
    processingError: undefined,
  });
}

export async function processPendingMediaJobs(input?: {
  maxJobs?: number;
}): Promise<{
  claimed: number;
  completed: number;
  retried: number;
  dlq: number;
}> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!dbConfigured() || !token) {
    return { claimed: 0, completed: 0, retried: 0, dlq: 0 };
  }
  const jobs = await claimProcessingJobs(input?.maxJobs ?? 8);
  let completed = 0;
  let retried = 0;
  let dlq = 0;
  for (const job of jobs) {
    try {
      await processJob(job, token);
      await markJobCompleted(job.id);
      await trackUploadEvent({
        uploadId: job.uploadId,
        event: "job_completed",
      });
      completed += 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown processing error";
      const status = await markJobFailed({
        id: job.id,
        attemptCount: job.attemptCount,
        maxAttempts: job.maxAttempts,
        error: message,
      });
      await trackUploadEvent({
        uploadId: job.uploadId,
        event: status === "dlq" ? "job_dlq" : "job_failed",
        level: status === "dlq" ? "error" : "warn",
        payload: { message },
      });
      if (status === "dlq") dlq += 1;
      else retried += 1;
    }
  }
  return { claimed: jobs.length, completed, retried, dlq };
}
