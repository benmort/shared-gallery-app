/* eslint-disable no-console */
import { performance } from "perf_hooks";

type Result = {
  ok: boolean;
  status: number;
  elapsedMs: number;
  body: string;
};

async function runOne(baseUrl: string, bytes: number): Promise<Result> {
  const content = new Uint8Array(bytes);
  const file = new File([content], `load-${crypto.randomUUID()}.jpg`, {
    type: "image/jpeg",
  });
  const fd = new FormData();
  fd.append("file", file);
  const start = performance.now();
  const response = await fetch(`${baseUrl}/api/photos`, { method: "POST", body: fd });
  const elapsedMs = performance.now() - start;
  const body = await response.text();
  return { ok: response.ok, status: response.status, elapsedMs, body };
}

async function main() {
  const baseUrl = process.argv[2] || "http://localhost:3000";
  const concurrency = Number.parseInt(process.argv[3] || "10", 10);
  const requests = Number.parseInt(process.argv[4] || "50", 10);
  const bytes = Number.parseInt(process.argv[5] || "250000", 10);

  console.log(
    JSON.stringify(
      {
        mode: "upload-load-test",
        baseUrl,
        concurrency,
        requests,
        bytes,
      },
      null,
      2,
    ),
  );

  let cursor = 0;
  const results: Result[] = [];
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= requests) return;
      try {
        results.push(await runOne(baseUrl, bytes));
      } catch (error) {
        results.push({
          ok: false,
          status: 0,
          elapsedMs: 0,
          body: error instanceof Error ? error.message : "request failed",
        });
      }
    }
  });

  await Promise.all(workers);
  const ok = results.filter((r) => r.ok);
  const bad = results.filter((r) => !r.ok);
  const avgMs =
    ok.length > 0 ? ok.reduce((sum, r) => sum + r.elapsedMs, 0) / ok.length : 0;

  console.log(
    JSON.stringify(
      {
        ok: ok.length,
        failed: bad.length,
        avgMs: Math.round(avgMs),
        statuses: bad.reduce<Record<string, number>>((acc, r) => {
          const key = String(r.status);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
      },
      null,
      2,
    ),
  );
}

void main();
