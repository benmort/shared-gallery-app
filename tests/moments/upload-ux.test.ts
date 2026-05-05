import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();

test("ShareMomentGridBlock passes queue visibility controls", async () => {
  const source = await readFile(
    path.join(ROOT, "components/ShareMomentGridBlock.tsx"),
    "utf8",
  );
  assert.equal(source.includes("showRemove={!uploading}"), true);
  assert.equal(source.includes("onRetry={retryItem}"), true);
  assert.equal(source.includes("aria-live=\"polite\""), true);
});

test("UploadPreviewList exposes per-item status overlays", async () => {
  const source = await readFile(
    path.join(ROOT, "components/UploadPreviewList.tsx"),
    "utf8",
  );
  assert.equal(source.includes("\"queued\""), true);
  assert.equal(source.includes("\"uploading\""), true);
  assert.equal(source.includes("\"processing\""), true);
  assert.equal(source.includes("\"done\""), true);
  assert.equal(source.includes("\"failed\""), true);
  assert.equal(source.includes("Retry"), true);
});
