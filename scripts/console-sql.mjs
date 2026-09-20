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
 * They are also idempotent. The D1 console aborts the whole batch at the first
 * error, so a plain `CREATE TABLE` against a database that already has one
 * table stops everything after it and silently creates nothing. Every CREATE is
 * therefore rewritten to `IF NOT EXISTS`, and the seed uses INSERT OR IGNORE,
 * so the files can be pasted at any point no matter what already exists.
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

/** `CREATE TABLE x` -> `CREATE TABLE IF NOT EXISTS x`, same for indexes. */
const makeIdempotent = sql =>
  sql
    .replace(/CREATE TABLE (?!IF NOT EXISTS)/gi, 'CREATE TABLE IF NOT EXISTS ')
    .replace(/CREATE (UNIQUE )?INDEX (?!IF NOT EXISTS)/gi, (_, unique) => `CREATE ${unique ?? ''}INDEX IF NOT EXISTS `);

mkdirSync('drizzle/console', { recursive: true });

const written = [];
const write = (name, body) => {
  writeFileSync(`drizzle/console/${name}`, `${body}\n`, 'utf8');
  written.push(`drizzle/console/${name}`);
};

// One file per migration. A combined file grew past what the D1 console
// accepts in one paste, and a truncated paste fails with "incomplete input"
// after silently applying whatever came before the cut.
const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8'));
for (const entry of journal.entries.sort((a, b) => a.idx - b.idx)) {
  const index = String(entry.idx).padStart(2, '0');
  write(`schema-${index}.sql`, makeIdempotent(stripComments(readFileSync(`drizzle/${entry.tag}.sql`, 'utf8'))));
}

const LIMIT = 9000;

// The seed is larger than one paste, so split it into numbered parts on
// statement boundaries. Every statement is INSERT OR IGNORE, so the parts are
// independent and re-runnable, but they still go in order: later tables
// reference earlier ones.
const seedStatements = stripComments(await buildSeedSql('2026-09-20T00:00:00.000Z'))
  .split('\n')
  .filter(line => line.trim() !== '');
const parts = [[]];
let size = 0;
for (const statement of seedStatements) {
  if (size + statement.length + 1 > LIMIT && parts.at(-1).length > 0) {
    parts.push([]);
    size = 0;
  }
  parts.at(-1).push(statement);
  size += statement.length + 1;
}
parts.forEach((part, index) => write(`seed-${String(index + 1).padStart(2, '0')}.sql`, part.join('\n')));
for (const file of written) {
  const body = readFileSync(file, 'utf8');
  if (body.includes('--')) throw new Error(`${file} still contains a SQL comment; it would break on a flattened paste`);
  if (/CREATE (TABLE|(UNIQUE )?INDEX) (?!IF NOT EXISTS)/i.test(body)) {
    throw new Error(`${file} has a CREATE without IF NOT EXISTS; re-running it would abort the batch`);
  }
  if (body.length > LIMIT) {
    throw new Error(`${file} is ${body.length} characters, over the ${LIMIT} the console reliably accepts in one paste`);
  }
  console.log(`Wrote ${file} (${body.length} chars)`);
}
