import fs from "fs/promises";
import path from "path";
import {
  BlobPreconditionFailedError,
  get as blobGet,
  head as blobHead,
  list as blobList,
  put as blobPut,
} from "@vercel/blob";

export type UploadFileStatus =
  | "queued"
  | "uploading"
  | "uploaded"
  | "registered"
  | "failed";

export type UploadSessionFile = {
  clientFileId: string;
  pathname: string;
  filename: string;
  mime: string;
  size: number;
  status: UploadFileStatus;
  attempts: number;
  error?: string;
  photoId?: string;
  uploadedAt?: string;
  registeredAt?: string;
};

export type UploadSession = {
  sessionId: string;
  expectedCount: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  complete: boolean;
  files: Record<string, UploadSessionFile>;
  uploadedPhotoIds: string[];
};

export type NewUploadSessionInput = {
  sessionId: string;
  expectedCount: number;
  files: Array<{
    clientFileId: string;
    pathname: string;
    filename: string;
    mime: string;
    size: number;
  }>;
};

const SESSION_PREFIX = "upload-sessions/";

function sessionPath(sessionId: string): string {
  return `${SESSION_PREFIX}${sessionId}.json`;
}

function nextExpiryIso(): string {
  const ttlMs = Math.max(
    5 * 60_000,
    Number.parseInt(process.env.MOMENTS_UPLOAD_SESSION_TTL_MS || "", 10) || 6 * 60 * 60_000,
  );
  return new Date(Date.now() + ttlMs).toISOString();
}

function makeNewSession(input: NewUploadSessionInput): UploadSession {
  const now = new Date().toISOString();
  const files: Record<string, UploadSessionFile> = {};
  for (const file of input.files) {
    files[file.clientFileId] = {
      ...file,
      status: "queued",
      attempts: 0,
    };
  }
  return {
    sessionId: input.sessionId,
    expectedCount: input.expectedCount,
    createdAt: now,
    updatedAt: now,
    expiresAt: nextExpiryIso(),
    complete: false,
    files,
    uploadedPhotoIds: [],
  };
}

function hydrateCompleteState(session: UploadSession): UploadSession {
  const files = Object.values(session.files);
  const complete =
    files.length > 0 &&
    files.every((f) => f.status === "registered" || f.status === "failed");
  return { ...session, complete };
}

async function parseBlobJson(pathname: string, token: string): Promise<UploadSession | null> {
  try {
    const res = await blobGet(pathname, { access: "private", token });
    if (!res?.stream || res.statusCode !== 200) return null;
    const raw = Buffer.from(await new Response(res.stream).arrayBuffer()).toString("utf8");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UploadSession;
    return parsed;
  } catch {
    return null;
  }
}

async function mutateBlobSession(
  token: string,
  id: string,
  mutator: (current: UploadSession | null) => UploadSession,
): Promise<UploadSession> {
  const pathname = sessionPath(id);
  for (let i = 0; i < 15; i++) {
    let etag: string | undefined;
    try {
      const h = await blobHead(pathname, { token });
      etag = h.etag;
    } catch {
      etag = undefined;
    }
    const current = await parseBlobJson(pathname, token);
    const next = hydrateCompleteState(mutator(current));
    next.updatedAt = new Date().toISOString();
    try {
      await blobPut(pathname, JSON.stringify(next), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        ifMatch: etag,
        token,
      });
      return next;
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) continue;
      throw error;
    }
  }
  throw new Error("Failed to persist upload session");
}

type FileSessionPatch = Partial<
  Pick<UploadSessionFile, "status" | "error" | "photoId" | "uploadedAt" | "registeredAt">
> & {
  incrementAttempts?: boolean;
};

export type UploadSessionStore = {
  create(input: NewUploadSessionInput): Promise<UploadSession>;
  get(sessionId: string): Promise<UploadSession | null>;
  patchFile(sessionId: string, clientFileId: string, patch: FileSessionPatch): Promise<UploadSession>;
  markPhotoRegistered(
    sessionId: string,
    clientFileId: string,
    photoId: string,
  ): Promise<UploadSession>;
  listActive(limit: number): Promise<UploadSession[]>;
};

