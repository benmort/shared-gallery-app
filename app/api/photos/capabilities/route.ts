import { NextResponse } from "next/server";
import { isUploadV2Enabled, uploadParallelism } from "@/lib/upload-config";

export const dynamic = "force-dynamic";

/** Public hints for client upload strategy (no secrets). */
export async function GET() {
  const clientUpload =
    typeof process.env.BLOB_READ_WRITE_TOKEN === "string" &&
    process.env.BLOB_READ_WRITE_TOKEN.length > 0;
  return NextResponse.json({
    clientUpload,
    uploadV2: isUploadV2Enabled(),
    parallelism: uploadParallelism(),
  });
}
