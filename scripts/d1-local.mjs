/**
 * Bootstraps the LOCAL Miniflare D1 database used by `npm run dev`.
 *
 * Runs standalone — it does not need `npm run build` first.
 *
 * Applies every checked-in Drizzle migration in journal order, then inserts the
 * seed dataset from `data/risen.ts` so there is only ever one definition of the
 * seed. Safe to re-run: migrations that are already applied are skipped via the
 * `applied_migrations` table, and seed rows use INSERT OR IGNORE.
 *
 * This touches local state only. Production D1 is provisioned and migrated by
 * the hosting control plane; see docs/decisions/0001-d1-persistence.md.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSeedSql } from './seed-sql.mjs';
import { buildLegacyImportSql } from './legacy-import-sql.mjs';
import { applyMigrations } from './migrations.mjs';

const PERSIST = '.wrangler/state';
const scratch = mkdtempSync(join(tmpdir(), 'risen-d1-'));

// A throwaway Wrangler config for the CLI. The build no longer emits a D1
// binding unless CLOUDFLARE_D1_DATABASE_ID is set (a placeholder id fails a
// real deploy), so this script cannot rely on dist/server/wrangler.json. The
// placeholder id is what Miniflare keys local state by, so it matches `npm run dev`.
const CONFIG = join(scratch, 'wrangler.json');
writeFileSync(CONFIG, JSON.stringify({
  name: 'risen-hub-d1-local',
  compatibility_date: '2026-05-15',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: [{
    binding: 'DB',
    database_name: process.env.CLOUDFLARE_D1_DATABASE_NAME?.trim() || 'site-creator-d1',
    database_id: '00000000-0000-4000-8000-000000000000',
  }],
}, null, 2), 'utf8');

function run(args) {
  return execFileSync('npx', ['wrangler', 'd1', 'execute', 'DB', '--local',
    '--config', CONFIG, '--persist-to', PERSIST, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function execFile(path) {
  run(['--file', path]);
}

function execSql(label, sql) {
  const file = join(scratch, `${label}.sql`);
  writeFileSync(file, sql, 'utf8');
  execFile(file);
}

// 1. Migrations, in journal order.
applyMigrations(run, execSql);

// 2. Seed, from the one shared builder so local, remote and drizzle/seed.sql agree.
execSql('seed', await buildSeedSql());
const { seedPlaces, seedProjects, seedMilestones, seedWorkItems } = await import('../data/risen.ts');
console.log(`✓ seeded ${seedPlaces.length} places, ${seedProjects.length} projects, ${seedMilestones.length} milestones, ${seedWorkItems.length} work items`);

// 3. The legacy funding catalogue. Upserts on deterministic ids, so this is
// safe to re-run and never overwrites research done since the last run.
const { sql: legacySql, data: legacy } = buildLegacyImportSql();
execSql('legacy-import', legacySql);
console.log(
  `✓ imported ${legacy.angles.length} angles, ${legacy.schemes.length} schemes, ` +
    `${legacy.documents.length} document requirements, ${legacy.templates.length} templates`,
);
if (legacy.undocumented.length > 0) {
  console.log(
    `  ${legacy.undocumented.length} requirements are referenced by a scheme but never described in the archive: ` +
      `${legacy.undocumented.join(', ')}`,
  );
}

console.log('\nLocal D1 is ready. Restart `npm run dev` if it is already running.');
