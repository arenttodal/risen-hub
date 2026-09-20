/**
 * View-layer domain types. These mirror the columns in `db/schema.ts` but stay
 * free of Drizzle types so pages and components never import the database
 * driver just to render a card.
 */

export type Visibility = 'private' | 'members' | 'public';
export type ProjectStatus = 'active' | 'planning' | 'paused' | 'complete';
export type MilestoneStatus = 'planned' | 'next' | 'doing' | 'complete';
export type PlaceKind = 'building' | 'area' | 'structure' | 'infrastructure';
export type PlaceCondition = 'unknown' | 'good' | 'fair' | 'poor' | 'critical';
export type WorkType = 'task' | 'repair' | 'purchase' | 'dugnad';
export type WorkPriority = 'urgent' | 'high' | 'normal' | 'low';
export type WorkStatus = 'inbox' | 'ready' | 'doing' | 'blocked' | 'done';
export type ActorRole = 'admin' | 'member' | 'volunteer' | 'public' | 'system';

export interface Place {
  id: string;
  slug: string;
  name: string;
  kind: PlaceKind;
  summary: string | null;
  condition: PlaceCondition;
  visibility: Visibility;
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  category: string;
  status: ProjectStatus;
  progress: number;
  budgetNok: number;
  fundedNok: number;
  nextAction: string | null;
  placeId: string | null;
  visibility: Visibility;
  publishedAt: string | null;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  detail: string | null;
  status: MilestoneStatus;
  position: number;
  dueDate: string | null;
  completedAt: string | null;
  visibility: Visibility;
}

export interface WorkItem {
  id: string;
  projectId: string | null;
  placeId: string | null;
  milestoneId: string | null;
  title: string;
  detail: string | null;
  type: WorkType;
  priority: WorkPriority;
  status: WorkStatus;
  assignee: string | null;
  dueDate: string | null;
  visibility: Visibility;
}

export interface ActivityEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  summary: string;
  actorName: string | null;
  actorRole: ActorRole;
  createdAt: string;
}

/** Where a read came from, so the interface can say so instead of implying live data. */
export type DataSource = 'database' | 'seed';

export interface Loaded<T> {
  data: T;
  source: DataSource;
  /** Set when the database was bound but the read failed; the seed is shown instead. */
  error?: string;
}

/** Work that is not finished, in the order a person would pick it up. */
export const OPEN_WORK_STATUSES: WorkStatus[] = ['inbox', 'ready', 'doing', 'blocked'];

export function isOpenWork(item: Pick<WorkItem, 'status'>): boolean {
  return item.status !== 'done';
}

/** Priority is stored as a label, so rank it here rather than sorting the text column. */
export const PRIORITY_RANK: Record<WorkPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function byPriority(a: Pick<WorkItem, 'priority'>, b: Pick<WorkItem, 'priority'>): number {
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
}

/** Share of the budget covered so far, clamped so bad data cannot render a broken bar. */
export function fundedShare(project: Pick<Project, 'budgetNok' | 'fundedNok'>): number {
  if (project.budgetNok <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((project.fundedNok / project.budgetNok) * 100)));
}
