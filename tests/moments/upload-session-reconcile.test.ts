import assert from "node:assert/strict";
import test from "node:test";
import { POST as reconcileRoute } from "@/app/api/photos/reconcile/route";
import { POST as uploadSessionRoute } from "@/app/api/photos/upload-session/route";

test("upload-session returns stable upload metadata", async () => {
  const uploadId = `session-${Date.now()}`;
  const response = await uploadSessionRoute(
    new Request("http://localhost/api/photos/upload-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId,
        filename: "clip.mp4",
        mime: "video/mp4",
        size: 1024,
      }),
    }),
  );
  assert.equal(response.status, 200);
  const json = (await response.json()) as { uploadId: string; pathname: string };
  assert.equal(json.uploadId, uploadId);
  assert.equal(json.pathname.startsWith(`album-img/${uploadId}.`), true);
});

test("reconcile reports pending for unknown upload ids", async () => {
  const uploadId = `unknown-${Date.now()}`;
  const response = await reconcileRoute(
    new Request("http://localhost/api/photos/reconcile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadIds: [uploadId] }),
    }),
  );
  assert.equal(response.status, 200);
  const json = (await response.json()) as { pendingUploadIds: string[] };
  assert.deepEqual(json.pendingUploadIds, [uploadId]);
});
