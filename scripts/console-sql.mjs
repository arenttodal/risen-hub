/**
 * Generates paste-ready SQL for the Cloudflare D1 dashboard console.
 *
 * The migration files in `drizzle/` carry `--> statement-breakpoint` markers
 * for the migration tooling. In SQL `--` starts a comment that runs to the end
 * of the line, so if a paste loses its line breaks — which browsers and the
 * console routinely do — that marker comments out every statement after it and
 * D1 reports "SQL code did not contain a statement".
 *
 * The files written here therefore contain no `--` comments at all, which makes
 * them safe to paste whether or not the line breaks survive.
 *
 *   node scripts/console-sql.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildSeedSql } from './seed-sql.mjs';

/** Strip every line comment, then collapse the blank lines it leaves behind. */
const stripComments = sql =>
  sql
    .split('\n')
    .map(line => {
      const withoutMarker = line.replace(/-->\s*statement-breakpoint\s*$/, '');
      return withoutMarker.replace(/(^|\s)--(?!>).*$/, '$1').trimEnd();
    })
    .filter(line => line.trim() !== '')
    .join('\n');

mkdirSync('drizzle/console', { recursive: true });

const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8'));
const schema = journal.entries
  .sort((a, b) => a.idx - b.idx)
  .map(entry => stripComments(readFileSync(`drizzle/${entry.tag}.sql`, 'utf8')))
  .join('\n');

writeFileSync('drizzle/console/01-schema.sql', `${schema}\n`, 'utf8');
writeFileSync('drizzle/console/02-seed.sql', `${stripComments(await buildSeedSql('2026-09-20T00:00:00.000Z'))}\n`, 'utf8');

for (const file of ['drizzle/console/01-schema.sql', 'drizzle/console/02-seed.sql']) {
  const body = readFileSync(file, 'utf8');
  if (body.includes('--')) throw new Error(`${file} still contains a SQL comment; it would break on a flattened paste`);
  console.log(`Wrote ${file}`);
}
