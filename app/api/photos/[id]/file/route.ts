import { NextResponse } from "next/server";
import { parseBytesRange } from "@/lib/http-range";
import { getPhotoStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

const CACHE = "public, max-age=31536000, immutable";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const storage = getPhotoStorage();
  const rangeHeader = request.headers.get("range");

  if (!rangeHeader) {
    const data = await storage.readFile(id);
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(data.buffer), {
      status: 200,
      headers: {
        "Content-Type": data.mime,
        "Content-Length": String(data.buffer.length),
        "Accept-Ranges": "bytes",
        "Cache-Control": CACHE,
      },
    });
  }

  if (rangeHeader.includes(",")) {
    const data = await storage.readFile(id);
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(data.buffer), {
      status: 200,
      headers: {
        "Content-Type": data.mime,
        "Content-Length": String(data.buffer.length),
        "Accept-Ranges": "bytes",
        "Cache-Control": CACHE,
      },
    });
  }

  const meta = await storage.getFileMeta(id);
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
    const data = await storage.readFile(id);
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(data.buffer), {
      status: 200,
      headers: {
        "Content-Type": data.mime,
        "Content-Length": String(data.buffer.length),
        "Accept-Ranges": "bytes",
        "Cache-Control": CACHE,
      },
    });
  }

  const data = await storage.readFile(id, parsed);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(data.buffer), {
    status: 206,
    headers: {
      "Content-Type": data.mime,
      "Content-Length": String(data.buffer.length),
      "Content-Range": `bytes ${parsed.start}-${parsed.end}/${data.totalSize}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": CACHE,
    },
  });
}
