# Shared event album

A **mobile-first** Next.js (App Router) app for a single-event photo album: upload from the camera roll, capture with the device camera, add **short videos** (MP4, WebM, MOV) from the library, and browse everything in a masonry gallery with a full-screen lightbox (swipe, filmstrip, keyboard, download).

## Prerequisites

- Node.js 20+ recommended  
- [pnpm](https://pnpm.io) (or use `npm` / `yarn` with equivalent commands)

## Setup

```bash
pnpm install
```

If you use **pnpm 10+**, native dependencies may need an explicit allowlist so **sharp** can compile. If uploads fail with a sharp-related error, run:

```bash
pnpm approve-builds
```

and approve `sharp`, then reinstall.

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push this app to GitHub, GitLab, or Bitbucket (or connect your existing repo).
2. In [Vercel](https://vercel.com), choose **Add New… → Project** and **Import** that repository.
3. **If this folder lives inside a monorepo** (for example `common-threads/shared-gallery-app`), open **Root Directory** in the import settings and set it to **`shared-gallery-app`** so Vercel runs install/build from here (where `package.json` and `pnpm-lock.yaml` live).
4. Leave **Framework Preset** as **Next.js** and **Build Command** / **Output** as defaults.
5. **Enable Vercel Blob** (required for uploads): in the project go to **Storage → Create Database → Blob**, create a store with **Private** access, then **Connect** it to this project. That injects **`BLOB_READ_WRITE_TOKEN`** automatically. Without it, uploads fail with **`EROFS: read-only file system`** because `/var/task` is not writable. (This app uses **private** blobs only; a public-only store is not supported.)
6. Redeploy if you add Blob after the first deploy.

Vercel will run `pnpm install` (lockfile detected) and `pnpm build`.

### Vercel Blob notes

- With **`BLOB_READ_WRITE_TOKEN`** set, [`getPhotoStorage()`](lib/storage/index.ts) uses **Vercel Blob** ([`lib/storage/vercel-blob.ts`](lib/storage/vercel-blob.ts)) with **`access: 'private'`** only. Use a **private** Blob store. Media files live at `album-img/{id}.{ext}`, manifest at **`album-manifest.json`**. Full-size assets are always served through **`/api/photos/[id]/file`** (server uses the Blob SDK [`get()`](https://vercel.com/docs/vercel-blob/private-storage)) with **`Accept-Ranges`** and **`206 Partial Content`** for byte-range requests (needed for video seeking).
- **Client upload pipeline is implemented** via `POST /api/photos/upload-session` + `POST /api/blob/upload` + `POST /api/photos/reconcile`. This bypasses request-body limits for large media while keeping blobs private.
- The legacy multipart endpoint **`POST /api/photos`** still exists for local/fallback workflows and small payloads.
- Locally, leave the token unset to keep using **`data/`** on disk.
- If you previously set **`BLOB_STORE_ACCESS`**, remove it from Vercel env (it is no longer read).

## Enterprise upload pipeline

The Moments upload system now supports an enterprise-oriented flow:

1. Client creates an upload session (`/api/photos/upload-session`) and receives a stable `uploadId`.
2. Client uploads directly to private Blob with signed token issuance (`/api/blob/upload`).
3. Server performs idempotent metadata registration (`registerClientUpload`) and stores metadata in Postgres when configured.
4. Client reconciles uploaded IDs (`/api/photos/reconcile`) to render immediate gallery state.
5. Background jobs (`/api/photos/jobs/process`) generate image derivatives with retry + DLQ semantics.

Operational APIs:

- `GET /api/photos/metrics` — in-process upload counters.
- `GET /api/photos/consistency` — manifest vs DB compare during dual-write.
- `GET /api/photos/jobs/reprocess` and `POST /api/photos/jobs/reprocess` — inspect/requeue DLQ jobs.
- `GET /api/photos/jobs/reconcile-orphans` — DB/blob orphan checks.

## Scripts

| Command       | Description              |
| ------------- | ------------------------ |
| `pnpm dev`    | Development server       |
| `pnpm build`  | Production build         |
| `pnpm start`  | Start production server  |
| `pnpm lint`   | ESLint                   |
| `pnpm backfill:media-db` | Backfill/verify Blob manifest into Postgres metadata |
| `pnpm loadtest:moments-upload` | Upload load test (concurrency, latency, failure rate) |

## Project layout

| Path | Role |
| ---- | ---- |
| `app/(summit)/page.tsx` | Summit dashboard as default home route (`/`) |
| `app/(summit)/program/page.tsx` | Summit program (`/program`) |
| `app/(summit)/speakers/page.tsx` | Speaker directory (`/speakers`) |
| `app/(summit)/speakers/[id]/page.tsx` | Speaker detail (`/speakers/:id`) |
| `app/(summit)/events/[id]/page.tsx` | Event detail (`/events/:id`) |
| `app/(summit)/surveys/page.tsx` | Surveys (`/surveys`) |
| `app/(summit)/code-conduct/page.tsx` | Code of conduct (`/code-conduct`) |
| `app/moments/page.tsx` | Main gallery page: masonry grid with **Share a moment** hero as the first cell + photos (`/moments`) |
| `app/api/photos/route.ts` | `GET` list, `POST` multipart upload |
| `app/api/photos/[id]/file/route.ts` | Serve media bytes (`200` / `206` Range) |
| `lib/storage/` | `PhotoStorage`: filesystem locally, **Vercel Blob** when `BLOB_READ_WRITE_TOKEN` is set |
| `lib/summit/` | Summit singleton data loader, context helpers, domain mappings |
| `lib/types/photo.ts` | `Photo` model + validation limits |
| `components/` | Upload hero, camera, gallery, lightbox, scroll-to-top |

Uploaded files and metadata live under **`data/`** (gitignored): `data/uploads/*` and `data/photos.json`.

## How this differs from the Vercel Image Gallery Starter

The project started from the Next.js **`with-cloudinary`** (Vercel “Image Gallery Starter”) demo. This app **keeps** the gallery experience: masonry columns, **Headless UI** dialog, **Framer Motion** transitions, **react-swipeable**, prev/next controls, bottom **filmstrip** (windowed thumbnails), open-in-new-tab, **download**, arrow keys, and **last-viewed scroll** restoration via `useLastViewedPhoto`.

**Removed or replaced:** Cloudinary URLs, Pages Router, `getStaticProps` image search, imagemin blur URLs, Twitter share, marketing hero/footer.

**New:** App Router, local **filesystem** storage behind a **`PhotoStorage`** interface, **POST** uploads with **sharp**-generated blur placeholders, UUID photo ids, one-page gallery with starter-style hero card, lightbox via `/moments?photoId=<uuid>`.

## Mobile camera behavior

1. **Photo capture** — `<input type="file" accept="image/*" capture="environment">` so many phones open the **rear camera** or camera app for a still, with no extra permissions in the browser.

2. **Video capture** — `<input type="file" accept="video/*" capture="environment">` for the device camera app to record or pick a clip (MP4 / WebM / MOV per app).

3. **Choose photos** — standard multi-select file input from the photo library (and videos via the dropzone).

## Video

- **Types:** `video/mp4`, `video/webm`, `video/quicktime` (common for `.mov`).
- **Limits:** **250 MB** per video (app validation + token enforcement); images stay **10 MB**.
- **Vercel:** large videos should use the direct Blob upload path (`/api/photos/upload-session` + `/api/blob/upload`); multipart `POST /api/photos` remains for fallback and local usage.
- **Processing:** image derivatives run through the async processing queue when DB mode is enabled; videos are marked done without derivative generation.

## Swapping in real cloud storage

The boundary is **`PhotoStorage`** in [`lib/storage/types.ts`](lib/storage/types.ts). **`getPhotoStorage()`** picks **`createVercelBlobPhotoStorage()`** when **`BLOB_READ_WRITE_TOKEN`** is set, otherwise **`createFilesystemStorage()`** ([`lib/storage/filesystem.ts`](lib/storage/filesystem.ts)).

For another provider (Supabase, S3, Cloudinary), implement the same methods and wire it in **`lib/storage/index.ts`**.

- `list()` → return `Photo` rows (each has **`kind`**: `image` | `video`); full URLs use **`/api/photos/[id]/file`**.
- `createFromBuffer()` → upload bytes, persist metadata, return `Photo`.
- `getFileMeta()` → size + MIME for **`Range`** handling.
- `readFile(id, range?)` → full or partial bytes for **`/api/photos/[id]/file`**.

## Environment variables

| Variable | When |
| -------- | ---- |
| `BLOB_READ_WRITE_TOKEN` | **Vercel production** (auto from linked private Blob store). Omit locally for `./data/` storage. |
| `POSTGRES_URL` | Enables DB-backed metadata storage, background queue state, and dual-write/read cutover controls. |
| `UPLOAD_ROLLOUT_STAGE` | `legacy` \| `internal` \| `limited` \| `full` rollout stage marker for the upload pipeline. |
| `UPLOAD_DUAL_WRITE_ENABLED` | Write metadata to both manifest and DB during migration (default: true when DB configured). |
| `UPLOAD_DB_READ_ENABLED` | Read listing metadata from DB (default: true when DB configured). |
| `UPLOAD_DB_ONLY_ENABLED` | Disable manifest writes and use DB as sole metadata store. |
| `UPLOAD_PROCESSING_QUEUE_ENABLED` | Enable async derivative processing jobs for image uploads. |
| `UPLOAD_JOB_SECRET` | Secret used to protect maintenance/job endpoints. |
| `MODERATION_SECRET` | **Moderation mode** (`?moderation=true`): at least **16** characters; signs the HTTP-only session cookie. |
| `MODERATION_PASSWORD` | **Moderation mode**: at least **8** characters; the password operators use to sign in. |

Without both moderation variables, the app shows a warning on the moderation page and moderation login and deletes are disabled.

- **Local:** copy [`.env.example`](.env.example) to **`.env.local`**, set both variables, restart **`pnpm dev`**.
- **Vercel:** **Project → Settings → Environment Variables**, add both for **Production** (and **Preview** if you use moderation on preview URLs), then **Redeploy**.

See [`.env.example`](.env.example).

## Summit stub data

- Summit pages read from a single local JSON file: [`lib/summit/data/data.json`](lib/summit/data/data.json).
- The service layer normalizes this fixture in [`lib/summit/stub-data.ts`](lib/summit/stub-data.ts), then exposes it through [`lib/summit/service.ts`](lib/summit/service.ts).
- The app is intentionally singleton: one summit only, no summit selection UI or API.

## Summit migration operations

- Architecture: [`docs/summit-migration/architecture.md`](docs/summit-migration/architecture.md)
- Parity checklist: [`docs/summit-migration/parity-checklist.md`](docs/summit-migration/parity-checklist.md)
- Rollout/rollback runbook: [`docs/summit-migration/rollout-runbook.md`](docs/summit-migration/rollout-runbook.md)
- Native decommission notes: [`docs/summit-migration/decommission-native.md`](docs/summit-migration/decommission-native.md)
- Moments upload runbook: [`docs/moments-upload-runbook.md`](docs/moments-upload-runbook.md)
- Moments upload QA checklist: [`docs/moments-upload-qa-checklist.md`](docs/moments-upload-qa-checklist.md)

## Manual QA checklist

- [ ] Upload one and multiple images from the library; thumbnails and upload bar behave well on a narrow screen.
- [ ] Upload a short **MP4** (under Vercel body limit if deployed); confirm grid tile, lightbox playback, and seek.
- [ ] Reject oversize / wrong type files (client + server messages).
- [ ] **Photo capture** and **Video capture** on iOS Safari and Android Chrome.
- [ ] **No photos yet** copy in the hero when the grid only shows the upload card.
- [ ] Open lightbox from grid; **close** returns scroll to the last viewed tile.
- [ ] **Back / forward** browser navigation with `?photoId=`.
- [ ] Swipe, filmstrip taps, **arrow keys**, **Escape** to close.
- [ ] **Download** and **open full image** in a new tab.

## License

Private / use as you like for your event.
