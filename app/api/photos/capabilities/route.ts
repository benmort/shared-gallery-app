import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Public hints for client upload strategy (no secrets). */
export async function GET() {
  const clientUpload =
    typeof process.env.BLOB_READ_WRITE_TOKEN === "string" &&
    process.env.BLOB_READ_WRITE_TOKEN.length > 0;
  return NextResponse.json({ clientUpload });
}
