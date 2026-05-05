import { NextResponse } from "next/server";
import { getPhotoStorage } from "@/lib/storage";
import { UploadError, uploadErrorResponse } from "@/lib/upload/errors";
import { newCorrelationId, trackUploadEvent } from "@/lib/upload/observability";

export const dynamic = "force-dynamic";

type Body = {
  uploadIds?: string[];
};

export async function POST(request: Request) {
  const correlationId = newCorrelationId();
  try {
    const body = (await request.json()) as Body;
    const uploadIds = Array.isArray(body.uploadIds)
      ? body.uploadIds.filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];
    if (!uploadIds.length) {
      throw new UploadError({
        code: "VALIDATION_ERROR",
        message: "uploadIds is required",
        status: 400,
      });
    }
    const storage = getPhotoStorage();
    if (!storage.reconcileUploads) {
      return NextResponse.json({ photos: [], pendingUploadIds: uploadIds, correlationId });
    }
    const reconciled = await storage.reconcileUploads(uploadIds);
    for (const uploadId of uploadIds) {
      await trackUploadEvent({
        uploadId,
        event: "reconcile",
        correlationId,
        payload: {
          pending: reconciled.pendingUploadIds.includes(uploadId),
        },
      });
    }
    return NextResponse.json({
      photos: reconciled.photos,
      pendingUploadIds: reconciled.pendingUploadIds,
      correlationId,
    });
  } catch (error) {
    const err = uploadErrorResponse(error);
    return NextResponse.json(err.body, { status: err.status });
  }
}
