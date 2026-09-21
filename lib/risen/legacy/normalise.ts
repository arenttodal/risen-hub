import type { LegacySource } from './types.ts';

/**
 * Turns the Småbruk Støttehub archive into Risen records.
 *
 * Pure: the same archive in gives the same records out, with no clock and no
 * database. That is the point — the mapping is the part worth testing, and the
 * writing is the part that must not be clever.
 *
 * Three rules it will not bend:
 *
 * 1. Nothing is invented. A field the archive does not have stays null, even
 *    when a plausible value is obvious.
 * 2. No date is moved. A deadline that has passed imports as passed.
 * 3. Nothing arrives verified. Every record lands `unverified` with its source
 *    URL and its provenance, per CLAUDE.md rule 8.
 */

export const PROVENANCE = 'legacy_mvp_2026_09_08';

export interface NormalisedAngle {
  id: string;
  legacyId: string;
  title: string;
  description: string;
  tags: string;
  strength: 'needs_verification';
  position: number;
  provenance: string;
}

export interface NormalisedScheme {
  id: string;
  legacyId: string;
  name: string;
  provider: string;
  sourceUrl: string;
  eligibilitySummary: string;
  deadlineAt: string | null;
  cycle: string | null;
  supportRate: string | null;
  matchRule: string | null;
  priorityNote: string | null;
  templateKey: string | null;
  /** `unverified` unless the archive's own deadline has already passed. */
  status: 'unverified' | 'passed';
  provenance: string;
}

export interface NormalisedDocument {
  id: string;
  legacyId: string;
  name: string;
  description: string | null;
  /** `catalogued` when the archive described it, `referenced` when it only asked for it. */
  source: 'catalogued' | 'referenced';
  provenance: string;
}

export interface NormalisedTemplate {
  id: string;
  legacyId: string;
  title: string;
  /** JSON, kept verbatim including `[GÅRDSNAVN]`-style placeholders. */
  sections: string;
  provenance: string;
}

export interface NormalisedImport {
  angles: NormalisedAngle[];
  schemes: NormalisedScheme[];
  documents: NormalisedDocument[];
  templates: NormalisedTemplate[];
  schemeAngles: { schemeId: string; angleId: string }[];
  schemeDocuments: { schemeId: string; documentId: string }[];
  /** Requirements a scheme demanded that the archive never described. */
  undocumented: string[];
}

/** Ids are derived from the source key so a re-import updates instead of duplicating. */
export const angleId = (legacyId: string) => `angle-${legacyId}`;
export const schemeId = (legacyId: string) => `scheme-${legacyId}`;
export const documentId = (legacyId: string) => `doc-${legacyId}`;
export const templateId = (legacyId: string) => `tmpl-${legacyId}`;

/**
 * A readable name for a requirement the archive never described.
 *
 * `miljoeffekt` becomes `Miljoeffekt`, not `Miljøeffekt`: the source spelling is
 * what we have, and correcting it here would quietly disagree with the id it
 * came from. The description stays null rather than being guessed.
 */
export function nameFromId(legacyId: string): string {
  const words = legacyId.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Compares on the date part, so a date-only deadline and a timestamped one behave alike. */
export function hasPassed(deadline: string | null, today: string): boolean {
  if (!deadline) return false;
  return deadline.slice(0, 10) < today.slice(0, 10);
}

export function normalise(source: LegacySource, today: string): NormalisedImport {
  const angles: NormalisedAngle[] = source.projects.map((area, position) => ({
    id: angleId(area.id),
    legacyId: area.id,
    title: area.name,
    description: area.desc,
    tags: area.tags.join(','),
    strength: 'needs_verification',
    position,
    provenance: PROVENANCE,
  }));

  const documents = new Map<string, NormalisedDocument>();
  for (const doc of source.docs) {
    documents.set(doc.id, {
      id: documentId(doc.id),
      legacyId: doc.id,
      name: doc.name,
      description: doc.desc,
      source: 'catalogued',
      provenance: PROVENANCE,
    });
  }

  const undocumented: string[] = [];
  for (const fund of source.funds) {
    for (const need of fund.needs) {
      if (documents.has(need)) continue;
      undocumented.push(need);
      documents.set(need, {
        id: documentId(need),
        legacyId: need,
        name: nameFromId(need),
        description: null,
        source: 'referenced',
        provenance: PROVENANCE,
      });
    }
  }

  const knownAngles = new Set(source.projects.map(area => area.id));
  const schemes: NormalisedScheme[] = [];
  const schemeAngles: { schemeId: string; angleId: string }[] = [];
  const schemeDocuments: { schemeId: string; documentId: string }[] = [];

  for (const fund of source.funds) {
    const id = schemeId(fund.id);
    schemes.push({
      id,
      legacyId: fund.id,
      name: fund.name,
      provider: fund.owner,
      sourceUrl: fund.url,
      eligibilitySummary: fund.desc,
      deadlineAt: fund.deadline,
      cycle: fund.cycle || null,
      supportRate: fund.support || null,
      matchRule: fund.match || null,
      priorityNote: fund.status || null,
      templateKey: fund.template || null,
      status: hasPassed(fund.deadline, today) ? 'passed' : 'unverified',
      provenance: PROVENANCE,
    });

    // An area the archive never declared is dropped rather than conjured into
    // an angle — an unnamed angle would be an argument nobody wrote.
    for (const area of fund.area) {
      if (knownAngles.has(area)) schemeAngles.push({ schemeId: id, angleId: angleId(area) });
    }
    for (const need of fund.needs) {
      schemeDocuments.push({ schemeId: id, documentId: documentId(need) });
    }
  }

  const templates: NormalisedTemplate[] = Object.entries(source.templateLibrary).map(([key, template]) => ({
    id: templateId(key),
    legacyId: key,
    title: template.title,
    sections: JSON.stringify(template.sections),
    provenance: PROVENANCE,
  }));

  return {
    angles,
    schemes,
    documents: [...documents.values()],
    templates,
    schemeAngles,
    schemeDocuments,
    undocumented: [...new Set(undocumented)],
  };
}
