/**
 * Applies the checked-in Drizzle migrations to the REMOTE D1 database, and
 * optionally the seed dataset.
 *
 * This writes to the database your deployed Worker reads. It refuses to run
 * without --confirm, and it never seeds unless you also pass --seed.
 *
 *   npx wrangler login
 *   node scripts/d1-remote.mjs --database risen-hub --confirm
 *   node scripts/d1-remote.mjs --database risen-hub --confirm --seed
 *
 * Migrations already recorded in `applied_migrations` are skipped, so this is
 * safe to re-run after adding a new migration.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSeedSql } from './seed-sql.mjs';
import { applyMigrations } from './migrations.mjs';

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const value = name => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const database = value('database') || process.env.CLOUDFLARE_D1_DATABASE_NAME;
if (!database) {
  console.error('Missing --database <name>. This is the D1 database name in your Cloudflare account.');
  process.exit(1);
}
if (!flag('confirm')) {
  console.error(
    `This applies migrations to the REMOTE database "${database}", which your deployed\n` +
      'Worker reads. Re-run with --confirm once you are sure.',
  );
  process.exit(1);
}

const scratch = mkdtempSync(join(tmpdir(), 'risen-d1-remote-'));

function run(extra) {
  return execFileSync('npx', ['wrangler', 'd1', 'execute', database, '--remote', '-y', ...extra], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function execSql(label, sql) {
  const file = join(scratch, `${label}.sql`);
  writeFileSync(file, sql, 'utf8');
  run(['--file', file]);
}

// 1. Migrations, in journal order.
applyMigrations(run, execSql);

// 2. Seed, only when explicitly asked for.
if (flag('seed')) {
  execSql('seed', await buildSeedSql());
  console.log('✓ seeded the remote database');
} else {
  console.log('· skipped seeding (pass --seed to insert the demo records)');
}

console.log(`\nDone. Redeploy, then check that /hub no longer shows the "Seed-data" notice.`);
