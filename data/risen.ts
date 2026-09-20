import type { Milestone, Place, Project, WorkItem } from '@/lib/risen/types';

/**
 * Seed dataset for Risen.
 *
 * This is the bootstrap for an empty database, and the fallback the interface
 * renders when no D1 binding is configured. It is not a second source of
 * truth: once `places`, `projects`, `milestones` and `work_items` hold rows,
 * every read goes through `lib/risen/repository.ts` and these values are only
 * used to populate a fresh database.
 *
 * All figures are illustrative. Nothing here is a verified cost or deadline.
 */

export const seedPlaces: Place[] = [
  {
    id: 'place-laven',
    slug: 'laven',
    name: 'Låven',
    kind: 'building',
    summary: 'Stor driftsbygning i tre. Tiltenkt kulturarena og samlingssted.',
    condition: 'unknown',
    visibility: 'members',
  },
  {
    id: 'place-steinmuren',
    slug: 'steinmuren',
    name: 'Steinmuren',
    kind: 'structure',
    summary: 'Tørrmur langs tunet. Deler av muren har satt seg etter uvær.',
    condition: 'unknown',
    visibility: 'members',
  },
  {
    id: 'place-verkstedomrade',
    slug: 'verkstedomrade',
    name: 'Verkstedområdet',
    kind: 'area',
    summary: 'Området der varme arbeider, sveising og maskinvedlikehold foregår i dag.',
    condition: 'unknown',
    visibility: 'private',
  },
  {
    id: 'place-tunet',
    slug: 'tunet',
    name: 'Tunet',
    kind: 'area',
    summary: 'Det åpne gårdstunet som binder bygningene sammen. Arena for festival og dugnad.',
    condition: 'unknown',
    visibility: 'public',
  },
];

export const seedProjects: Project[] = [
  {
    id: 'barn',
    slug: 'laven',
    name: 'Låven',
    summary:
      'Gjøre låven om til en trygg og brukbar kulturarena, uten å miste bygningens historiske uttrykk.',
    category: 'Kulturarena',
    status: 'active',
    progress: 28,
    budgetNok: 1_300_000,
    fundedNok: 364_000,
    nextAction: 'Bestill tilstandsvurdering',
    placeId: 'place-laven',
    visibility: 'public',
    publishedAt: '2026-05-04T09:00:00.000Z',
  },
  {
    id: 'wall',
    slug: 'steinmuren',
    name: 'Steinmuren',
    summary: 'Sikre og restaurere tørrmuren langs tunet med tradisjonell teknikk.',
    category: 'Kulturmiljø',
    status: 'active',
    progress: 42,
    budgetNok: 400_000,
    fundedNok: 168_000,
    nextAction: 'Last opp bilder etter stormen',
    placeId: 'place-steinmuren',
    visibility: 'public',
    publishedAt: '2026-06-18T09:00:00.000Z',
  },
  {
    id: 'workshop',
    slug: 'drift-og-verksted',
    name: 'Drift og verksted',
    summary:
      'Skille varme arbeider, støv og maskinvedlikehold fra de historiske bygningene som skal bevares.',
    category: 'Infrastruktur',
    status: 'planning',
    progress: 12,
    budgetNok: 750_000,
    fundedNok: 0,
    nextAction: 'Dokumenter dagens arbeidsområder',
    placeId: 'place-verkstedomrade',
    visibility: 'members',
    publishedAt: null,
  },
  {
    id: 'festival',
    slug: 'sommerfestival',
    name: 'Sommerfestival',
    summary: 'Årlig festival på tunet som finansierer og synliggjør arbeidet på gården.',
    category: 'Arrangement',
    status: 'planning',
    progress: 18,
    budgetNok: 400_000,
    fundedNok: 35_000,
    nextAction: 'Lås programramme og artistbudsjett',
    placeId: 'place-tunet',
    visibility: 'public',
    publishedAt: '2026-08-01T09:00:00.000Z',
  },
];

