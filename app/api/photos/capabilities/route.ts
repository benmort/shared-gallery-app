import { NextResponse } from "next/server";
import { MAX_FILE_BYTES, MAX_VIDEO_BYTES } from "@/lib/types/photo";
import {
  uploadDbOnlyEnabled,
  uploadDbReadEnabled,
  uploadDualWriteEnabled,
  uploadRolloutStage,
} from "@/lib/upload/flags";

export const dynamic = "force-dynamic";

/** Public hints for client upload strategy (no secrets). */
export async function GET() {
  const clientUpload =
    typeof process.env.BLOB_READ_WRITE_TOKEN === "string" &&
    process.env.BLOB_READ_WRITE_TOKEN.length > 0;
  return NextResponse.json({
    clientUpload,
    maxImageBytes: MAX_FILE_BYTES,
    maxVideoBytes: MAX_VIDEO_BYTES,
    rolloutStage: uploadRolloutStage(),
    dbReadEnabled: uploadDbReadEnabled(),
    dbOnlyEnabled: uploadDbOnlyEnabled(),
    dualWriteEnabled: uploadDualWriteEnabled(),
  });
}
