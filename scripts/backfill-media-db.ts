import { get } from "@vercel/blob";
import {
  ensureMediaSchema,
  listMediaAll,
  upsertMediaRecord,
} from "@/lib/storage/postgres-metadata";
import type { PhotoRecord } from "@/lib/types/photo";

const MANIFEST_PATH = "album-manifest.json";

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for backfill");
  }
  await ensureMediaSchema();
  const result = await get(MANIFEST_PATH, { access: "private", token });
  if (!result?.stream || result.statusCode !== 200) {
    throw new Error("Blob manifest not found");
  }
  const buf = Buffer.from(await new Response(result.stream).arrayBuffer());
  const raw = JSON.parse(buf.toString("utf8")) as PhotoRecord[];
  if (!Array.isArray(raw)) {
    throw new Error("Manifest payload is invalid");
  }
  let inserted = 0;
  for (const row of raw) {
    await upsertMediaRecord({
      ...row,
      uploadId: row.uploadId || row.id,
      processingStatus: row.processingStatus ?? "done",
    });
    inserted += 1;
  }
  const dbRows = await listMediaAll();
  const dbIds = new Set(dbRows.map((row) => row.uploadId || row.id));
  const manifestIds = new Set(raw.map((row) => row.uploadId || row.id));
  const missingInDb = [...manifestIds].filter((id) => !dbIds.has(id));
  const extraInDb = [...dbIds].filter((id) => !manifestIds.has(id));
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        inserted,
        manifestRows: raw.length,
        dbRows: dbRows.length,
        missingInDb,
        extraInDb,
      },
      null,
      2,
    ),
  );
  if (missingInDb.length > 0) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
