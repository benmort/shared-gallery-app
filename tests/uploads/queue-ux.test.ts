import test from "node:test";
import assert from "node:assert/strict";
import { canRemoveFromQueue } from "@/lib/upload-queue-ui";

test("remove control hidden when upload starts", () => {
  assert.equal(canRemoveFromQueue("queued", true), false);
  assert.equal(canRemoveFromQueue("failed", true), false);
});

test("remove control only available for queued and failed files", () => {
  assert.equal(canRemoveFromQueue("queued", false), true);
  assert.equal(canRemoveFromQueue("failed", false), true);
  assert.equal(canRemoveFromQueue("uploading", false), false);
  assert.equal(canRemoveFromQueue("uploaded", false), false);
});
