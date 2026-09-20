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
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

const quote = v => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`);
const insert = (table, columns, rows) =>
  rows
    .map(row => `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(c => quote(row[c])).join(', ')});`)
    .join('\n');

function execSql(label, sql) {
  const file = join(scratch, `${label}.sql`);
  writeFileSync(file, sql, 'utf8');
  run(['--file', file]);
}

// 1. Migrations, in journal order, skipping any already recorded.
const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8'));
run(['--command', 'CREATE TABLE IF NOT EXISTS applied_migrations (tag TEXT PRIMARY KEY, applied_at TEXT NOT NULL)']);
const applied = new Set(
  (JSON.parse(run(['--command', 'SELECT tag FROM applied_migrations', '--json']))[0]?.results ?? []).map(r => r.tag),
);

for (const entry of journal.entries.sort((a, b) => a.idx - b.idx)) {
  if (applied.has(entry.tag)) {
    console.log(`· ${entry.tag} already applied`);
    continue;
  }
  run(['--file', `drizzle/${entry.tag}.sql`]);
  execSql(
    `mark-${entry.tag}`,
    `INSERT OR IGNORE INTO applied_migrations (tag, applied_at) VALUES (${quote(entry.tag)}, ${quote(new Date().toISOString())});`,
  );
  console.log(`✓ applied ${entry.tag}`);
}

// 2. Seed, only when explicitly asked for.
if (flag('seed')) {
  const { seedPlaces, seedProjects, seedMilestones, seedWorkItems } = await import('../data/risen.ts');
  const now = new Date().toISOString();
  const stamped = rows => rows.map(row => ({ ...row, created_at: now, updated_at: now }));
  execSql('seed', [
    insert('places', ['id', 'slug', 'name', 'kind', 'summary', 'condition', 'visibility', 'created_at', 'updated_at'], stamped(seedPlaces)),
    insert('projects', ['id', 'slug', 'name', 'summary', 'category', 'status', 'progress', 'budget_nok', 'funded_nok', 'next_action', 'place_id', 'visibility', 'published_at', 'created_at', 'updated_at'],
      stamped(seedProjects).map(p => ({ ...p, budget_nok: p.budgetNok, funded_nok: p.fundedNok, next_action: p.nextAction, place_id: p.placeId, published_at: p.publishedAt }))),
    insert('milestones', ['id', 'project_id', 'title', 'detail', 'status', 'position', 'due_date', 'completed_at', 'visibility', 'created_at', 'updated_at'],
      stamped(seedMilestones).map(m => ({ ...m, project_id: m.projectId, due_date: m.dueDate, completed_at: m.completedAt }))),
    insert('work_items', ['id', 'project_id', 'place_id', 'milestone_id', 'title', 'detail', 'type', 'priority', 'status', 'assignee', 'due_date', 'visibility', 'created_at', 'updated_at'],
      stamped(seedWorkItems).map(w => ({ ...w, project_id: w.projectId, place_id: w.placeId, milestone_id: w.milestoneId, due_date: w.dueDate }))),
  ].join('\n'));
  console.log('✓ seeded the remote database');
} else {
  console.log('· skipped seeding (pass --seed to insert the demo records)');
}

console.log(`\nDone. Redeploy, then check that /hub no longer shows the "Seed-data" notice.`);
