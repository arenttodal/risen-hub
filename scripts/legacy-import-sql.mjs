/**
 * Builds the legacy import as SQL.
 *
 * Idempotent by construction: every row upserts on its deterministic id, and
 * the update half touches catalogue fields only. `verified_at`, `project_id`,
 * and a `status` a person has since set are never overwritten, and nothing is
 * ever deleted — so running this twice is the same as running it once, and
 * running it after someone has done real research does not undo that research.
 *
 * Run directly to write the file the D1 console can paste:
 *   node scripts/legacy-import-sql.mjs
 */
import { writeFileSync } from 'node:fs';
import { readLegacySource } from '../lib/risen/legacy/read-source.ts';
import { PROVENANCE, normalise } from '../lib/risen/legacy/normalise.ts';

const quote = value => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
};

/**
 * An upsert that refreshes the catalogue and leaves everything else alone.
 *
 * The `WHERE` guard is the important half: a row someone created by hand, or
 * imported from somewhere else, keeps its own provenance and is skipped rather
 * than quietly rewritten by this import.
 */
const upsert = (table, columns, refresh, rows) =>
  rows
    .map(row => {
      const values = columns.map(column => quote(row[column])).join(', ');
      const sets = refresh
        .map(column =>
          typeof column === 'string' ? `${column} = excluded.${column}` : `${column.name} = ${column.expression}`,
        )
        .join(', ');
      return (
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values}) ` +
        `ON CONFLICT(id) DO UPDATE SET ${sets} WHERE ${table}.provenance = ${quote(PROVENANCE)};`
      );
    })
    .join('\n');

const link = (table, columns, rows) =>
  rows
    .map(row => `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(c => quote(row[c])).join(', ')});`)
    .join('\n');

export function buildLegacyImportSql(today = new Date().toISOString().slice(0, 10)) {
  const source = readLegacySource();
  const data = normalise(source, today);
  const stamp = `${today}T00:00:00.000Z`;
  const withStamp = row => ({ ...row, created_at: stamp, updated_at: stamp });

  const sql = [
    upsert(
      'funding_angles',
      ['id', 'title', 'description', 'strength', 'tags', 'position', 'provenance', 'legacy_id', 'visibility', 'created_at', 'updated_at'],
      ['title', 'description', 'tags', 'position', 'updated_at'],
      data.angles.map(angle => withStamp({ ...angle, legacy_id: angle.legacyId, visibility: 'members' })),
    ),
    upsert(
      'funding_schemes',
      ['id', 'name', 'provider', 'source_url', 'eligibility_summary', 'deadline_at', 'cycle', 'support_rate', 'match_rule', 'priority_note', 'template_key', 'status', 'provenance', 'legacy_id', 'visibility', 'created_at', 'updated_at'],
      [
        'name', 'provider', 'source_url', 'eligibility_summary', 'deadline_at',
        'cycle', 'support_rate', 'match_rule', 'priority_note', 'template_key', 'updated_at',
        // Status is the one field pulled two ways. A deadline that has passed
        // since the last run must stop claiming to be open, but a scheme
        // someone has actually checked must not be demoted back to unverified
        // by a re-import. So the archive's status applies only while nobody has
        // verified the row; after that the person's own status stands.
        {
          name: 'status',
          expression: 'CASE WHEN funding_schemes.verified_at IS NULL THEN excluded.status ELSE funding_schemes.status END',
        },
      ],
      data.schemes.map(scheme =>
        withStamp({
          ...scheme,
          source_url: scheme.sourceUrl,
          eligibility_summary: scheme.eligibilitySummary,
          deadline_at: scheme.deadlineAt,
          support_rate: scheme.supportRate,
          match_rule: scheme.matchRule,
          priority_note: scheme.priorityNote,
          template_key: scheme.templateKey,
          legacy_id: scheme.legacyId,
          visibility: 'members',
        }),
      ),
    ),
    upsert(
      'document_requirements',
      ['id', 'legacy_id', 'name', 'description', 'source', 'provenance', 'created_at', 'updated_at'],
      ['name', 'description', 'source', 'updated_at'],
      data.documents.map(doc => withStamp({ ...doc, legacy_id: doc.legacyId })),
    ),
    upsert(
      'application_templates',
      ['id', 'legacy_id', 'title', 'sections', 'provenance', 'created_at', 'updated_at'],
      ['title', 'sections', 'updated_at'],
      data.templates.map(template => withStamp({ ...template, legacy_id: template.legacyId })),
    ),
    link('funding_scheme_angles', ['scheme_id', 'angle_id'], data.schemeAngles.map(row => ({ scheme_id: row.schemeId, angle_id: row.angleId }))),
    link('funding_scheme_documents', ['scheme_id', 'document_id'], data.schemeDocuments.map(row => ({ scheme_id: row.schemeId, document_id: row.documentId }))),
  ].join('\n\n');

  return { sql, data, source };
}

const isDirectRun = import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  const today = process.argv[2] ?? new Date().toISOString().slice(0, 10);
  const { sql, data, source } = buildLegacyImportSql(today);
  const header = [
    '-- Generated by `npm run db:legacy-sql` from legacy/smabruk-stottehub/app.js.',
    '-- Do not edit by hand. See docs/LEGACY-IMPORT-INVENTORY.md.',
    '--',
    `-- Archive snapshot: ${source.TODAY}. Import run for: ${today}.`,
    '--',
    '-- Safe to run more than once. Every row upserts on a deterministic id and',
    '-- the update half refreshes catalogue fields only, so verified_at, the',
    '-- project a scheme is attached to, and any research done since are kept.',
    '-- Nothing here deletes anything.',
    '',
  ].join('\n');
  writeFileSync('drizzle/legacy-import.sql', `${header}${sql}\n`, 'utf8');
  console.log(
    `Wrote drizzle/legacy-import.sql — ${data.angles.length} angles, ${data.schemes.length} schemes, ` +
      `${data.documents.length} requirements (${data.undocumented.length} of them referenced but never described), ` +
      `${data.templates.length} templates.`,
  );
}
