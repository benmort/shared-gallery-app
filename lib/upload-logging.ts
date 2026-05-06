export type UploadLogLevel = "info" | "warn" | "error";

type UploadLogPayload = Record<string, unknown>;

export function logUploadEvent(
  event: string,
  payload: UploadLogPayload,
  level: UploadLogLevel = "info",
) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    domain: "moments-upload",
    event,
    ...payload,
  });
  if (level === "warn") {
    console.warn(line);
    return;
  }
  if (level === "error") {
    console.error(line);
    return;
  }
  console.info(line);
}
