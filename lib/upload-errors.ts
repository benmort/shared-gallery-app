export type UploadErrorClass = "retryable" | "terminal";

const RETRYABLE_SNIPPETS = [
  "rate limit",
  "timed out",
  "timeout",
  "service unavailable",
  "network",
  "temporarily unavailable",
  "fetch failed",
];

export function classifyUploadError(error: unknown): UploadErrorClass {
  const message = (
    error instanceof Error ? error.message : typeof error === "string" ? error : ""
  ).toLowerCase();
  if (RETRYABLE_SNIPPETS.some((snippet) => message.includes(snippet))) {
    return "retryable";
  }
  return "terminal";
}

export function safeErrorMessage(error: unknown, fallback = "Upload failed"): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}