function createFilesystemUploadSessionStore(): UploadSessionStore {
  const root = path.join(process.cwd(), "data", "upload-sessions");

  async function ensureDir() {
    await fs.mkdir(root, { recursive: true });
  }

  async function filePath(sessionId: string) {
    await ensureDir();
    return path.join(root, `${sessionId}.json`);
  }

  async function read(sessionId: string): Promise<UploadSession | null> {
    try {
      const fp = await filePath(sessionId);
      const raw = await fs.readFile(fp, "utf8");
      return JSON.parse(raw) as UploadSession;
    } catch {
      return null;
    }
  }

  async function write(session: UploadSession): Promise<void> {
    const fp = await filePath(session.sessionId);
    const tmp = `${fp}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(session), "utf8");
    await fs.rename(tmp, fp);
  }

  return {
    async create(input) {
      const next = makeNewSession(input);
      await write(next);
      return next;
    },
    async get(sessionId) {
      const s = await read(sessionId);
      return s ? hydrateCompleteState(s) : null;
    },
    async patchFile(sessionId, clientFileId, patch) {
      const current = (await read(sessionId)) || makeNewSession({
        sessionId,
        expectedCount: 0,
        files: [],
      });
      const file =
        current.files[clientFileId] ||
        ({
          clientFileId,
          pathname: "",
          filename: "",
          mime: "application/octet-stream",
          size: 0,
          status: "queued",
          attempts: 0,
        } satisfies UploadSessionFile);
      const attempts = patch.incrementAttempts ? file.attempts + 1 : file.attempts;
      current.files[clientFileId] = {
        ...file,
        ...patch,
        attempts,
      };
      const next = hydrateCompleteState({ ...current, updatedAt: new Date().toISOString() });
      await write(next);
      return next;
    },
    async markPhotoRegistered(sessionId, clientFileId, photoId) {
      const s = await this.patchFile(sessionId, clientFileId, {
        status: "registered",
        photoId,
        registeredAt: new Date().toISOString(),
      });
      if (!s.uploadedPhotoIds.includes(photoId)) {
        s.uploadedPhotoIds.push(photoId);
        const next = hydrateCompleteState({ ...s, updatedAt: new Date().toISOString() });
        await write(next);
        return next;
      }
      return s;
    },
    async listActive(limit) {
      await ensureDir();
      const entries = await fs.readdir(root);
      const sessions: UploadSession[] = [];
      for (const name of entries.slice(0, limit)) {
        try {
          const raw = await fs.readFile(path.join(root, name), "utf8");
          sessions.push(hydrateCompleteState(JSON.parse(raw) as UploadSession));
        } catch {
          /* ignore corrupt files */
        }
      }
      return sessions;
    },
  };
}

function createBlobUploadSessionStore(token: string): UploadSessionStore {
  return {
    async create(input) {
      return mutateBlobSession(token, input.sessionId, () => makeNewSession(input));
    },
    async get(sessionId) {
      const s = await parseBlobJson(sessionPath(sessionId), token);
      return s ? hydrateCompleteState(s) : null;
    },
    async patchFile(sessionId, clientFileId, patch) {
      return mutateBlobSession(token, sessionId, (current) => {
        const base =
          current ||
          makeNewSession({
            sessionId,
            expectedCount: 0,
            files: [],
          });
        const file =
          base.files[clientFileId] ||
          ({
            clientFileId,
            pathname: "",
            filename: "",
            mime: "application/octet-stream",
            size: 0,
            status: "queued",
            attempts: 0,
          } satisfies UploadSessionFile);
        const attempts = patch.incrementAttempts ? file.attempts + 1 : file.attempts;
        base.files[clientFileId] = {
          ...file,
          ...patch,
          attempts,
        };
        return base;
      });
    },
    async markPhotoRegistered(sessionId, clientFileId, photoId) {
      return mutateBlobSession(token, sessionId, (current) => {
        const base =
          current ||
          makeNewSession({
            sessionId,
            expectedCount: 0,
            files: [],
          });
        const file =
          base.files[clientFileId] ||
          ({
            clientFileId,
            pathname: "",
            filename: "",
            mime: "application/octet-stream",
            size: 0,
            status: "queued",
            attempts: 0,
          } satisfies UploadSessionFile);
        base.files[clientFileId] = {
          ...file,
          status: "registered",
          photoId,
          registeredAt: new Date().toISOString(),
        };
        if (!base.uploadedPhotoIds.includes(photoId)) {
          base.uploadedPhotoIds.push(photoId);
        }
        return base;
      });
    },
    async listActive(limit) {
      const out: UploadSession[] = [];
      const list = await blobList({
        token,
        prefix: SESSION_PREFIX,
        limit,
      });
      for (const item of list.blobs) {
        const parsed = await parseBlobJson(item.pathname, token);
        if (parsed) out.push(hydrateCompleteState(parsed));
      }
      return out;
    },
  };
}

let singleton: UploadSessionStore | null = null;

export function getUploadSessionStore(): UploadSessionStore {
  if (singleton) return singleton;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  singleton = token
    ? createBlobUploadSessionStore(token)
    : createFilesystemUploadSessionStore();
  return singleton;
}
