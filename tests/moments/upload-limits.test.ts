import assert from "node:assert/strict";
import test from "node:test";
import { MAX_VIDEO_BYTES, maxBytesForMime } from "@/lib/types/photo";

test("video limit is raised to 250MB", () => {
  assert.equal(MAX_VIDEO_BYTES, 250 * 1024 * 1024);
  assert.equal(maxBytesForMime("video/mp4"), 250 * 1024 * 1024);
});
