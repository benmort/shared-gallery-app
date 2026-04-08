import { createFilesystemStorage } from "./filesystem";
import type { PhotoStorage } from "./types";

let singleton: PhotoStorage | null = null;

export function getPhotoStorage(): PhotoStorage {
  if (!singleton) {
    singleton = createFilesystemStorage();
  }
  return singleton;
}

export type { PhotoStorage } from "./types";
