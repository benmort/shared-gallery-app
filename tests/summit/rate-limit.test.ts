import assert from "node:assert/strict";
import test from "node:test";
import { enforceRateLimit } from "@/lib/summit/rate-limit";

test("enforceRateLimit blocks after reaching limit", () => {
  const key = `rate-limit-test-${Date.now()}`;
  const first = enforceRateLimit(key, { limit: 2, windowMs: 60_000 });
  const second = enforceRateLimit(key, { limit: 2, windowMs: 60_000 });
  const third = enforceRateLimit(key, { limit: 2, windowMs: 60_000 });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(third.ok, false);
  assert.equal(typeof third.retryAfterSeconds, "number");
});
