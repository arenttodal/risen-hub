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
