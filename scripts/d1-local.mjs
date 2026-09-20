/**
 * Bootstraps the LOCAL Miniflare D1 database used by `npm run dev`.
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
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CONFIG = 'dist/server/wrangler.json';
const PERSIST = '.wrangler/state';
const scratch = mkdtempSync(join(tmpdir(), 'risen-d1-'));

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

const quote = value => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
};

const insert = (table, columns, rows) =>
  rows
    .map(row => `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(c => quote(row[c])).join(', ')});`)
    .join('\n');

try {
  readFileSync(CONFIG);
} catch {
  console.error(`Missing ${CONFIG}. Run \`npm run build\` first — it generates the Wrangler config this script points at.`);
  process.exit(1);
}

// 1. Migrations, in the order Drizzle recorded them.
const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8'));
run(['--command', 'CREATE TABLE IF NOT EXISTS applied_migrations (tag TEXT PRIMARY KEY, applied_at TEXT NOT NULL)']);
const appliedRaw = run(['--command', 'SELECT tag FROM applied_migrations', '--json']);
const applied = new Set(
  (JSON.parse(appliedRaw)[0]?.results ?? []).map(row => row.tag),
);

for (const entry of journal.entries.sort((a, b) => a.idx - b.idx)) {
  if (applied.has(entry.tag)) {
    console.log(`· ${entry.tag} already applied`);
    continue;
  }
  execFile(`drizzle/${entry.tag}.sql`);
  execSql(
    `mark-${entry.tag}`,
    `INSERT OR IGNORE INTO applied_migrations (tag, applied_at) VALUES (${quote(entry.tag)}, ${quote(new Date().toISOString())});`,
  );
  console.log(`✓ applied ${entry.tag}`);
}

// 2. Seed, imported from the single seed module so the two cannot drift.
const { seedPlaces, seedProjects, seedMilestones, seedWorkItems } = await import('../data/risen.ts');
const now = new Date().toISOString();
const stamped = rows => rows.map(row => ({ ...row, created_at: now, updated_at: now }));

const sql = [
  insert('places', ['id', 'slug', 'name', 'kind', 'summary', 'condition', 'visibility', 'created_at', 'updated_at'],
    stamped(seedPlaces)),
  insert('projects', ['id', 'slug', 'name', 'summary', 'category', 'status', 'progress', 'budget_nok', 'funded_nok', 'next_action', 'place_id', 'visibility', 'published_at', 'created_at', 'updated_at'],
    stamped(seedProjects).map(p => ({ ...p, budget_nok: p.budgetNok, funded_nok: p.fundedNok, next_action: p.nextAction, place_id: p.placeId, published_at: p.publishedAt }))),
  insert('milestones', ['id', 'project_id', 'title', 'detail', 'status', 'position', 'due_date', 'completed_at', 'visibility', 'created_at', 'updated_at'],
    stamped(seedMilestones).map(m => ({ ...m, project_id: m.projectId, due_date: m.dueDate, completed_at: m.completedAt }))),
  insert('work_items', ['id', 'project_id', 'place_id', 'milestone_id', 'title', 'detail', 'type', 'priority', 'status', 'assignee', 'due_date', 'visibility', 'created_at', 'updated_at'],
    stamped(seedWorkItems).map(w => ({ ...w, project_id: w.projectId, place_id: w.placeId, milestone_id: w.milestoneId, due_date: w.dueDate }))),
].join('\n');

execSql('seed', sql);
console.log(`✓ seeded ${seedPlaces.length} places, ${seedProjects.length} projects, ${seedMilestones.length} milestones, ${seedWorkItems.length} work items`);
console.log('\nLocal D1 is ready. Restart `npm run dev` if it is already running.');
