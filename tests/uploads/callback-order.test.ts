import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import { getUploadSessionStore } from "@/lib/upload-session-store";

test("session tracks out-of-order callback completion", async () => {
  const store = getUploadSessionStore();
  const sessionId = randomUUID();
  await store.create({
    sessionId,
    expectedCount: 2,
    files: [
      {
        clientFileId: "a",
        pathname: "album-img/a.jpg",
        filename: "a.jpg",
        mime: "image/jpeg",
        size: 1000,
      },
      {
        clientFileId: "b",
        pathname: "album-img/b.jpg",
        filename: "b.jpg",
        mime: "image/jpeg",
        size: 1000,
      },
    ],
  });

  await store.patchFile(sessionId, "b", {
    status: "uploaded",
    uploadedAt: new Date().toISOString(),
  });
  await store.markPhotoRegistered(sessionId, "b", "photo-b");
  await store.patchFile(sessionId, "a", {
    status: "uploaded",
    uploadedAt: new Date().toISOString(),
  });
  await store.markPhotoRegistered(sessionId, "a", "photo-a");

  const session = await store.get(sessionId);
  assert.ok(session);
  assert.equal(session!.complete, true);
  assert.deepEqual(
    [...session!.uploadedPhotoIds].sort(),
    ["photo-a", "photo-b"],
  );
  assert.equal(session!.files.a.status, "registered");
  assert.equal(session!.files.b.status, "registered");
});
