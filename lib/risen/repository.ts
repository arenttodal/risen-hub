import { asc, count, eq, or } from 'drizzle-orm';
import { tryGetDb } from '@/db';
import {
  documentRequirements,
  events,
  fundingAngleProjects,
  fundingSchemeAngles,
  fundingSchemeDocuments,
  fundingAngles,
  fundingSchemes,
  members,
  milestones,
  places,
  projects,
  proposals,
  rsvps,
  workItems,
} from '@/db/schema';
import {
  seedEvents,
  seedFundingAngles,
  seedFundingSchemes,
  seedMembers,
  seedMilestones,
  seedPlaces,
  seedProjects,
  seedProposals,
  seedWorkItems,
} from '@/data/risen';
import { byPriority } from './types';
import type {
  FundingAngle,
  FundingScheme,
  Loaded,
  Member,
  Milestone,
  Place,
  Project,
  Proposal,
  RisenEvent,
  WorkItem,
} from './types';

/**
 * The only read path for core Risen records.
 *
 * When a D1 binding exists the database is the source of truth. When it does
 * not, the seed dataset is returned and the result says so, so the interface
 * can label it rather than pass illustrative numbers off as live ones.
 */

function seeded<T>(data: T, error?: string): Loaded<T> {
  return { data, source: 'seed', ...(error ? { error } : {}) };
}

/** Rows come back as plain strings; narrow them to the domain unions at the boundary. */
function toProject(row: typeof projects.$inferSelect): Project {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    category: row.category,
    status: row.status as Project['status'],
    progress: row.progress,
    budgetNok: row.budgetNok,
    fundedNok: row.fundedNok,
    nextAction: row.nextAction,
    placeId: row.placeId,
    visibility: row.visibility as Project['visibility'],
    publishedAt: row.publishedAt,
  };
}

function toMilestone(row: typeof milestones.$inferSelect): Milestone {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    detail: row.detail,
    status: row.status as Milestone['status'],
    position: row.position,
    dueDate: row.dueDate,
    completedAt: row.completedAt,
    visibility: row.visibility as Milestone['visibility'],
  };
}

function toWorkItem(row: typeof workItems.$inferSelect): WorkItem {
  return {
    id: row.id,
    projectId: row.projectId,
    placeId: row.placeId,
    milestoneId: row.milestoneId,
    title: row.title,
    detail: row.detail,
    type: row.type as WorkItem['type'],
    priority: row.priority as WorkItem['priority'],
    status: row.status as WorkItem['status'],
    assignee: row.assignee,
    estimatedHours: row.estimatedHours,
    requiredPeople: row.requiredPeople,
    // SQLite has no boolean; 0/1 is narrowed here rather than leaking outward.
    suitableForDugnad: row.suitableForDugnad === 1,
    weatherDependency: row.weatherDependency as WorkItem['weatherDependency'],
    parentId: row.parentId,
    startAt: row.startAt,
    dueDate: row.dueDate,
    position: row.position,
    visibility: row.visibility as WorkItem['visibility'],
  };
}

function toPlace(row: typeof places.$inferSelect): Place {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.kind as Place['kind'],
    summary: row.summary,
    condition: row.condition as Place['condition'],
    visibility: row.visibility as Place['visibility'],
  };
}

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

export async function listProjects(): Promise<Loaded<Project[]>> {
  const db = tryGetDb();
  if (!db) return seeded(seedProjects);
  try {
    const rows = await db.select().from(projects).orderBy(asc(projects.name));
    // A bound but empty database still means "no projects", not "show the seed".
    return { data: rows.map(toProject), source: 'database' };
  } catch (error) {
    return seeded(seedProjects, describe(error));
  }
}

/**
 * Internal routes address a project by id (PLATFORM-SPEC.md section 8); the
 * slug is reserved for the public routes. Both are accepted here so a public
 * slug can be resolved without a second query.
 */
export async function getProject(idOrSlug: string): Promise<Loaded<Project | null>> {
  const fromSeed = () =>
    seedProjects.find(project => project.id === idOrSlug || project.slug === idOrSlug) ?? null;
  const db = tryGetDb();
  if (!db) return seeded(fromSeed());
  try {
    const rows = await db
      .select()
      .from(projects)
      .where(or(eq(projects.id, idOrSlug), eq(projects.slug, idOrSlug)))
      .limit(1);
    return { data: rows.length > 0 ? toProject(rows[0]) : null, source: 'database' };
  } catch (error) {
    return seeded(fromSeed(), describe(error));
  }
}

