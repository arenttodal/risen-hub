import { and, eq } from 'drizzle-orm';
import { getDb, getMedia, hasMedia, tryGetDb } from '@/db';
import { projectImages } from '@/db/schema';
import { checkUpload, storageKeyFor, type ImageKind } from '../images';
import { recordActivity } from './activity';

/**
 * Project images: metadata in D1, bytes in R2.
 *
 * Every write checks the bucket binding first and says so plainly when it is
 * missing. Image upload is the one feature that cannot fall back to a seed
 * dataset, so the honest failure is "storage is not connected", not a stack
 * trace behind a spinner.
 */

export interface StoredImage {
  id: string;
  projectId: string;
  kind: ImageKind;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  caption: string | null;
  takenAt: string | null;
  isFeatured: boolean;
  position: number;
  createdAt: string;
  /** Where the bytes are served from. Always through our own route, never a bucket URL. */
  url: string;
}

const toStored = (row: typeof projectImages.$inferSelect): StoredImage => ({
  id: row.id,
  projectId: row.projectId,
  kind: row.kind as ImageKind,
  fileName: row.fileName,
  contentType: row.contentType,
  sizeBytes: row.sizeBytes,
  caption: row.caption,
  takenAt: row.takenAt,
  isFeatured: row.isFeatured === 1,
  position: row.position,
  createdAt: row.createdAt,
  url: `/api/images/${row.id}/file`,
});

export function mediaConfigured(): boolean {
  return hasMedia();
}

export async function listProjectImages(projectId: string): Promise<StoredImage[]> {
  const db = tryGetDb();
  if (!db) return [];
  try {
    const rows = await db.select().from(projectImages).where(eq(projectImages.projectId, projectId));
    return rows
      .sort((a, b) => a.position - b.position || b.createdAt.localeCompare(a.createdAt))
      .map(toStored);
  } catch {
    // The table may not exist yet on a database that has not taken migration
    // 0005. An empty gallery is a better answer than a broken project page.
    return [];
  }
}

export type UploadResult =
  | { ok: true; image: StoredImage }
  | { ok: false; reason: string; status: number };

export async function uploadProjectImage(input: {
  projectId: string;
  kind: ImageKind;
  file: File;
  caption?: string | null;
}): Promise<UploadResult> {
  if (!hasMedia()) {
    return {
      ok: false,
      status: 503,
      reason: 'Bildelagring er ikke koblet til ennå. Se docs/MEDIA-SETUP.md.',
    };
  }

  const check = checkUpload({ name: input.file.name, type: input.file.type, size: input.file.size });
  if (!check.ok) return { ok: false, status: 422, reason: check.reason };

  const db = getDb();
  const id = crypto.randomUUID();
  const storageKey = storageKeyFor(input.projectId, input.file.name, id);
  const now = new Date().toISOString();

  // Bytes first. A row pointing at an object that was never written is a broken
  // thumbnail forever; an object with no row is invisible and can be swept.
  await getMedia().put(storageKey, await input.file.arrayBuffer(), {
    httpMetadata: { contentType: input.file.type },
  });

  const existing = await db.select().from(projectImages).where(eq(projectImages.projectId, input.projectId));

  await db.insert(projectImages).values({
    id,
    projectId: input.projectId,
    kind: input.kind,
    storageKey,
    fileName: input.file.name,
    contentType: input.file.type,
    sizeBytes: input.file.size,
    width: null,
    height: null,
    caption: input.caption?.trim() || null,
    takenAt: null,
    isFeatured: 0,
    documentRequirementId: input.kind === 'current' ? 'doc-bilder' : null,
    position: existing.length,
    uploadedBy: null,
    visibility: 'members',
    createdAt: now,
    updatedAt: now,
  });

  await recordActivity({
    entityType: 'project',
    entityId: input.projectId,
    action: 'created',
    summary: `Bilde lagt til: ${input.file.name}`,
    metadata: { imageId: id, kind: input.kind },
  });

  const rows = await db.select().from(projectImages).where(eq(projectImages.id, id)).limit(1);
  return { ok: true, image: toStored(rows[0]) };
}

/** Streams the bytes back. Null when the row or the object has gone. */
export async function readImage(id: string): Promise<{ body: ReadableStream; contentType: string } | null> {
  if (!hasMedia()) return null;
  const db = tryGetDb();
  if (!db) return null;
  const rows = await db.select().from(projectImages).where(eq(projectImages.id, id)).limit(1);
  if (rows.length === 0) return null;
  const object = await getMedia().get(rows[0].storageKey);
  if (!object) return null;
  return { body: object.body, contentType: rows[0].contentType };
}

/**
 * Makes one image the project's own, and unmakes the previous one.
 *
 * Both writes happen here rather than in the route so "exactly one featured
 * image per project" cannot be broken by a caller that forgets the second half.
 */
export async function setFeatured(id: string): Promise<boolean> {
  const db = getDb();
  const rows = await db.select().from(projectImages).where(eq(projectImages.id, id)).limit(1);
  if (rows.length === 0) return false;
  const now = new Date().toISOString();

  await db
    .update(projectImages)
    .set({ isFeatured: 0, updatedAt: now })
    .where(and(eq(projectImages.projectId, rows[0].projectId), eq(projectImages.isFeatured, 1)));
  await db.update(projectImages).set({ isFeatured: 1, updatedAt: now }).where(eq(projectImages.id, id));
  return true;
}

export async function updateImage(
  id: string,
  patch: { kind?: ImageKind; caption?: string | null },
): Promise<boolean> {
  const db = getDb();
  const rows = await db.select().from(projectImages).where(eq(projectImages.id, id)).limit(1);
  if (rows.length === 0) return false;

  const changes: Partial<typeof projectImages.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (patch.kind !== undefined) {
    changes.kind = patch.kind;
    // The document link follows the kind: a drawing is not photographic evidence.
    changes.documentRequirementId = patch.kind === 'current' ? 'doc-bilder' : null;
  }
  if (patch.caption !== undefined) changes.caption = patch.caption?.trim() || null;

  await db.update(projectImages).set(changes).where(eq(projectImages.id, id));
  return true;
}

/**
 * Removes an image for good.
 *
 * The only genuinely destructive operation in the app, and it is deliberate: an
 * image uploaded by mistake has no useful history, and a cancelled-but-visible
 * photo would still be a photo on the page. The UI confirms first, and the row
 * is removed only after the object is gone, so a failed delete leaves a working
 * thumbnail rather than a dangling one.
 */
export async function deleteImage(id: string): Promise<boolean> {
  const db = getDb();
  const rows = await db.select().from(projectImages).where(eq(projectImages.id, id)).limit(1);
  if (rows.length === 0) return false;
  const image = rows[0];

  if (hasMedia()) await getMedia().delete(image.storageKey);
  await db.delete(projectImages).where(eq(projectImages.id, id));

  await recordActivity({
    entityType: 'project',
    entityId: image.projectId,
    action: 'deleted',
    summary: `Bilde slettet: ${image.fileName}`,
    metadata: { kind: image.kind, fileName: image.fileName, sizeBytes: image.sizeBytes },
  });
  return true;
}
