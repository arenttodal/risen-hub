/**
 * Shared migration runner for the local and remote D1 scripts.
 *
 * Applies every checked-in Drizzle migration in journal order and records it in
 * `applied_migrations`, so re-running only applies what is new.
 *
 * Tables created by hand — for example by pasting the .sql files into the
 * Cloudflare D1 console, which docs/D1-SETUP.md route A tells people to do —
 * are not recorded anywhere. Re-applying such a migration fails with "table
 * already exists". That is not a real problem: the schema is already there. So
 * that specific failure is treated as "already applied" and recorded, which
 * lets a database set up through the dashboard accept later migrations from
 * these scripts. Any other failure is a genuine error and stops the run.
 */
import { readFileSync } from 'node:fs';

const ALREADY_EXISTS = /already exists/i;

export const sqlQuote = value =>
  value === null || value === undefined ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;

/**
 * @param run      (args: string[]) => string — invokes `wrangler d1 execute`
 * @param execSql  (label: string, sql: string) => void — runs a generated statement
 */
export function applyMigrations(run, execSql) {
  const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8'));

  run(['--command', 'CREATE TABLE IF NOT EXISTS applied_migrations (tag TEXT PRIMARY KEY, applied_at TEXT NOT NULL)']);
  const applied = new Set(
    (JSON.parse(run(['--command', 'SELECT tag FROM applied_migrations', '--json']))[0]?.results ?? []).map(
      row => row.tag,
    ),
  );

  const mark = tag =>
    execSql(
      `mark-${tag}`,
      `INSERT OR IGNORE INTO applied_migrations (tag, applied_at) VALUES (${sqlQuote(tag)}, ${sqlQuote(new Date().toISOString())});`,
    );

  for (const entry of journal.entries.sort((a, b) => a.idx - b.idx)) {
    if (applied.has(entry.tag)) {
      console.log(`· ${entry.tag} already applied`);
      continue;
    }
    try {
      run(['--file', `drizzle/${entry.tag}.sql`]);
      mark(entry.tag);
      console.log(`✓ applied ${entry.tag}`);
    } catch (error) {
      const output = `${error.stderr ?? ''}${error.stdout ?? ''}${error.message ?? ''}`;
      if (!ALREADY_EXISTS.test(output)) throw error;
      mark(entry.tag);
      console.log(`· ${entry.tag} was already in the database (applied by hand); recorded it`);
    }
  }
}
