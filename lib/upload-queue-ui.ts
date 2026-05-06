export type QueueStatus = "queued" | "uploading" | "uploaded" | "failed";

export function canRemoveFromQueue(status: QueueStatus, disabled?: boolean): boolean {
  if (disabled) return false;
  return status === "queued" || status === "failed";
}

export function queueStatusLabel(status: QueueStatus): string {
  if (status === "queued") return "Queued";
  if (status === "uploading") return "Uploading...";
  if (status === "uploaded") return "Uploaded";
  return "Failed";
}
