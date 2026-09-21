import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readLegacySource } from '../lib/risen/legacy/read-source.ts';
import {
  PROVENANCE,
  hasPassed,
  nameFromId,
  normalise,
  type NormalisedImport,
} from '../lib/risen/legacy/normalise.ts';

/**
 * These run against the real archive, not a fixture. A fixture would keep
 * passing after someone edited `legacy/`, which is exactly the case these tests
 * exist to catch.
 */

const source = readLegacySource();
const IMPORT_DATE = '2026-09-20';
const result: NormalisedImport = normalise(source, IMPORT_DATE);

describe('the archive itself', () => {
  it('still holds what docs/LEGACY-IMPORT-INVENTORY.md says it holds', () => {
    assert.equal(source.projects.length, 6, '6 funding areas');
    assert.equal(source.funds.length, 16, '16 funding schemes');
    assert.equal(source.docs.length, 21, '21 document requirements');
    assert.equal(Object.keys(source.templateLibrary).length, 15, '15 application templates');
  });

  it('is pinned to the snapshot date the provenance claims', () => {
    assert.equal(source.TODAY, '2026-09-08');
    assert.equal(PROVENANCE, 'legacy_mvp_2026_09_08');
  });
});

describe('normalise', () => {
  it('produces one record per source entry, and no more', () => {
    assert.equal(result.angles.length, 6);
    assert.equal(result.schemes.length, 16);
    assert.equal(result.templates.length, 15);
  });

  it('keeps the 21 catalogued requirements and adds the ones only referenced', () => {
    const catalogued = result.documents.filter(doc => doc.source === 'catalogued');
    assert.equal(catalogued.length, 21);
    assert.equal(result.documents.length, 21 + result.undocumented.length);
    assert.ok(result.undocumented.length > 0, 'the archive really is missing some');
  });

  it('never writes a description it was not given', () => {
    for (const doc of result.documents) {
      if (doc.source === 'referenced') assert.equal(doc.description, null, doc.legacyId);
      else assert.ok(doc.description, doc.legacyId);
    }
  });

  it('marks a deadline that has already passed as passed, without moving it', () => {
    const arena = result.schemes.find(scheme => scheme.legacyId === 'arena');
    assert.ok(arena);
    assert.equal(arena.status, 'passed');
    assert.equal(arena.deadlineAt, '2026-09-15T13:00:00+02:00', 'the date is untouched');
  });

  it('leaves a future deadline unverified rather than pretending it is checked', () => {
    const future = result.schemes.find(scheme => scheme.legacyId === 'localvenue');
    assert.equal(future?.status, 'unverified');
  });

  it('never marks anything verified', () => {
    assert.equal(result.schemes.some(scheme => (scheme.status as string) === 'verified'), false);
    assert.equal(result.angles.every(angle => angle.strength === 'needs_verification'), true);
  });

  it('gives every scheme the source URL that CLAUDE.md rule 8 requires', () => {
    for (const scheme of result.schemes) {
      assert.match(scheme.sourceUrl, /^https?:\/\//, scheme.legacyId);
    }
  });

  it('stamps provenance on everything it writes', () => {
    const all = [...result.angles, ...result.schemes, ...result.documents, ...result.templates];
    assert.ok(all.length > 0);
    for (const record of all) assert.equal(record.provenance, PROVENANCE);
  });

  it('links every scheme to at least one angle and one requirement', () => {
    for (const scheme of result.schemes) {
      assert.ok(
        result.schemeAngles.some(link => link.schemeId === scheme.id),
        `${scheme.legacyId} has no angle`,
      );
      assert.ok(
        result.schemeDocuments.some(link => link.schemeId === scheme.id),
        `${scheme.legacyId} has no requirement`,
      );
    }
  });

  it('links only to records it actually created, so no join dangles', () => {
    const angleIds = new Set(result.angles.map(angle => angle.id));
    const documentIds = new Set(result.documents.map(doc => doc.id));
    const schemeIds = new Set(result.schemes.map(scheme => scheme.id));
    for (const link of result.schemeAngles) {
      assert.ok(schemeIds.has(link.schemeId) && angleIds.has(link.angleId), JSON.stringify(link));
    }
    for (const link of result.schemeDocuments) {
      assert.ok(schemeIds.has(link.schemeId) && documentIds.has(link.documentId), JSON.stringify(link));
    }
  });

  it('carries the free-text funding terms across without turning them into numbers', () => {
    const kmf = result.schemes.find(scheme => scheme.legacyId === 'kmf');
    assert.equal(kmf?.supportRate, 'Normalt ca. 30 %');
    assert.equal(kmf?.matchRule, 'Dugnad kan verdsettes til 350 kr/time');
    assert.equal(kmf?.cycle, 'Løpende');
  });

  it('keeps template placeholders exactly as written', () => {
    const vern = result.templates.find(template => template.legacyId === 'vern');
    assert.ok(vern);
    assert.match(vern.sections, /\[GÅRDSNAVN\]/);
    assert.deepEqual(Object.keys(JSON.parse(vern.sections)), ['summary', 'need', 'method', 'impact']);
  });

  it('gives every record a stable id, so a second run updates instead of duplicating', () => {
    const again = normalise(source, IMPORT_DATE);
    assert.deepEqual(again.schemes.map(s => s.id), result.schemes.map(s => s.id));
    assert.deepEqual(again.documents.map(d => d.id), result.documents.map(d => d.id));
    const ids = [...result.angles, ...result.schemes, ...result.documents, ...result.templates].map(r => r.id);
    assert.equal(new Set(ids).size, ids.length, 'no id collides across kinds');
  });

  it('is a pure function of the archive and the date it is run on', () => {
    const later = normalise(source, '2027-06-01');
    const passedNow = result.schemes.filter(s => s.status === 'passed').length;
    const passedLater = later.schemes.filter(s => s.status === 'passed').length;
    assert.ok(passedLater > passedNow, 'more deadlines have passed by then');
    assert.deepEqual(later.angles, result.angles, 'nothing else depends on the date');
  });
});

describe('hasPassed', () => {
  it('treats a date-only deadline and a timestamped one the same way', () => {
    assert.equal(hasPassed('2026-09-15', '2026-09-20'), true);
    assert.equal(hasPassed('2026-09-15T13:00:00+02:00', '2026-09-20'), true);
  });

  it('does not count the deadline day itself as passed', () => {
    assert.equal(hasPassed('2026-09-20', '2026-09-20'), false);
  });

  it('treats a scheme with no deadline as open, not as expired', () => {
    assert.equal(hasPassed(null, '2026-09-20'), false);
  });
});

describe('nameFromId', () => {
  it('makes a readable name without correcting the source spelling', () => {
    assert.equal(nameFromId('takbeskrivelse'), 'Takbeskrivelse');
    assert.equal(nameFromId('miljoeffekt'), 'Miljoeffekt', 'not "Miljøeffekt" — that is not what the id says');
    assert.equal(nameFromId('cv-utovere'), 'Cv utovere');
  });
});

describe('the generated import SQL', () => {
  it('never deletes, drops or truncates anything', async () => {
    const { buildLegacyImportSql } = await import('../scripts/legacy-import-sql.mjs');
    const { sql } = buildLegacyImportSql(IMPORT_DATE);
    assert.equal(/\b(DELETE|DROP|TRUNCATE)\b/i.test(sql), false);
  });

  it('guards every upsert so it only ever rewrites its own rows', async () => {
    const { buildLegacyImportSql } = await import('../scripts/legacy-import-sql.mjs');
    const { sql } = buildLegacyImportSql(IMPORT_DATE);
    const upserts = sql.split('\n').filter(line => line.includes('DO UPDATE SET'));
    assert.ok(upserts.length > 0);
    for (const statement of upserts) {
      assert.match(statement, /WHERE \w+\.provenance = 'legacy_mvp_2026_09_08';$/);
    }
  });

  it('leaves verified_at and project_id out of every refresh, so research survives', async () => {
    const { buildLegacyImportSql } = await import('../scripts/legacy-import-sql.mjs');
    const { sql } = buildLegacyImportSql(IMPORT_DATE);
    for (const statement of sql.split('\n').filter(line => line.includes('DO UPDATE SET'))) {
      const refresh = statement.slice(statement.indexOf('DO UPDATE SET'));
      assert.equal(refresh.includes('verified_at = excluded'), false);
      assert.equal(refresh.includes('project_id = excluded'), false);
    }
  });

  it('refreshes status only while nobody has verified the row', async () => {
    const { buildLegacyImportSql } = await import('../scripts/legacy-import-sql.mjs');
    const { sql } = buildLegacyImportSql(IMPORT_DATE);
    const scheme = sql.split('\n').find(line => line.includes("INSERT INTO funding_schemes"));
    assert.ok(scheme);
    // A bare `status = excluded.status` would demote a verified scheme on re-import.
    assert.equal(scheme.includes('status = excluded.status'), false);
    assert.match(
      scheme,
      /status = CASE WHEN funding_schemes\.verified_at IS NULL THEN excluded\.status ELSE funding_schemes\.status END/,
    );
  });
});
