import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { POST as uploadRoute } from "@/app/api/photos/route";
import { __resetPhotoStorageForTests, getPhotoStorage } from "@/lib/storage";

test("POST /api/photos accepts mixed image and video uploads", async (t) => {
  const oldBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  __resetPhotoStorageForTests();

  const cleanupIds: string[] = [];
  t.after(async () => {
    const storage = getPhotoStorage();
    for (const id of cleanupIds) {
      await storage.deleteById(id);
    }
    if (oldBlobToken) process.env.BLOB_READ_WRITE_TOKEN = oldBlobToken;
    else delete process.env.BLOB_READ_WRITE_TOKEN;
    __resetPhotoStorageForTests();
  });

  const fd = new FormData();
  fd.append("uploadId", `test-upload-${Date.now()}`);
  const imageBuffer = await sharp({
    create: {
      width: 8,
      height: 8,
      channels: 3,
      background: { r: 120, g: 90, b: 40 },
    },
  })
    .png()
    .toBuffer();
  fd.append("file", new File([imageBuffer], "tiny.png", { type: "image/png" }));
  fd.append(
    "file",
    new File([new Uint8Array(1024)], "clip.mp4", { type: "video/mp4" }),
  );

  const response = await uploadRoute(
    new Request("http://localhost/api/photos", {
      method: "POST",
      body: fd,
    }),
  );
  assert.equal(response.status, 200);
  const json = (await response.json()) as { photos: Array<{ id: string; kind: string }> };
  assert.equal(Array.isArray(json.photos), true);
  assert.equal(json.photos.length, 2);
  assert.equal(json.photos.some((p) => p.kind === "image"), true);
  assert.equal(json.photos.some((p) => p.kind === "video"), true);
  cleanupIds.push(...json.photos.map((p) => p.id));
});
