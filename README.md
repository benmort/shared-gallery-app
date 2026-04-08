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
4. Leave **Framework Preset** as **Next.js** and **Build Command** / **Output** as defaults. No environment variables are required for the current code.
5. Click **Deploy**.

Vercel will run `pnpm install` (lockfile detected) and `pnpm build`.

### Important: uploads on Vercel

Production Vercel deployments use **serverless functions** with an **ephemeral filesystem**. The default **`data/`** storage in this repo can **lose uploads** between requests or after a cold start, and different users may not see the same album. The app will **build and run**, but for a real shared album in production you should switch **`PhotoStorage`** to something durable ([Vercel Blob](https://vercel.com/docs/storage/vercel-blob), Supabase Storage, S3, Cloudinary, etc.). See [Swapping in real cloud storage](#swapping-in-real-cloud-storage).

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
| `lib/storage/` | Filesystem `PhotoStorage` implementation (swap for cloud later) |
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

The boundary is **`PhotoStorage`** in [`lib/storage/types.ts`](lib/storage/types.ts) and the default **`createFilesystemStorage()`** in [`lib/storage/filesystem.ts`](lib/storage/filesystem.ts).

Implement the same methods against **Supabase Storage**, **S3**, **Cloudinary**, etc.:

- `list()` → return public `Photo` rows (with `url` pointing at your CDN or signed URLs).
- `createFromBuffer()` → upload bytes, persist metadata, return `Photo`.
- `readFile()` → only needed if you continue serving through this app; with a CDN you might drop the file route and use direct URLs.

**Vercel / serverless:** the default filesystem adapter expects a **persistent disk** (local dev or your own Node host). Serverless instances have **ephemeral** storage, so uploads would disappear between invocations unless you move storage off-disk.

## Environment variables

None required for the default setup. See [`.env.example`](.env.example) for a placeholder when you add a provider.

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