export async function listMilestones(projectId: string): Promise<Loaded<Milestone[]>> {
  const seedFor = () =>
    seedMilestones
      .filter(milestone => milestone.projectId === projectId)
      .sort((a, b) => a.position - b.position);
  const db = tryGetDb();
  if (!db) return seeded(seedFor());
  try {
    const rows = await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, projectId))
      .orderBy(asc(milestones.position));
    return { data: rows.map(toMilestone), source: 'database' };
  } catch (error) {
    return seeded(seedFor(), describe(error));
  }
}

export async function listWorkItems(projectId?: string): Promise<Loaded<WorkItem[]>> {
  const seedFor = () =>
    (projectId ? seedWorkItems.filter(item => item.projectId === projectId) : seedWorkItems)
      .slice()
      .sort(byPriority);
  const db = tryGetDb();
  if (!db) return seeded(seedFor());
  try {
    const rows = projectId
      ? await db.select().from(workItems).where(eq(workItems.projectId, projectId))
      : await db.select().from(workItems);
    return { data: rows.map(toWorkItem).sort(byPriority), source: 'database' };
  } catch (error) {
    return seeded(seedFor(), describe(error));
  }
}

export async function listPlaces(): Promise<Loaded<Place[]>> {
  const db = tryGetDb();
  if (!db) return seeded(seedPlaces);
  try {
    const rows = await db.select().from(places).orderBy(asc(places.name));
    return { data: rows.map(toPlace), source: 'database' };
  } catch (error) {
    return seeded(seedPlaces, describe(error));
  }
}

// ---------------------------------------------------------------------------
// Funding, events and community
// ---------------------------------------------------------------------------

function toScheme(row: typeof fundingSchemes.$inferSelect): FundingScheme {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    sourceUrl: row.sourceUrl,
    eligibilitySummary: row.eligibilitySummary,
    deadlineAt: row.deadlineAt,
    verifiedAt: row.verifiedAt,
    status: row.status as FundingScheme['status'],
    projectId: row.projectId,
    visibility: row.visibility as FundingScheme['visibility'],
    cycle: row.cycle,
    supportRate: row.supportRate,
    matchRule: row.matchRule,
    priorityNote: row.priorityNote,
    provenance: row.provenance,
  };
}

/** Deadlines first, undated schemes last. */
const bySchemeDeadline = (a: FundingScheme, b: FundingScheme) =>
  (a.deadlineAt ?? '9999').localeCompare(b.deadlineAt ?? '9999');

export async function listFundingSchemes(): Promise<Loaded<FundingScheme[]>> {
  const db = tryGetDb();
  if (!db) return seeded(seedFundingSchemes.slice().sort(bySchemeDeadline));
  try {
    const rows = await db.select().from(fundingSchemes);
    return { data: rows.map(toScheme).sort(bySchemeDeadline), source: 'database' };
  } catch (error) {
    return seeded(seedFundingSchemes.slice().sort(bySchemeDeadline), describe(error));
  }
}

export async function listFundingAngles(): Promise<Loaded<FundingAngle[]>> {
  const db = tryGetDb();
  if (!db) return seeded(seedFundingAngles);
  try {
    const [rows, links] = await Promise.all([
      db.select().from(fundingAngles).orderBy(asc(fundingAngles.position), asc(fundingAngles.id)),
      db.select().from(fundingAngleProjects),
    ]);
    const data = rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      strength: row.strength as FundingAngle['strength'],
      missing: row.missing,
      sourceUrl: row.sourceUrl,
      verifiedAt: row.verifiedAt,
      projectIds: links.filter(link => link.angleId === row.id).map(link => link.projectId),
      visibility: row.visibility as FundingAngle['visibility'],
      tags: row.tags,
      provenance: row.provenance,
    }));
    return { data, source: 'database' };
  } catch (error) {
    return seeded(seedFundingAngles, describe(error));
  }
}

