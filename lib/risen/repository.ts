import { asc, eq } from 'drizzle-orm';
import { tryGetDb } from '@/db';
import { milestones, places, projects, workItems } from '@/db/schema';
import { seedMilestones, seedPlaces, seedProjects, seedWorkItems } from '@/data/risen';
import { byPriority } from './types';
import type { Loaded, Milestone, Place, Project, WorkItem } from './types';

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
    dueDate: row.dueDate,
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

export async function getProjectBySlug(slug: string): Promise<Loaded<Project | null>> {
  const db = tryGetDb();
  if (!db) return seeded(seedProjects.find(project => project.slug === slug) ?? null);
  try {
    const rows = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    return { data: rows.length > 0 ? toProject(rows[0]) : null, source: 'database' };
  } catch (error) {
    return seeded(seedProjects.find(project => project.slug === slug) ?? null, describe(error));
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
