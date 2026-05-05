/**
 * Lightweight upload load test runner.
 *
 * Usage:
 *   BASE_URL=https://your-app.vercel.app \
 *   UPLOAD_JOB_SECRET=... \
 *   tsx scripts/loadtest-moments-upload.ts
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CONCURRENCY = Number.parseInt(process.env.CONCURRENCY || "8", 10);
const TOTAL_REQUESTS = Number.parseInt(process.env.TOTAL_REQUESTS || "32", 10);
const MEDIA_KIND = (process.env.MEDIA_KIND || "video").toLowerCase();

const ONE_BY_ONE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wf5n8kAAAAASUVORK5CYII=",
  "base64",
);

function makeFakeFile(): Blob {
  if (MEDIA_KIND === "image") {
    return new Blob([Buffer.from(ONE_BY_ONE_PNG)], { type: "image/png" });
  }
  return new Blob([new Uint8Array(256 * 1024)], { type: "video/mp4" });
}

async function runSingle(
  idx: number,
): Promise<{ ok: boolean; ms: number; status: number; body?: string }> {
  const start = performance.now();
  const form = new FormData();
  form.append(
    "file",
    makeFakeFile(),
    MEDIA_KIND === "image" ? `loadtest-${idx}.png` : `loadtest-${idx}.mp4`,
  );
  form.append("uploadId", `loadtest-${Date.now()}-${idx}`);
  const res = await fetch(`${BASE_URL}/api/photos`, {
    method: "POST",
    body: form,
  });
  const ms = performance.now() - start;
  let body = "";
  if (!res.ok) {
    body = await res.text();
  }
  return { ok: res.ok, ms, status: res.status, body };
}

async function main() {
  const pending: Promise<{ ok: boolean; ms: number; status: number; body?: string }>[] = [];
  const results: Array<{ ok: boolean; ms: number; status: number; body?: string }> = [];

  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    pending.push(runSingle(i));
    if (pending.length >= CONCURRENCY) {
      const chunk = await Promise.all(pending.splice(0, pending.length));
      results.push(...chunk);
    }
  }
  if (pending.length > 0) {
    results.push(...(await Promise.all(pending)));
  }

  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const latencies = results.map((r) => r.ms).sort((a, b) => a - b);
  const percentile = (p: number) => latencies[Math.floor((latencies.length - 1) * p)] ?? 0;

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        total: results.length,
        success: ok.length,
        failed: failed.length,
        p50Ms: percentile(0.5),
        p95Ms: percentile(0.95),
        p99Ms: percentile(0.99),
        failedStatuses: Array.from(
          failed.reduce((acc, cur) => {
            acc.set(cur.status, (acc.get(cur.status) || 0) + 1);
            return acc;
          }, new Map<number, number>()),
        ),
        sampleFailures: failed.slice(0, 5).map((f) => ({
          status: f.status,
          body: f.body,
        })),
      },
      null,
      2,
    ),
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
