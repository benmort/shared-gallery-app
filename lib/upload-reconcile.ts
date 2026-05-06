import { getPhotoStorage } from "@/lib/storage";
import { logUploadEvent } from "@/lib/upload-logging";
import { getUploadSessionStore } from "@/lib/upload-session-store";

export type ReconcileResult = {
  scannedSessions: number;
  completedSessions: number;
  healedFiles: number;
  repairedManifest: boolean;
  details: string[];
};

export async function reconcileUploads(): Promise<ReconcileResult> {
  const sessions = await getUploadSessionStore().listActive(200);
  let healedFiles = 0;
  let completedSessions = 0;
  const details: string[] = [];
  const now = Date.now();

  for (const session of sessions) {
    const expired = new Date(session.expiresAt).getTime() <= now;
    if (session.complete) {
      completedSessions += 1;
      continue;
    }
    if (!expired) continue;
    for (const file of Object.values(session.files)) {
      if (file.status === "registered" || file.status === "failed") continue;
      await getUploadSessionStore().patchFile(session.sessionId, file.clientFileId, {
        status: "failed",
        error: "Session expired before upload completion",
      });
      healedFiles += 1;
    }
    details.push(`Expired session ${session.sessionId} marked incomplete files as failed`);
  }

  let repairedManifest = false;
  const storage = getPhotoStorage();
  if (storage.repairManifest) {
    const result = await storage.repairManifest();
    repairedManifest = result.repaired;
    details.push(...result.details);
  }

  logUploadEvent("uploads.reconciled", {
    scannedSessions: sessions.length,
    healedFiles,
    repairedManifest,
  });

  return {
    scannedSessions: sessions.length,
    completedSessions,
    healedFiles,
    repairedManifest,
    details,
  };
}
