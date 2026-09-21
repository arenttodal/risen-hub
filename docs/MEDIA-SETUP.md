# Connecting image storage (R2)

Project images need a Cloudflare R2 bucket. Everything else is already built:
the database table, the upload route, the gallery. Until the bucket exists the
gallery says so plainly and upload is switched off, so nothing is lost in the
meantime and nothing has to be rebuilt afterwards.

This is shorter than the D1 setup. Two steps and a redeploy.

## Why R2 and not the database

Images are megabytes. D1 is SQLite with a row size limit and a storage cost
that assumes rows are small; putting photographs in it would make every query
slower and every backup enormous. R2 is object storage — it is the right shape
for bytes, and the Worker already has the binding wiring in `vite.config.ts`.

## 1. Create the bucket

1. Cloudflare dashboard → **R2 Object Storage** → **Create bucket**.
2. Name it `risen-media`.
3. Location: **Automatic** is fine.
4. **Leave public access off.** Images are served through the Worker at
   `/api/images/:id/file` so that `visibility` can decide who sees what once
   there is authentication. A public bucket URL, once shared, is public forever
   and cannot be taken back.

## 2. Turn the binding on

In `.openai/hosting.json`, change `"r2": null` to:

```json
{
  "d1": "DB",
  "r2": "MEDIA"
}
```

`vite.config.ts` already reads that field and emits the binding, using the
bucket name `risen-media`. If you named the bucket something else, set the
build variable `CLOUDFLARE_R2_BUCKET_NAME` to match — the same place you set
`CLOUDFLARE_D1_DATABASE_ID`.

## 3. Apply migration 0005

The `project_images` table arrived with migration `0005_pale_tyrannus`.

**Terminal:**

```bash
npm run db:remote -- --database risen-hub --confirm
```

**Browser:** paste `drizzle/console/schema-05.sql` into the D1 console, same as
the other schema files in `docs/D1-SETUP.md`.

## 4. Redeploy

The gallery's warning disappears and drag-and-drop starts working. No code
changes.

## Checking it worked

Open any project, click the image card in the top right. The yellow
"bildelagring er ikke koblet til" notice should be gone and **Velg filer**
should be enabled. Drop a JPEG onto *Slik skal det bli* and it should appear
in the card behind the overlay.

## What is stored, and where

| | |
| --- | --- |
| Bytes | R2, under `projects/<project-id>/<image-id>.<ext>` |
| Metadata | D1, table `project_images` |
| Served from | `/api/images/:id/file`, never a bucket URL |

Accepted: JPEG, PNG, WebP, AVIF, GIF, up to 12 MB each. **HEIC is refused on
purpose** — iPhones offer it and no other browser can display it, so accepting
it would store pictures nobody can see. The uploader says so rather than
failing silently.

Deleting an image really deletes it, from both the bucket and the table. It is
the one destructive action in the app: a photo uploaded by mistake has no useful
history, and a "cancelled" photo would still be a photo on the page. The
interface confirms first.
