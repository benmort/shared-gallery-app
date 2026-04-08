# Shared event album

A **mobile-first** Next.js (App Router) app for a single-event photo album: upload from the camera roll, capture with the device camera, and browse everything in a masonry gallery with a full-screen lightbox (swipe, filmstrip, keyboard, download).

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
5. **Enable Vercel Blob** (required for uploads): in the project go to **Storage → Create Database → Blob**, create a store, then **Connect** it to this project. That injects **`BLOB_READ_WRITE_TOKEN`** automatically. Without it, uploads fail with **`EROFS: read-only file system`** because `/var/task` is not writable.
6. Redeploy if you add Blob after the first deploy.

Vercel will run `pnpm install` (lockfile detected) and `pnpm build`.

### Vercel Blob notes

- With **`BLOB_READ_WRITE_TOKEN`** set, [`getPhotoStorage()`](lib/storage/index.ts) uses **Vercel Blob** ([`lib/storage/vercel-blob.ts`](lib/storage/vercel-blob.ts)): images at `album-img/{id}.{ext}` and a JSON manifest at **`album-manifest.json`**. Gallery URLs point at the blob CDN.
- **Server upload body limit** on Vercel is about **4.5 MB** per request; larger files need a [client upload](https://vercel.com/docs/vercel-blob/client-upload) flow (not implemented here).
- Locally, leave the token unset to keep using **`data/`** on disk.

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
| `app/api/photos/[id]/file/route.ts` | Serve image bytes |
| `lib/storage/` | `PhotoStorage`: filesystem locally, **Vercel Blob** when `BLOB_READ_WRITE_TOKEN` is set |
| `lib/types/photo.ts` | `Photo` model + validation limits |
| `components/` | Upload hero, camera, gallery, lightbox, scroll-to-top |

Uploaded files and metadata live under **`data/`** (gitignored): `data/uploads/*` and `data/photos.json`.

## How this differs from the Vercel Image Gallery Starter

The project started from the Next.js **`with-cloudinary`** (Vercel “Image Gallery Starter”) demo. This app **keeps** the gallery experience: masonry columns, **Headless UI** dialog, **Framer Motion** transitions, **react-swipeable**, prev/next controls, bottom **filmstrip** (windowed thumbnails), open-in-new-tab, **download**, arrow keys, and **last-viewed scroll** restoration via `useLastViewedPhoto`.

**Removed or replaced:** Cloudinary URLs, Pages Router, `getStaticProps` image search, imagemin blur URLs, Twitter share, marketing hero/footer.

**New:** App Router, local **filesystem** storage behind a **`PhotoStorage`** interface, **POST** uploads with **sharp**-generated blur placeholders, UUID photo ids, one-page gallery with starter-style hero card, lightbox via `/?photoId=<uuid>` (plus `/album/p/<uuid>` → `/?photoId=`).

## Mobile camera behavior

1. **Quick photo** — `<input type="file" accept="image/*" capture="environment">` so many phones open the **rear camera** or camera app directly, with no extra permissions in the browser.

2. **Live camera** — `getUserMedia` with `facingMode: { ideal: "environment" }` for in-page preview, capture to JPEG, then **retake** or **add to upload**. Requires **HTTPS** in production (localhost is treated as secure). If the user denies permission or the API is missing, the UI explains the situation and points back to Quick photo.

3. **Choose photos** — standard multi-select file input from the photo library.

## Swapping in real cloud storage

The boundary is **`PhotoStorage`** in [`lib/storage/types.ts`](lib/storage/types.ts). **`getPhotoStorage()`** picks **`createVercelBlobPhotoStorage()`** when **`BLOB_READ_WRITE_TOKEN`** is set, otherwise **`createFilesystemStorage()`** ([`lib/storage/filesystem.ts`](lib/storage/filesystem.ts)).

For another provider (Supabase, S3, Cloudinary), implement the same methods and wire it in **`lib/storage/index.ts`**.

- `list()` → return public `Photo` rows (with `url` pointing at your CDN or signed URLs).
- `createFromBuffer()` → upload bytes, persist metadata, return `Photo`.
- `readFile()` → used by **`/api/photos/[id]/file`** when `Photo.url` still points at that route; blob records set **`publicUrl`** so the gallery uses the CDN directly while the file route can still stream bytes if needed.

## Environment variables

| Variable | When |
| -------- | ---- |
| `BLOB_READ_WRITE_TOKEN` | **Vercel production** (auto from linked Blob store). Omit locally for `./data/` storage. |

See [`.env.example`](.env.example).

## Manual QA checklist

- [ ] Upload one and multiple images from the library; thumbnails and upload bar behave well on a narrow screen.
- [ ] Reject oversize / wrong type files (client + server messages).
- [ ] **Quick photo** and **Live camera** on iOS Safari and Android Chrome; deny permission and confirm messaging.
- [ ] **No photos yet** copy in the hero when the grid only shows the upload card.
- [ ] Open lightbox from grid; **close** returns scroll to the last viewed tile.
- [ ] **Back / forward** browser navigation with `?photoId=`.
- [ ] Swipe, filmstrip taps, **arrow keys**, **Escape** to close.
- [ ] **Download** and **open full image** in a new tab.
- [ ] Deep link `/album/p/<uuid>` opens the same lightbox as `/?photoId=<uuid>`.

## License

Private / use as you like for your event.
