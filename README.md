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
- **Server upload body limit** on Vercel is about **4.5 MB** per request. **Videos larger than that will fail** on **`POST /api/photos`** until you add a [client upload](https://vercel.com/docs/vercel-blob/client-upload) path (not implemented here). Locally, videos may be up to **50 MB** (see [`lib/types/photo.ts`](lib/types/photo.ts) `MAX_VIDEO_BYTES`).
- Locally, leave the token unset to keep using **`data/`** on disk.
- If you previously set **`BLOB_STORE_ACCESS`**, remove it from Vercel env (it is no longer read).

## Scripts

| Command       | Description              |
| ------------- | ------------------------ |
| `pnpm dev`    | Development server       |
| `pnpm build`  | Production build         |
| `pnpm start`  | Start production server  |
| `pnpm lint`   | ESLint                   |

## Project layout

| Path | Role |
| ---- | ---- |
| `app/page.tsx` | Single homepage: masonry grid with **Share a moment** hero as the first cell + photos (`/`) |
| `app/album/page.tsx` | **Permanent redirect** to `/` (legacy URL) |
| `app/album/p/[photoId]/page.tsx` | Deep link → `/?photoId=…` |
| `app/api/photos/route.ts` | `GET` list, `POST` multipart upload |
| `app/api/photos/[id]/file/route.ts` | Serve media bytes (`200` / `206` Range) |
| `lib/storage/` | `PhotoStorage`: filesystem locally, **Vercel Blob** when `BLOB_READ_WRITE_TOKEN` is set |
| `lib/types/photo.ts` | `Photo` model + validation limits |
| `components/` | Upload hero, camera, gallery, lightbox, scroll-to-top |

Uploaded files and metadata live under **`data/`** (gitignored): `data/uploads/*` and `data/photos.json`.

## How this differs from the Vercel Image Gallery Starter

The project started from the Next.js **`with-cloudinary`** (Vercel “Image Gallery Starter”) demo. This app **keeps** the gallery experience: masonry columns, **Headless UI** dialog, **Framer Motion** transitions, **react-swipeable**, prev/next controls, bottom **filmstrip** (windowed thumbnails), open-in-new-tab, **download**, arrow keys, and **last-viewed scroll** restoration via `useLastViewedPhoto`.

**Removed or replaced:** Cloudinary URLs, Pages Router, `getStaticProps` image search, imagemin blur URLs, Twitter share, marketing hero/footer.

**New:** App Router, local **filesystem** storage behind a **`PhotoStorage`** interface, **POST** uploads with **sharp**-generated blur placeholders, UUID photo ids, one-page gallery with starter-style hero card, lightbox via `/?photoId=<uuid>` (plus `/album/p/<uuid>` → `/?photoId=`).

## Mobile camera behavior

1. **Photo capture** — `<input type="file" accept="image/*" capture="environment">` so many phones open the **rear camera** or camera app for a still, with no extra permissions in the browser.

2. **Video capture** — `<input type="file" accept="video/*" capture="environment">` for the device camera app to record or pick a clip (MP4 / WebM / MOV per app).

3. **Choose photos** — standard multi-select file input from the photo library (and videos via the dropzone).

## Video

- **Types:** `video/mp4`, `video/webm`, `video/quicktime` (common for `.mov`).
- **Limits:** **50 MB** per video (app validation); images stay **10 MB**. There is **no server-side transcoding** — grid tiles use `<video preload="metadata">` (first-frame preview depends on the browser).
- **Vercel:** The platform **request body** cap (~**4.5 MB**) applies to **`POST /api/photos`**. Clips under that limit can upload today; larger files require a future client-to-Blob upload implementation.

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
| `MODERATION_SECRET` | **Moderation mode** (`?moderation=true`): at least **16** characters; signs the HTTP-only session cookie. |
| `MODERATION_PASSWORD` | **Moderation mode**: at least **8** characters; the password operators use to sign in. |

Without both moderation variables, the app shows a warning on the moderation page and moderation login and deletes are disabled.

- **Local:** copy [`.env.example`](.env.example) to **`.env.local`**, set both variables, restart **`pnpm dev`**.
- **Vercel:** **Project → Settings → Environment Variables**, add both for **Production** (and **Preview** if you use moderation on preview URLs), then **Redeploy**.

See [`.env.example`](.env.example).

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
- [ ] Deep link `/album/p/<uuid>` opens the same lightbox as `/?photoId=<uuid>`.

## License

Private / use as you like for your event.