/**
 * Events, with sign-up counts joined from `rsvps`. The public preview sign-up
 * still owns those rows, so the count is read rather than duplicated here.
 */
export async function listEvents(): Promise<Loaded<RisenEvent[]>> {
  const byDate = (a: RisenEvent, b: RisenEvent) =>
    (a.startsAt ?? '9999').localeCompare(b.startsAt ?? '9999');
  const db = tryGetDb();
  if (!db) return seeded(seedEvents.slice().sort(byDate));
  try {
    const [rows, signups] = await Promise.all([
      db.select().from(events),
      db.select({ camp: rsvps.camp, count: count() }).from(rsvps).groupBy(rsvps.camp),
    ]);
    const data = rows
      .map(row => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        rsvpKey: row.rsvpKey,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        capacity: row.capacity,
        projectId: row.projectId,
        placeId: row.placeId,
        visibility: row.visibility as RisenEvent['visibility'],
        publicationStatus: row.publicationStatus as RisenEvent['publicationStatus'],
        signups: signups.find(entry => entry.camp === row.rsvpKey)?.count ?? 0,
      }))
      .sort(byDate);
    return { data, source: 'database' };
  } catch (error) {
    return seeded(seedEvents.slice().sort(byDate), describe(error));
  }
}

export async function listMembers(): Promise<Loaded<Member[]>> {
  const db = tryGetDb();
  if (!db) return seeded(seedMembers);
  try {
    const rows = await db.select().from(members).orderBy(asc(members.name));
    return {
      data: rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role as Member['role'],
        status: row.status,
      })),
      source: 'database',
    };
  } catch (error) {
    return seeded(seedMembers, describe(error));
  }
}

export async function listProposals(): Promise<Loaded<Proposal[]>> {
  const db = tryGetDb();
  if (!db) return seeded(seedProposals);
  try {
    const rows = await db.select().from(proposals).orderBy(asc(proposals.createdAt));
    return {
      data: rows.map(row => ({
        id: row.id,
        title: row.title,
        body: row.body,
        status: row.status as Proposal['status'],
        closesAt: row.closesAt,
        decidedAt: row.decidedAt,
        outcome: row.outcome,
        projectId: row.projectId,
        visibility: row.visibility as Proposal['visibility'],
      })),
      source: 'database',
    };
  } catch (error) {
    return seeded(seedProposals, describe(error));
  }
}

/** One work item by id, for the detail panel. */
export async function getWorkItem(id: string): Promise<WorkItem | null> {
  const db = tryGetDb();
  if (!db) return seedWorkItems.find(item => item.id === id) ?? null;
  const rows = await db.select().from(workItems).where(eq(workItems.id, id)).limit(1);
  return rows.length > 0 ? toWorkItem(rows[0]) : null;
}

export interface SchemeRequirement {
  id: string;
  name: string;
  description: string | null;
  /** `catalogued | referenced | local` — see db/schema.ts. */
  source: string;
  /** Scheme ids that ask for this document. */
  schemeIds: string[];
}

/**
 * Every document requirement, with the schemes that ask for it.
 *
 * Sorted by how many schemes want it: a paper five funders all need is worth
 * making before one only a single funder asks for, and that ordering is the
 * whole reason to show this list rather than leave it inside each scheme.
 */
export async function listDocumentRequirements(): Promise<Loaded<SchemeRequirement[]>> {
  const db = tryGetDb();
  if (!db) return seeded([]);
  try {
    const [rows, links] = await Promise.all([
      db.select().from(documentRequirements),
      db.select().from(fundingSchemeDocuments),
    ]);
    const data = rows
      .map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        source: row.source,
        schemeIds: links.filter(link => link.documentId === row.id).map(link => link.schemeId),
      }))
      .sort(
        (a, b) => b.schemeIds.length - a.schemeIds.length || a.name.localeCompare(b.name, 'nb'),
      );
    return { data, source: 'database' };
  } catch (error) {
    return seeded([], describe(error));
  }
}

/** Which angles argue for which schemes. Empty when the tables are not there yet. */
export async function listSchemeAngleLinks(): Promise<{ schemeId: string; angleId: string }[]> {
  const db = tryGetDb();
  if (!db) return [];
  try {
    return await db.select().from(fundingSchemeAngles);
  } catch {
    return [];
  }
}
