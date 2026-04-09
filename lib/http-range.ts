/**
 * Parse a single `Range: bytes=...` value. Multipart ranges are not supported;
 * caller should fall back to a full response when multiple ranges are present.
 *
 * @returns `null` if the header should be ignored (malformed / unsupported).
 */
export function parseBytesRange(
  rangeHeader: string,
  totalSize: number,
): { start: number; end: number } | null | "not-satisfiable" {
  if (!rangeHeader.startsWith("bytes=")) return null;
  const part = rangeHeader.slice(6).split(",")[0]?.trim() ?? "";
  if (!part) return null;

  const m = /^(\d*)-(\d*)$/.exec(part);
  if (!m) return null;
  const a = m[1];
  const b = m[2];

  if (a === "" && b === "") return null;

  if (a === "") {
    const suffixLen = parseInt(b, 10);
    if (Number.isNaN(suffixLen) || suffixLen <= 0) return null;
    if (totalSize === 0) return "not-satisfiable";
    const start = Math.max(0, totalSize - suffixLen);
    return { start, end: totalSize - 1 };
  }

  const start = parseInt(a, 10);
  if (Number.isNaN(start)) return null;

  if (b === "") {
    if (start >= totalSize) return "not-satisfiable";
    return { start, end: totalSize - 1 };
  }

  const end = parseInt(b, 10);
  if (Number.isNaN(end)) return null;
  if (start > end || start >= totalSize) return "not-satisfiable";
  return { start, end: Math.min(end, totalSize - 1) };
}
