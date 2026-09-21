import type {
  FundingAngle,
  FundingScheme,
  Member,
  Milestone,
  Place,
  Project,
  Proposal,
  RisenEvent,
  WorkItem,
} from '@/lib/risen/types';

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
  { id: 'w1', projectId: 'workshop', placeId: 'place-verkstedomrade', milestoneId: 'm-workshop-1', title: 'Dokumenter varme arbeider i gammel låve', detail: 'Bilder, plassering og omfang. Grunnlag for både søknad og risikovurdering.', type: 'task', priority: 'high', status: 'ready', assignee: 'Walid', estimatedHours: 3, dueDate: '2026-09-30', requiredPeople: 1, suitableForDugnad: false, weatherDependency: 'any', parentId: null, startAt: null, position: 1, visibility: 'members' },
  { id: 'w2', projectId: 'barn', placeId: 'place-laven', milestoneId: null, title: 'Reparer kjøkkendør', detail: null, type: 'repair', priority: 'normal', status: 'inbox', assignee: null, estimatedHours: 2, dueDate: null, requiredPeople: 1, suitableForDugnad: true, weatherDependency: 'indoor', parentId: null, startAt: null, position: 2, visibility: 'private' },
  { id: 'w3', projectId: 'barn', placeId: 'place-laven', milestoneId: 'm-barn-2', title: 'Samle historiske bilder og gamle kart', detail: 'Brukes i vernebegrunnelsen og som vedlegg til søknader.', type: 'task', priority: 'high', status: 'in_progress', assignee: 'Arn', estimatedHours: 6, dueDate: '2026-10-10', requiredPeople: 1, suitableForDugnad: false, weatherDependency: 'indoor', parentId: null, startAt: null, position: 3, visibility: 'members' },
  { id: 'w4', projectId: 'wall', placeId: 'place-steinmuren', milestoneId: 'm-wall-2', title: 'Lag innkjøpsliste for neste dugnad', detail: null, type: 'purchase', priority: 'normal', status: 'ready', assignee: null, estimatedHours: 1, dueDate: null, requiredPeople: 2, suitableForDugnad: true, weatherDependency: 'dry', parentId: null, startAt: null, position: 4, visibility: 'members' },
];

/**
 * Funding schemes.
 *
 * Every one of these is research that nobody has checked against the scheme's
 * own pages, so `sourceUrl` and `verifiedAt` are null and the status is
 * `unverified`. CLAUDE.md rule 8 forbids presenting them as current, and the
 * interface labels them accordingly. Fill in the source and the date before
 * anyone plans around a date here.
 */
/**
 * Deliberately empty.
 *
 * This used to hold four invented placeholders — TEFT, Regionalt kulturfond,
 * Spillemidler kulturarena and Kulturrom / Gjenklang — with no source URL and
 * summaries that said *Antatt frist … Ikke bekreftet*. All four now exist for
 * real, with real deadlines and real source URLs, in the catalogue imported
 * from `legacy/smabruk-stottehub/`. Keeping both meant the same funder appeared
 * twice, once fabricated, which is exactly the duplicate source of truth
 * CLAUDE.md rule 3 forbids.
 *
 * Rows already written to a database are left alone — the import deletes
 * nothing. docs/LEGACY-IMPORT-INVENTORY.md says how to retire them by hand.
 * Run `npm run db:local` to get the real catalogue.
 */
export const seedFundingSchemes: FundingScheme[] = [];

/** Idea bank. Classification follows PLATFORM-SPEC.md section 6. */
export const seedFundingAngles: FundingAngle[] = [
  { id: 'FA-014', title: 'Separere varme arbeider fra historisk låve', description: 'Skille sveising, sliping og maskinvedlikehold fra bygninger som skal bevares og brukes til kultur.', strength: 'strong', missing: 'Bilder og faglig risikovurdering', sourceUrl: null, verifiedAt: null, projectIds: ['barn', 'workshop'], visibility: 'members' },
  { id: 'FA-015', title: 'Aktiv bruk som vern av gårdsmiljøet', description: 'Bygninger som er i bruk forfaller saktere enn bygninger som står tomme.', strength: 'core', missing: 'Historikk og bruksplan', sourceUrl: null, verifiedAt: null, projectIds: ['barn', 'wall'], visibility: 'members' },
];

/**
 * Events. The two dugnad weekends match the sample weekends on the public page;
 * `rsvpKey` ties them to the existing `rsvps` rows so sign-up counts are real.
 */
export const seedEvents: RisenEvent[] = [
  { id: 'ev-dugnad-farmhouse', slug: 'dugnad-vaaronn', title: 'En frisk start for våningshuset', description: 'Rydding, sliping og enkle reparasjoner.', rsvpKey: 'farmhouse', startsAt: '2026-10-17', endsAt: '2026-10-18', capacity: 16, projectId: 'barn', placeId: 'place-laven', visibility: 'public', publicationStatus: 'published' },
  { id: 'ev-dugnad-barn', slug: 'dugnad-laven', title: 'Mange hender. Én vakker låve.', description: 'Tømrerarbeid, maling og felles måltider.', rsvpKey: 'barn', startsAt: '2027-04-24', endsAt: '2027-04-25', capacity: 20, projectId: 'barn', placeId: 'place-laven', visibility: 'public', publicationStatus: 'published' },
  { id: 'ev-sommerfestival', slug: 'sommerfestival-2027', title: 'Sommerfestival', description: 'Årlig festival på tunet. Datoer ikke fastsatt.', rsvpKey: null, startsAt: null, endsAt: null, capacity: null, projectId: 'festival', placeId: 'place-tunet', visibility: 'members', publicationStatus: 'draft' },
];

/**
 * Members and proposals are deliberately empty.
 *
 * CLAUDE.md rule 5 keeps the role fields ready, but there is no authentication
 * yet, so no real personal data may be entered. The tables exist so the module
 * shows a real empty list rather than a placeholder.
 */
export const seedMembers: Member[] = [];
export const seedProposals: Proposal[] = [];
