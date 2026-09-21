import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

/** True when a Cloudflare D1 binding is actually available to this worker. */
export function hasDb(): boolean {
  return Boolean(env.DB);
}

export function getDb() {
  if (!env.DB) {
    throw new Error(
      'Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database.',
    );
  }

  return drizzle(env.DB, { schema });
}

/**
 * Same as `getDb`, but returns null instead of throwing when no binding exists.
 * Read paths use this so a missing database degrades to the seed dataset rather
 * than to an error page. Write paths should keep using `getDb`.
 */
export function tryGetDb() {
  return env.DB ? drizzle(env.DB, { schema }) : null;
}

export function getRawDb() {
  if (!env.DB) throw new Error('Database unavailable');
  return env.DB;
}

/**
 * True when an R2 media bucket is bound to this worker.
 *
 * The binding name is `MEDIA`, set through the `r2` field in
 * `.openai/hosting.json`. It is deliberately checked rather than assumed: image
 * upload is the one feature that cannot degrade to a seed dataset, so the UI
 * asks this and says plainly that storage is not connected instead of throwing
 * a failed upload at someone.
 */
export function hasMedia(): boolean {
  return Boolean((env as unknown as { MEDIA?: R2Bucket }).MEDIA);
}

export function getMedia(): R2Bucket {
  const bucket = (env as unknown as { MEDIA?: R2Bucket }).MEDIA;
  if (!bucket) {
    throw new Error(
      'Cloudflare R2 binding `MEDIA` is unavailable. Create a bucket and set the `r2` field in .openai/hosting.json to `MEDIA`.',
    );
  }
  return bucket;
}
