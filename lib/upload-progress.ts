export function aggregateUploadProgress(totalBytes: number, loadedParts: number[]): number {
  const safeTotal = Math.max(1, totalBytes);
  const loaded = loadedParts.reduce((sum, bytes) => sum + Math.max(0, bytes), 0);
  return Math.min(1, loaded / safeTotal);
}

export function nextRetryDelay(baseDelayMs: number, attempt: number): number {
  const base = Math.max(50, baseDelayMs);
  return Math.min(5000, base * 2 ** Math.max(0, attempt));
}
