import { createFilesystemStorage } from "./filesystem";
import type { PhotoStorage } from "./types";
import { createVercelBlobPhotoStorage } from "./vercel-blob";

let singleton: PhotoStorage | null = null;

export function getPhotoStorage(): PhotoStorage {
  if (!singleton) {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (blobToken) {
      singleton = createVercelBlobPhotoStorage(blobToken);
    } else {
      singleton = createFilesystemStorage();
    }
  }
  return singleton;
}

export function __resetPhotoStorageForTests(): void {
  singleton = null;
}

export type { PhotoStorage } from "./types";
