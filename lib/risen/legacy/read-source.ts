import { readFileSync } from 'node:fs';
import type { LegacySource } from './types.ts';

/**
 * Reads the vendored archive.
 *
 * NODE ONLY. This touches the filesystem and evaluates the archive's own
 * declarations, so it must never be imported by anything that ships to the
 * browser or the Worker. It exists for the import script and its tests.
 *
 * The archive is read rather than transcribed into a checked-in JSON file on
 * purpose: a transcript is a second copy that can drift from the thing it
 * copies, and then nobody knows which one the import actually used.
 */

export const LEGACY_SOURCE_PATH = 'legacy/smabruk-stottehub/app.js';

export function readLegacySource(path = LEGACY_SOURCE_PATH): LegacySource {
  const file = readFileSync(path, 'utf8');

  // Only the declarations up to `defaults` are data; what follows is the old
  // app's UI, which references `document` and would throw here.
  const end = file.indexOf('const defaults=');
  if (end === -1) throw new Error(`${path} does not look like the expected archive`);
  const declarations = file.slice(0, end);

  const collect = new Function(
    'out',
    `${declarations}
     out.TODAY = TODAY;
     out.projects = projects;
     out.funds = funds;
     out.docs = docs;
     out.templateLibrary = templateLibrary;`,
  ) as (out: Partial<LegacySource>) => void;

  const source: Partial<LegacySource> = {};
  collect(source);

  for (const key of ['TODAY', 'projects', 'funds', 'docs', 'templateLibrary'] as const) {
    if (source[key] === undefined) throw new Error(`${path} is missing \`${key}\``);
  }
  return source as LegacySource;
}