export const seedMilestones: Milestone[] = [
  { id: 'm-barn-1', projectId: 'barn', title: 'Rydde og kartlegge rommene', detail: null, status: 'complete', position: 0, dueDate: null, completedAt: '2026-06-02T12:00:00.000Z', visibility: 'public' },
  { id: 'm-barn-2', projectId: 'barn', title: 'Tilstandsvurdering av bærende konstruksjon', detail: 'Krever fagperson. Ingen påstander om tilstand før rapporten foreligger.', status: 'next', position: 1, dueDate: '2026-11-01', completedAt: null, visibility: 'members' },
  { id: 'm-barn-3', projectId: 'barn', title: 'Tette tak og vegger', detail: null, status: 'planned', position: 2, dueDate: null, completedAt: null, visibility: 'public' },
  { id: 'm-barn-4', projectId: 'barn', title: 'Scene, lyd og akustikk', detail: null, status: 'planned', position: 3, dueDate: null, completedAt: null, visibility: 'public' },

  { id: 'm-wall-1', projectId: 'wall', title: 'Fotodokumentere muren før arbeid', detail: null, status: 'complete', position: 0, dueDate: null, completedAt: '2026-07-10T12:00:00.000Z', visibility: 'public' },
  { id: 'm-wall-2', projectId: 'wall', title: 'Sikre partiet som har satt seg', detail: null, status: 'doing', position: 1, dueDate: '2026-10-15', completedAt: null, visibility: 'public' },
  { id: 'm-wall-3', projectId: 'wall', title: 'Legge om muren med tradisjonell teknikk', detail: null, status: 'planned', position: 2, dueDate: null, completedAt: null, visibility: 'public' },

  { id: 'm-workshop-1', projectId: 'workshop', title: 'Dokumentere dagens arbeidsområder', detail: 'Bilder og beskrivelse av hvor varme arbeider skjer i dag.', status: 'doing', position: 0, dueDate: '2026-10-01', completedAt: null, visibility: 'members' },
  { id: 'm-workshop-2', projectId: 'workshop', title: 'Faglig risikovurdering', detail: 'Må utføres av kvalifisert fagperson før noe omtales som utrygt.', status: 'planned', position: 1, dueDate: null, completedAt: null, visibility: 'private' },
  { id: 'm-workshop-3', projectId: 'workshop', title: 'Etablere eget verkstedbygg', detail: null, status: 'planned', position: 2, dueDate: null, completedAt: null, visibility: 'members' },

  { id: 'm-festival-1', projectId: 'festival', title: 'Sette datoer og ramme', detail: null, status: 'complete', position: 0, dueDate: null, completedAt: '2026-08-20T12:00:00.000Z', visibility: 'public' },
  { id: 'm-festival-2', projectId: 'festival', title: 'Lås programramme og artistbudsjett', detail: null, status: 'next', position: 1, dueDate: '2026-12-01', completedAt: null, visibility: 'members' },
  { id: 'm-festival-3', projectId: 'festival', title: 'Åpne påmelding for frivillige', detail: null, status: 'planned', position: 2, dueDate: null, completedAt: null, visibility: 'public' },
];

export const seedWorkItems: WorkItem[] = [
  { id: 'w1', projectId: 'workshop', placeId: 'place-verkstedomrade', milestoneId: 'm-workshop-1', title: 'Dokumenter varme arbeider i gammel låve', detail: 'Bilder, plassering og omfang. Grunnlag for både søknad og risikovurdering.', type: 'task', priority: 'high', status: 'ready', assignee: 'Walid', dueDate: '2026-09-30', visibility: 'members' },
  { id: 'w2', projectId: 'barn', placeId: 'place-laven', milestoneId: null, title: 'Reparer kjøkkendør', detail: null, type: 'repair', priority: 'normal', status: 'inbox', assignee: null, dueDate: null, visibility: 'private' },
  { id: 'w3', projectId: 'barn', placeId: 'place-laven', milestoneId: 'm-barn-2', title: 'Samle historiske bilder og gamle kart', detail: 'Brukes i vernebegrunnelsen og som vedlegg til søknader.', type: 'task', priority: 'high', status: 'doing', assignee: 'Arn', dueDate: '2026-10-10', visibility: 'members' },
  { id: 'w4', projectId: 'wall', placeId: 'place-steinmuren', milestoneId: 'm-wall-2', title: 'Lag innkjøpsliste for neste dugnad', detail: null, type: 'purchase', priority: 'normal', status: 'ready', assignee: null, dueDate: null, visibility: 'members' },
];

/**
 * Funding deadlines, kept as plain illustrative copy until the Funding module
 * owns real scheme records. CLAUDE.md rule 8 requires `sourceUrl`, `verifiedAt`
 * and a status before any of these may be presented as current, so they are
 * labelled as illustrative wherever they are rendered.
 */
export const deadlines = [
  { date: '1. okt. 2026', title: 'TEFT', project: 'Risen som møteplass', state: 'urgent' },
  { date: '15. jan. 2027', title: 'Regionalt kulturfond', project: 'Festivalprogram', state: 'upcoming' },
  { date: '15. feb. 2027', title: 'Spillemidler kulturarena', project: 'Låven', state: 'upcoming' },
  { date: '1. mars 2027', title: 'Kulturrom / Gjenklang', project: 'Scene og akustikk', state: 'upcoming' },
];

/** Idea bank entries. Classification follows PLATFORM-SPEC.md section 6. */
export const fundingAngles = [
  { id: 'FA-014', title: 'Separere varme arbeider fra historisk låve', strength: 'Sterkt støtteargument', projects: ['Låven', 'Drift og verksted'], missing: 'Bilder og faglig risikovurdering' },
  { id: 'FA-015', title: 'Aktiv bruk som vern av gårdsmiljøet', strength: 'Kjerneargument', projects: ['Låven', 'Steinmuren'], missing: 'Historikk og bruksplan' },
];
