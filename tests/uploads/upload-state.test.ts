import test from "node:test";
import assert from "node:assert/strict";
import { validateMediaFile } from "@/lib/client-validate";
import { canRemoveFromQueue, queueStatusLabel } from "@/lib/upload-queue-ui";
import { aggregateUploadProgress, nextRetryDelay } from "@/lib/upload-progress";

function fileOfSize(name: string, type: string, sizeBytes: number): File {
  const bytes = new Uint8Array(sizeBytes);
  return new File([bytes], name, { type });
}

test("video validation uses 250 MB limit", () => {
  const huge = fileOfSize("big.mp4", "video/mp4", 251 * 1024 * 1024);
  const ok = fileOfSize("ok.mp4", "video/mp4", 250 * 1024 * 1024);
  const hugeError = validateMediaFile(huge);
  const okError = validateMediaFile(ok);
  assert.equal(okError, null);
  assert.match(hugeError || "", /250 MB/);
});

test("queue removal behavior", () => {
  assert.equal(canRemoveFromQueue("queued", false), true);
  assert.equal(canRemoveFromQueue("failed", false), true);
  assert.equal(canRemoveFromQueue("uploading", false), false);
  assert.equal(canRemoveFromQueue("uploaded", false), false);
  assert.equal(canRemoveFromQueue("queued", true), false);
  assert.equal(queueStatusLabel("uploading"), "Uploading...");
});

test("aggregate progress and retry delay helpers", () => {
  assert.equal(aggregateUploadProgress(100, [20, 30]), 0.5);
  assert.equal(aggregateUploadProgress(0, [20]), 1);
  assert.equal(nextRetryDelay(200, 0), 200);
  assert.equal(nextRetryDelay(200, 3), 1600);
  assert.equal(nextRetryDelay(3000, 2), 5000);
});
