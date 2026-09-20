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
export type WorkType =
  | 'task'
  | 'repair'
  | 'purchase'
  | 'dugnad'
  | 'inspection'
  | 'documentation'
  | 'decision';
export type WorkPriority = 'urgent' | 'high' | 'normal' | 'low';
/**
 * The work status machine. `planned` sits between capture and readiness;
 * `cancelled` records that something was dropped rather than finished, which a
 * delete could not.
 */
export type WorkStatus =
  | 'inbox'
  | 'planned'
  | 'ready'
  | 'in_progress'
  | 'blocked'
  | 'done'
  | 'cancelled';

export type WeatherDependency = 'any' | 'dry' | 'indoor' | 'frost_free';
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
  /** Whole hours, used by the dugnad planner to fit work into a weekend. */
  estimatedHours: number | null;
  requiredPeople: number | null;
  suitableForDugnad: boolean;
  weatherDependency: WeatherDependency | null;
  /** Subtasks are work items with a parent; null means this is a top-level task. */
  parentId: string | null;
  startAt: string | null;
  dueDate: string | null;
  position: number;
  visibility: Visibility;
}

/** Completed-of-total for a parent task's subtasks. */
export function subtaskProgress(subtasks: Pick<WorkItem, 'status'>[]): {
  done: number;
  total: number;
  label: string;
} {
  const total = subtasks.filter(task => task.status !== 'cancelled').length;
  const done = subtasks.filter(task => task.status === 'done').length;
  return { done, total, label: `${done} av ${total} underoppgaver fullført` };
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

export type SchemeStatus = 'unverified' | 'verified' | 'passed' | 'closed';
export type AngleStrength = 'core' | 'strong' | 'context' | 'weak' | 'ineligible' | 'needs_verification';
export type PublicationStatus = 'draft' | 'review' | 'published' | 'archived';
export type MemberRole = 'admin' | 'member' | 'volunteer';
export type ProposalStatus = 'draft' | 'open' | 'decided' | 'withdrawn';

export interface FundingScheme {
  id: string;
  name: string;
  provider: string | null;
  sourceUrl: string | null;
  eligibilitySummary: string | null;
  deadlineAt: string | null;
  verifiedAt: string | null;
  status: SchemeStatus;
  projectId: string | null;
  visibility: Visibility;
}

export interface FundingAngle {
  id: string;
  title: string;
  description: string | null;
  strength: AngleStrength;
  missing: string | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
  projectIds: string[];
  visibility: Visibility;
}

export interface RisenEvent {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  rsvpKey: string | null;
  startsAt: string | null;
  endsAt: string | null;
  capacity: number | null;
  projectId: string | null;
  placeId: string | null;
  visibility: Visibility;
  publicationStatus: PublicationStatus;
  /** Filled from the `rsvps` table, which still owns the public sign-ups. */
  signups?: number;
}

export interface Member {
  id: string;
  name: string;
  email: string | null;
  role: MemberRole;
  status: string;
}

export interface Proposal {
  id: string;
  title: string;
  body: string | null;
  status: ProposalStatus;
  closesAt: string | null;
  decidedAt: string | null;
  outcome: string | null;
  projectId: string | null;
  visibility: Visibility;
}

/**
 * CLAUDE.md rule 8: a deadline may only be shown as current when someone has
 * checked it against the scheme's own pages and recorded when.
 */
export function isVerified(record: Pick<FundingScheme, 'sourceUrl' | 'verifiedAt' | 'status'>): boolean {
  return record.status === 'verified' && Boolean(record.sourceUrl) && Boolean(record.verifiedAt);
}

/** A project is public only when it is marked public AND explicitly published. */
export function isPublished(project: Pick<Project, 'visibility' | 'publishedAt'>): boolean {
  return project.visibility === 'public' && project.publishedAt !== null;
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
export const OPEN_WORK_STATUSES: WorkStatus[] = ['inbox', 'planned', 'ready', 'in_progress', 'blocked'];

/** Statuses that take an item out of the working set, for different reasons. */
export const CLOSED_WORK_STATUSES: WorkStatus[] = ['done', 'cancelled'];

export function isOpenWork(item: Pick<WorkItem, 'status'>): boolean {
  return !CLOSED_WORK_STATUSES.includes(item.status);
}

/**
 * Work that can actually be started: open, not blocked, and not waiting on a
 * decision. Used by the Klar nå view and the dugnad planner.
 */
export function isReadyWork(item: Pick<WorkItem, 'status' | 'type'>): boolean {
  return (item.status === 'ready' || item.status === 'planned') && item.type !== 'decision';
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
