import { NextResponse } from "next/server";
import { parseBytesRange } from "@/lib/http-range";
import { getPhotoStorage } from "@/lib/storage";
import type { FileVariant } from "@/lib/storage/types";

export const dynamic = "force-dynamic";

const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
const VIDEO_CACHE = "public, max-age=60, s-maxage=86400, stale-while-revalidate=86400";

function cacheControlForMime(mime: string): string {
  return mime.startsWith("video/") ? VIDEO_CACHE : IMMUTABLE_CACHE;
}

function commonHeaders(mime: string) {
  return {
    "Content-Type": mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": cacheControlForMime(mime),
    "Content-Disposition": "inline",
    Vary: "Range",
  };
}

function variantFromUrl(request: Request): FileVariant {
  const u = new URL(request.url);
  const v = u.searchParams.get("variant");
  if (v === "thumb" || v === "display") return v;
  return "original";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const storage = getPhotoStorage();
  const variant = variantFromUrl(request);
  const rangeHeader = request.headers.get("range");

  if (!rangeHeader) {
    const data = await storage.readFile(id, undefined, variant);
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(data.buffer), {
      status: 200,
      headers: {
        ...commonHeaders(data.mime),
        "Content-Length": String(data.buffer.length),
      },
    });
  }

  if (rangeHeader.includes(",")) {
    const data = await storage.readFile(id, undefined, variant);
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(data.buffer), {
      status: 200,
      headers: {
        ...commonHeaders(data.mime),
        "Content-Length": String(data.buffer.length),
      },
    });
  }

  const meta = await storage.getFileMeta(id, variant);
  if (!meta) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = parseBytesRange(rangeHeader, meta.totalSize);
  if (parsed === "not-satisfiable") {
    return new NextResponse(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${meta.totalSize}`,
      },
    });
  }

  if (parsed === null) {
    const data = await storage.readFile(id, undefined, variant);
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(data.buffer), {
      status: 200,
      headers: {
        ...commonHeaders(data.mime),
        "Content-Length": String(data.buffer.length),
      },
    });
  }

  const data = await storage.readFile(id, parsed, variant);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(data.buffer), {
    status: 206,
    headers: {
      ...commonHeaders(data.mime),
      "Content-Length": String(data.buffer.length),
      "Content-Range": `bytes ${parsed.start}-${parsed.end}/${data.totalSize}`,
    },
  });
}
